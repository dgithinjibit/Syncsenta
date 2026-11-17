//! IPFS decentralized storage service
//!
//! Uses reqwest to interact with IPFS HTTP API (Kubo/go-ipfs).
//! Falls back to Pinata API for pinning and public gateways for retrieval.
//!
//! Upload flow:
//! 1. Upload to local IPFS node via HTTP API
//! 2. Pin to Pinata for persistence
//! 3. Return CID for content-addressed storage

use anyhow::{anyhow, Result};
use reqwest::{multipart, Client};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

/// IPFS upload result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IPFSUploadResult {
    pub cid: String,
    pub size_bytes: u64,
    pub pinned: bool,
    pub gateway_url: String,
}

/// IPFS service configuration
#[derive(Debug, Clone)]
pub struct IPFSConfig {
    pub api_url: String,
    pub gateway_url: String,
    pub pinata_api_key: Option<String>,
    pub pinata_secret_key: Option<String>,
}

impl IPFSConfig {
    pub fn from_env() -> Self {
        Self {
            api_url: std::env::var("IPFS_API_URL")
                .unwrap_or_else(|_| "http://127.0.0.1:5001".to_string()),
            gateway_url: std::env::var("IPFS_GATEWAY_URL")
                .unwrap_or_else(|_| "https://ipfs.io/ipfs/".to_string()),
            pinata_api_key: std::env::var("PINATA_API_KEY").ok(),
            pinata_secret_key: std::env::var("PINATA_SECRET_KEY").ok(),
        }
    }
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/// Upload content to IPFS and pin it
pub async fn upload_to_ipfs(
    config: &IPFSConfig,
    data: Vec<u8>,
    filename: &str,
    mime_type: &str,
) -> Result<IPFSUploadResult> {
    let client = Client::new();
    let size = data.len() as u64;

    // Try local IPFS node first
    let cid = match upload_to_local_node(&client, &config.api_url, data.clone(), filename).await {
        Ok(cid) => cid,
        Err(e) => {
            tracing::warn!("Local IPFS node unavailable: {}. Trying Pinata...", e);
            // Fall back to Pinata direct upload
            upload_to_pinata(&client, config, data.clone(), filename, mime_type).await?
        }
    };

    // Pin to Pinata for persistence (if local node was used)
    let pinned = if config.pinata_api_key.is_some() {
        match pin_to_pinata(&client, config, &cid).await {
            Ok(_) => true,
            Err(e) => {
                tracing::warn!("Pinata pinning failed: {}", e);
                false
            }
        }
    } else {
        false
    };

    let gateway_url = format!("{}{}", config.gateway_url, cid);

    Ok(IPFSUploadResult {
        cid,
        size_bytes: size,
        pinned,
        gateway_url,
    })
}

/// Upload to local IPFS node via HTTP API
async fn upload_to_local_node(
    client: &Client,
    api_url: &str,
    data: Vec<u8>,
    filename: &str,
) -> Result<String> {
    let form = multipart::Form::new()
        .part("file", multipart::Part::bytes(data).file_name(filename.to_string()));

    let response = client
        .post(format!("{}/api/v0/add", api_url))
        .multipart(form)
        .send()
        .await
        .map_err(|e| anyhow!("IPFS API request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("IPFS add failed: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct AddResponse {
        #[serde(rename = "Hash")]
        hash: String,
    }

    let result: AddResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse IPFS response: {}", e))?;

    Ok(result.hash)
}

/// Upload directly to Pinata (fallback when local node unavailable)
async fn upload_to_pinata(
    client: &Client,
    config: &IPFSConfig,
    data: Vec<u8>,
    filename: &str,
    _mime_type: &str,
) -> Result<String> {
    let api_key = config
        .pinata_api_key
        .as_ref()
        .ok_or_else(|| anyhow!("Pinata API key not configured"))?;
    let secret_key = config
        .pinata_secret_key
        .as_ref()
        .ok_or_else(|| anyhow!("Pinata secret key not configured"))?;

    let form = multipart::Form::new()
        .part("file", multipart::Part::bytes(data).file_name(filename.to_string()));

    let response = client
        .post("https://api.pinata.cloud/pinning/pinFileToIPFS")
        .header("pinata_api_key", api_key)
        .header("pinata_secret_api_key", secret_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| anyhow!("Pinata upload failed: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("Pinata upload failed: {}", response.status()));
    }

    #[derive(Deserialize)]
    struct PinataResponse {
        #[serde(rename = "IpfsHash")]
        ipfs_hash: String,
    }

    let result: PinataResponse = response
        .json()
        .await
        .map_err(|e| anyhow!("Failed to parse Pinata response: {}", e))?;

    Ok(result.ipfs_hash)
}

/// Pin a CID to Pinata for persistence
async fn pin_to_pinata(client: &Client, config: &IPFSConfig, cid: &str) -> Result<()> {
    let api_key = config
        .pinata_api_key
        .as_ref()
        .ok_or_else(|| anyhow!("Pinata API key not configured"))?;
    let secret_key = config
        .pinata_secret_key
        .as_ref()
        .ok_or_else(|| anyhow!("Pinata secret key not configured"))?;

    let response = client
        .post("https://api.pinata.cloud/pinning/pinByHash")
        .header("pinata_api_key", api_key)
        .header("pinata_secret_api_key", secret_key)
        .json(&serde_json::json!({"hashToPin": cid}))
        .send()
        .await
        .map_err(|e| anyhow!("Pinata pin request failed: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        Err(anyhow!("Pinata pinning failed: {}", response.status()))
    }
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/// Retrieve content from IPFS with gateway fallback
pub async fn retrieve_from_ipfs(config: &IPFSConfig, cid: &str) -> Result<Vec<u8>> {
    let client = Client::new();

    // Try local node first
    match retrieve_from_local_node(&client, &config.api_url, cid).await {
        Ok(data) => return Ok(data),
        Err(e) => tracing::debug!("Local IPFS retrieval failed: {}", e),
    }

    // Try public gateways in order
    let gateways = vec![
        format!("https://ipfs.io/ipfs/{}", cid),
        format!("https://cloudflare-ipfs.com/ipfs/{}", cid),
        format!("https://gateway.pinata.cloud/ipfs/{}", cid),
        format!("{}{}", config.gateway_url, cid),
    ];

    for gateway_url in gateways {
        match client.get(&gateway_url).send().await {
            Ok(response) if response.status().is_success() => {
                let bytes = response
                    .bytes()
                    .await
                    .map_err(|e| anyhow!("Failed to read response: {}", e))?;
                return Ok(bytes.to_vec());
            }
            _ => continue,
        }
    }

    Err(anyhow!("Failed to retrieve content from IPFS: {}", cid))
}

/// Retrieve from local IPFS node
async fn retrieve_from_local_node(client: &Client, api_url: &str, cid: &str) -> Result<Vec<u8>> {
    let response = client
        .post(format!("{}/api/v0/cat?arg={}", api_url, cid))
        .send()
        .await
        .map_err(|e| anyhow!("IPFS cat request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(anyhow!("IPFS cat failed: {}", response.status()));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| anyhow!("Failed to read IPFS response: {}", e))?;

    Ok(bytes.to_vec())
}

// ─── Database Integration ─────────────────────────────────────────────────────

/// Store IPFS upload record in database
pub async fn store_ipfs_record(
    db: &PgPool,
    uploader_id: Uuid,
    result: &IPFSUploadResult,
    filename: &str,
    mime_type: &str,
) -> Result<Uuid> {
    let id = Uuid::new_v4();
    let pinning_service = if result.pinned { Some("pinata") } else { None };

    sqlx::query!(
        r#"
        INSERT INTO ipfs_content (
            id, cid, filename, mime_type, size_bytes,
            uploaded_by, pinned, pinning_service, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        "#,
        id,
        result.cid,
        filename,
        mime_type,
        result.size_bytes as i64,
        uploader_id,
        result.pinned,
        pinning_service,
    )
    .execute(db)
    .await?;

    Ok(id)
}

/// Verify content integrity by comparing SHA256 hash
pub fn verify_content_integrity(data: &[u8], expected_hash: &str) -> bool {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let hash = hex::encode(hasher.finalize());
    hash == expected_hash
}

/// Compute SHA256 hash of content
pub fn compute_content_hash(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_hash_deterministic() {
        let data = b"Hello, SyncSenta!";
        let hash1 = compute_content_hash(data);
        let hash2 = compute_content_hash(data);
        assert_eq!(hash1, hash2, "Hash must be deterministic");
    }

    #[test]
    fn test_content_integrity_verification() {
        let data = b"Test content for IPFS";
        let hash = compute_content_hash(data);
        assert!(verify_content_integrity(data, &hash));
    }

    #[test]
    fn test_tampered_content_fails_verification() {
        let original = b"Original content";
        let tampered = b"Tampered content";
        let hash = compute_content_hash(original);
        assert!(!verify_content_integrity(tampered, &hash));
    }

    #[test]
    fn test_empty_content_hash() {
        let data = b"";
        let hash = compute_content_hash(data);
        assert!(!hash.is_empty(), "Empty content should still produce a hash");
        assert_eq!(hash.len(), 64, "SHA256 hex should be 64 chars");
    }

    #[test]
    fn test_ipfs_config_from_defaults() {
        let config = IPFSConfig {
            api_url: "http://127.0.0.1:5001".to_string(),
            gateway_url: "https://ipfs.io/ipfs/".to_string(),
            pinata_api_key: None,
            pinata_secret_key: None,
        };
        assert_eq!(config.api_url, "http://127.0.0.1:5001");
        assert!(config.pinata_api_key.is_none());
    }

    #[test]
    fn test_gateway_url_construction() {
        let config = IPFSConfig {
            api_url: "http://127.0.0.1:5001".to_string(),
            gateway_url: "https://ipfs.io/ipfs/".to_string(),
            pinata_api_key: None,
            pinata_secret_key: None,
        };
        let cid = "QmTestCID123";
        let url = format!("{}{}", config.gateway_url, cid);
        assert_eq!(url, "https://ipfs.io/ipfs/QmTestCID123");
    }
}
