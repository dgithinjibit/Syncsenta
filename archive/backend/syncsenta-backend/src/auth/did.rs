//! DID (Decentralized Identifier) generation and management
//! 
//! Implements minimal W3C DID support using did:key method
//! This is a simplified implementation until full ssi crate support is available

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use base64::Engine;
use uuid::Uuid;

/// DID method types supported
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DIDMethod {
    Key,
    Web,
}

/// Generate a DID for a user
/// 
/// For now, we use a simplified did:key method based on user ID
/// In production, this should use proper cryptographic key generation
pub fn generate_did(user_id: Uuid, method: DIDMethod) -> String {
    match method {
        DIDMethod::Key => {
            // Generate a deterministic key from user ID
            let mut hasher = Sha256::new();
            hasher.update(user_id.as_bytes());
            let hash = hasher.finalize();
            let key = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&hash[..]);
            format!("did:key:z{}", key)
        }
        DIDMethod::Web => {
            // did:web method uses domain-based identifiers
            format!("did:web:syncsenta.education:users:{}", user_id)
        }
    }
}

/// Resolve a DID to a DID Document
/// 
/// This is a simplified implementation that returns a basic DID document
pub fn resolve_did(did: &str) -> Result<DIDDocument> {
    if !did.starts_with("did:") {
        return Err(anyhow!("Invalid DID format"));
    }

    // Extract method and identifier
    let parts: Vec<&str> = did.split(':').collect();
    if parts.len() < 3 {
        return Err(anyhow!("Invalid DID format"));
    }

    let method = parts[1];
    let identifier = parts[2..].join(":");

    Ok(DIDDocument {
        context: vec![
            "https://www.w3.org/ns/did/v1".to_string(),
            "https://w3id.org/security/suites/ed25519-2020/v1".to_string(),
        ],
        id: did.to_string(),
        verification_method: vec![VerificationMethod {
            id: format!("{}#key-1", did),
            method_type: "Ed25519VerificationKey2020".to_string(),
            controller: did.to_string(),
            public_key_multibase: Some(identifier.clone()),
            public_key_jwk: None,
        }],
        authentication: vec![format!("{}#key-1", did)],
        assertion_method: vec![format!("{}#key-1", did)],
    })
}

/// W3C DID Document structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DIDDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    pub assertion_method: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationMethod {
    pub id: String,
    #[serde(rename = "type")]
    pub method_type: String,
    pub controller: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key_multibase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub public_key_jwk: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_did_key() {
        let user_id = Uuid::new_v4();
        let did = generate_did(user_id, DIDMethod::Key);
        assert!(did.starts_with("did:key:z"));
    }

    #[test]
    fn test_generate_did_web() {
        let user_id = Uuid::new_v4();
        let did = generate_did(user_id, DIDMethod::Web);
        assert!(did.starts_with("did:web:syncsenta.education:users:"));
    }

    #[test]
    fn test_resolve_did() {
        let user_id = Uuid::new_v4();
        let did = generate_did(user_id, DIDMethod::Key);
        let doc = resolve_did(&did);
        assert!(doc.is_ok());
        let doc = doc.unwrap();
        assert_eq!(doc.id, did);
        assert!(!doc.verification_method.is_empty());
    }

    #[test]
    fn test_resolve_invalid_did() {
        let result = resolve_did("invalid");
        assert!(result.is_err());
    }
}
