# Design Document: SyncSenta — Web4 Education Operating System

## Overview

SyncSenta is a **Web4 Education Operating System** — a fully decentralized, AI-driven, immersive lifelong learning utility built on blockchain, IPFS, and self-sovereign identity from day 1. It begins as a Kenya-first platform targeting 100,000+ concurrent users across Kenya's CBC 2-6-3-3 curriculum, and evolves into a global learning utility by 2030.

**Architecture Philosophy:** Decentralized from day 1, not hybrid. This is NOT a gradual migration — this is aggressive Web4 architecture where blockchain credentials, IPFS storage, DID authentication, and token economy are foundational, not future upgrades. Every component is built for decentralization, user sovereignty, and censorship resistance.

Third-party integrations: Jitsi Meet (virtual classrooms), M-Pesa Daraja API (payments), Africa's Talking (SMS), Google Calendar (scheduling), Polygon (blockchain), IPFS (storage), W3C DID (identity).

The platform is assembled from several specialized repositories merged into the `studio` monorepo:

| Source Repo | Contribution |
|---|---|
| `scheme-scribe-ai` / `scheme-genie` | AI-driven CBC scheme generation |
| `LughaBridge` | Multilingual translation pipeline |
| `igbo-bilingual-chat` | Bilingual chat engine (English/Swahili/indigenous) |
| `Syncsenta_local` | Offline-first PWA sync layer |
| `hexstrike-ai` | Core AI inference orchestration |
| `thrml` / `candle` / `best-of-ml-rust` | Rust-based ML inference (edge/offline) |
| `aditicha` | Supplementary educational content |

### Design Goals

- **Web4-native**: Full decentralization from day 1 — blockchain credentials, IPFS storage, DID authentication, token economy
- **CBC-native**: All content, schemes, and assessments map to official KICD curriculum strands and competencies
- **Multilingual-first**: English, Swahili, Kikuyu, Dholuo, and Luhya supported from day one
- **Offline-capable**: Full PWA with service worker caching and Rust WASM-powered background sync for low-connectivity environments
- **Scalable**: Designed for 100,000+ concurrent users via connection pooling, async Rust runtime (Tokio), and CDN-served assets
- **Privacy-compliant**: Kenyan Data Protection Act 2019, self-sovereign identity, zero-knowledge proofs, and WCAG 2.1 AA compliance built in
- **Seven-tier RBAC**: Student → Parent → Teacher → School_Admin → School_Head → County_Officer → National_Admin with approval workflows at every tier boundary
- **User sovereignty**: Users own their identity (DID), credentials (VCs + blockchain NFTs), and data (IPFS)
- **No single point of failure**: Decentralized storage, distributed identity, on-chain credentials
- **Censorship-resistant**: Content on IPFS, credentials on blockchain, identity self-sovereign

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser / PWA)                  │
│   React + TypeScript + Vite + Tailwind CSS + Shadcn/UI         │
│   Service Worker + IndexedDB  ←→  Rust WASM Sync Engine         │
│   ethers.js (Web3) + ipfs-http-client + DID resolver            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────────────┐
│                    Axum Web Server (Rust)                        │
│   Tower Middleware: DID Auth · Rate Limiter · RBAC · Approval   │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────────┘
   │          │          │          │          │
┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌───▼──────────────┐
│DID  │  │Scheme │  │Mwali- │  │Virtual│  │Payment / SMS /   │
│Auth │  │Gen    │  │mu AI  │  │Class- │  │Calendar Services │
│Svc  │  │Svc    │  │2.0    │  │room   │  │                  │
└──┬──┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬──────────────┘
   │          │          │          │           │
┌──▼──────────▼──────────▼──────────▼───────────▼──────────────┐
│                    Data Layer                                   │
│  PostgreSQL + pgvector (sqlx) · Redis (caching/queues)        │
└──────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    Web3 Layer (Decentralized)                    │
│  Polygon Blockchain (ethers-rs) · IPFS Storage (ipfs-api)      │
│  Smart Contracts: Credentials · Tokens · Approvals · Content   │
└─────────────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    AI / ML Layer                                  │
│  GPT-4o (Mwalimu AI) · Gemini Pro (multimodal) · ElevenLabs    │
│  Whisper/scribe_v2 (STT) · candle + thrml (local inference)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Rust Crates

**Frontend (React + TypeScript):**
- `react` - UI library
- `react-router-dom` - Client-side routing
- `@tanstack/react-query` - Server state management
- `zustand` - Client state management
- `tailwindcss` - Utility-first CSS
- `shadcn/ui` - Re-usable component library
- `vite` - Build tool and dev server
- `vite-plugin-pwa` - PWA support with service workers
- `ethers` - Ethereum/Polygon Web3 integration
- `ipfs-http-client` - IPFS uploads and retrieval
- `@web3-storage/w3up-client` - Web3.Storage integration

**Frontend (Rust WASM Module - Offline ML only):**
- `wasm-bindgen` - JavaScript interop
- `web-sys` - Web APIs
- `gloo` - Web utilities (storage, timers)
- `candle-core` - ML inference
- `thrml` - High-level ML abstractions
- `serde-wasm-bindgen` - Serialization for WASM

**Backend (Axum):**
- `axum` - Web framework built on Tokio and Tower
- `tower` - Middleware (auth, rate limiting, tracing)
- `tower-http` - HTTP middleware (CORS, compression, tracing)
- `tokio` - Async runtime
- `sqlx` - Async PostgreSQL driver with compile-time query checking
- `redis` - Redis client for caching and queues
- `serde` / `serde_json` - Serialization
- `did-key` / `did-web` - W3C DID implementation
- `ssi` - Verifiable Credentials library
- `uuid` - UUID generation
- `chrono` - Date/time handling
- `tracing` / `tracing-subscriber` - Structured logging

**Web3/Blockchain:**
- `ethers-rs` - Ethereum/Polygon smart contract interaction
- `ethers-signers` - Wallet and signing
- `ethers-contract` - Contract ABI and deployment
- `ethers-providers` - RPC providers (Alchemy, Infura)

**IPFS/Decentralized Storage:**
- `ipfs-api` - IPFS HTTP API client
- `cid` - Content Identifier parsing
- `multihash` - Multihash support

**ML/AI:**
- `candle-core` - ML framework for inference
- `thrml` - High-level ML abstractions
- `tokenizers` - Tokenization for LLMs
- `reqwest` - HTTP client for OpenAI/Anthropic APIs
- `async-openai` - OpenAI API client
- `anthropic-sdk` - Anthropic API client

**Integrations:**
- `reqwest` - HTTP client for external APIs
- `hmac` / `sha2` - HMAC signing for M-Pesa
- `base64` - Base64 encoding
- `lettre` - Email sending

**Utilities:**
- `anyhow` / `thiserror` - Error handling
- `config` - Configuration management
- `dotenv` - Environment variables
- `validator` - Input validation

### Deployment Architecture

- **Vercel / Netlify**: React frontend (static assets + SSR)
- **Fly.io / Railway**: Compiled Rust binary for backend (single binary deployment)
- **CDN (Cloudflare)**: WASM bundle for offline ML inference
- **PostgreSQL**: Managed PostgreSQL with pgvector extension (Fly.io Postgres / Neon)
- **Redis**: Managed Redis for session caching, rate limiting, and job queues (Upstash / Fly.io Redis)
- **Polygon**: Blockchain layer (Mumbai testnet → Mainnet)
  - Alchemy/Infura RPC endpoints
  - Smart contracts deployed via Hardhat/Foundry
- **IPFS**: Decentralized storage
  - Local IPFS node (optional)
  - Pinata/Infura pinning services
  - Public gateways (ipfs.io, cloudflare-ipfs.com)
- **Jitsi Meet**: Self-hosted or Jitsi-as-a-Service with DID-based room authentication
- **M-Pesa Daraja API**: STK Push, C2B callbacks, transaction status queries
- **Africa's Talking**: SMS gateway for notifications and reminders
- **Google Calendar API**: OAuth 2.0 integration for event sync

---

## Components and Interfaces

### 1. Authentication Service and Approval Workflow

Built on W3C Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs) with **did-key**, **did-web**, and **ssi** crates.

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_role", rename_all = "snake_case")]
pub enum UserRole {
    Student,
    Parent,
    Teacher,
    SchoolAdmin,
    SchoolHead,
    CountyOfficer,
    NationalAdmin,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "approval_status", rename_all = "snake_case")]
pub enum ApprovalStatus {
    Pending,
    Approved,
    Rejected,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserProfile {
    pub id: Uuid,
    pub did: String,  // W3C DID (e.g., did:key:z6Mk...)
    pub email: String,
    pub role: UserRole,
    pub approval_status: ApprovalStatus,
    pub approved_by: Option<Uuid>,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: SupportedLanguage,
    pub wallet_address: Option<String>,  // For token economy
    pub vc_store: serde_json::Value,  // Verifiable Credentials storage
    pub blockchain_tx_hash: Option<String>,  // On-chain approval record
    pub created_at: DateTime<Utc>,
}

// Approval chain: who approves whom
pub fn get_approver_role(role: &UserRole) -> UserRole {
    match role {
        UserRole::Student => UserRole::Teacher,
        UserRole::Parent => UserRole::Teacher,
        UserRole::Teacher => UserRole::SchoolHead,
        UserRole::SchoolAdmin => UserRole::SchoolHead,
        UserRole::SchoolHead => UserRole::CountyOfficer,
        UserRole::CountyOfficer => UserRole::NationalAdmin,
        UserRole::NationalAdmin => UserRole::NationalAdmin, // self-managed
    }
}

// DID Document structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DIDDocument {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,  // DID
    pub verification_method: Vec<VerificationMethod>,
    pub authentication: Vec<String>,
    pub assertion_method: Vec<String>,
}

// Verifiable Credential structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifiableCredential {
    #[serde(rename = "@context")]
    pub context: Vec<String>,
    pub id: String,
    #[serde(rename = "type")]
    pub credential_type: Vec<String>,
    pub issuer: String,  // DID of issuer
    pub issuance_date: DateTime<Utc>,
    pub credential_subject: CredentialSubject,
    pub proof: Proof,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialSubject {
    pub id: String,  // DID of subject
    pub role: UserRole,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub approval_status: ApprovalStatus,
}
```

- DID-based authentication with Verifiable Presentations in Authorization header
- Hardware wallet MFA (MetaMask, Ledger) for privileged roles via signature verification
- Row-Level Security policies enforced via sqlx queries with role checks from VCs
- Approval state checked in Tower middleware on every protected request
- On-chain approval records via `ApprovalRegistry.sol` smart contract

### 2. Blockchain Layer (Polygon)

Smart contracts deployed on Polygon for credentials, tokens, approvals, and content registry.

```solidity
// SyncSentaCredentials.sol (ERC-721)
contract SyncSentaCredentials is ERC721 {
    struct Credential {
        address learner;
        string skillId;
        string evidenceHash;  // IPFS CID
        uint256 issuedAt;
        bool revoked;
    }
    
    mapping(uint256 => Credential) public credentials;
    uint256 private _tokenIdCounter;
    
    function mintCredential(
        address learner,
        string memory skillId,
        string memory evidenceHash
    ) external onlyIssuer returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(learner, tokenId);
        credentials[tokenId] = Credential({
            learner: learner,
            skillId: skillId,
            evidenceHash: evidenceHash,
            issuedAt: block.timestamp,
            revoked: false
        });
        emit CredentialMinted(tokenId, learner, skillId);
        return tokenId;
    }
    
    function verifyCredential(uint256 tokenId)
        external view returns (bool valid, address learner, string memory skillId) {
        require(_exists(tokenId), "Credential does not exist");
        Credential memory cred = credentials[tokenId];
        return (!cred.revoked, cred.learner, cred.skillId);
    }
    
    function revokeCredential(uint256 tokenId) external onlyIssuer {
        require(_exists(tokenId), "Credential does not exist");
        credentials[tokenId].revoked = true;
        emit CredentialRevoked(tokenId);
    }
}

// SyncToken.sol (ERC-20)
contract SyncToken is ERC20 {
    address public minter;
    
    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
}

// ApprovalRegistry.sol
contract ApprovalRegistry {
    struct ApprovalRecord {
        address applicant;
        address approver;
        string role;
        bool approved;
        uint256 timestamp;
    }
    
    mapping(bytes32 => ApprovalRecord) public approvals;
    
    function recordApproval(
        address applicant,
        address approver,
        string memory role,
        bool approved
    ) external returns (bytes32) {
        bytes32 recordId = keccak256(abi.encodePacked(applicant, role, block.timestamp));
        approvals[recordId] = ApprovalRecord({
            applicant: applicant,
            approver: approver,
            role: role,
            approved: approved,
            timestamp: block.timestamp
        });
        emit ApprovalRecorded(recordId, applicant, approver, approved);
        return recordId;
    }
}

// ContentRegistry.sol
contract ContentRegistry {
    struct ContentRecord {
        string ipfsCid;
        address creator;
        uint256 timestamp;
        bool active;
    }
    
    mapping(bytes32 => ContentRecord) public content;
    
    function registerContent(string memory ipfsCid, address creator)
        external returns (bytes32) {
        bytes32 contentId = keccak256(abi.encodePacked(ipfsCid, creator, block.timestamp));
        content[contentId] = ContentRecord({
            ipfsCid: ipfsCid,
            creator: creator,
            timestamp: block.timestamp,
            active: true
        });
        emit ContentRegistered(contentId, ipfsCid, creator);
        return contentId;
    }
}
```

**Rust Web3 Integration:**
```rust
use ethers::{
    prelude::*,
    providers::{Provider, Http},
    signers::{LocalWallet, Signer},
    contract::Contract,
};

pub struct BlockchainService {
    provider: Provider<Http>,
    wallet: LocalWallet,
    credentials_contract: Contract<Provider<Http>>,
    token_contract: Contract<Provider<Http>>,
    approval_registry: Contract<Provider<Http>>,
    content_registry: Contract<Provider<Http>>,
}

impl BlockchainService {
    pub async fn mint_credential(
        &self,
        learner_address: Address,
        skill_id: String,
        evidence_cid: String,
    ) -> Result<U256, BlockchainError> {
        let tx = self.credentials_contract
            .method::<_, U256>("mintCredential", (learner_address, skill_id, evidence_cid))?
            .send()
            .await?
            .await?;
        
        Ok(tx.logs[0].topics[1].into())  // Return token ID
    }
    
    pub async fn mint_tokens(
        &self,
        learner_address: Address,
        amount: U256,
    ) -> Result<TxHash, BlockchainError> {
        let tx = self.token_contract
            .method::<_, ()>("mint", (learner_address, amount))?
            .send()
            .await?
            .await?;
        
        Ok(tx.transaction_hash)
    }
    
    pub async fn record_approval(
        &self,
        applicant: Address,
        approver: Address,
        role: String,
        approved: bool,
    ) -> Result<[u8; 32], BlockchainError> {
        let tx = self.approval_registry
            .method::<_, [u8; 32]>("recordApproval", (applicant, approver, role, approved))?
            .send()
            .await?
            .await?;
        
        Ok(tx.logs[0].topics[1].into())  // Return record ID
    }
}
```

### 3. IPFS Decentralized Storage

All content stored on IPFS with content-addressed CIDs.

```rust
use ipfs_api::{IpfsClient, IpfsApi};
use cid::Cid;

pub struct IPFSService {
    client: IpfsClient,
    pinata_api_key: String,
    pinata_secret_key: String,
}

impl IPFSService {
    pub async fn upload_content(&self, data: Vec<u8>) -> Result<Cid, IPFSError> {
        // Upload to local IPFS node
        let response = self.client.add(data.clone()).await?;
        let cid = Cid::try_from(response.hash.as_str())?;
        
        // Pin to Pinata for persistence
        self.pin_to_pinata(&cid).await?;
        
        Ok(cid)
    }
    
    pub async fn retrieve_content(&self, cid: &Cid) -> Result<Vec<u8>, IPFSError> {
        // Try local node first
        match self.client.cat(&cid.to_string()).await {
            Ok(data) => Ok(data),
            Err(_) => {
                // Fallback to public gateway
                self.fetch_from_gateway(cid).await
            }
        }
    }
    
    async fn pin_to_pinata(&self, cid: &Cid) -> Result<(), IPFSError> {
        let client = reqwest::Client::new();
        let response = client
            .post("https://api.pinata.cloud/pinning/pinByHash")
            .header("pinata_api_key", &self.pinata_api_key)
            .header("pinata_secret_api_key", &self.pinata_secret_key)
            .json(&serde_json::json!({
                "hashToPin": cid.to_string()
            }))
            .send()
            .await?;
        
        if response.status().is_success() {
            Ok(())
        } else {
            Err(IPFSError::PinningFailed)
        }
    }
    
    async fn fetch_from_gateway(&self, cid: &Cid) -> Result<Vec<u8>, IPFSError> {
        let gateways = vec![
            format!("https://ipfs.io/ipfs/{}", cid),
            format!("https://cloudflare-ipfs.com/ipfs/{}", cid),
            format!("https://gateway.pinata.cloud/ipfs/{}", cid),
        ];
        
        for gateway_url in gateways {
            if let Ok(response) = reqwest::get(&gateway_url).await {
                if let Ok(bytes) = response.bytes().await {
                    return Ok(bytes.to_vec());
                }
            }
        }
        
        Err(IPFSError::RetrievalFailed)
    }
}
```

### 4. Mwalimu AI 2.0

The core AI tutor, orchestrating multiple AI models.

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InputType {
    Text,
    Voice,
    Image,
    Document,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MwalimuMode {
    Tutor,
    HomeworkHelp,
    QuizGen,
    DocAnalysis,
    ImageSolve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MwalimuRequest {
    pub session_id: String,
    pub student_id: Uuid,
    pub grade_level: CBCGradeLevel,
    pub input_type: InputType,
    pub content: String,  // text, base64 audio, base64 image, or document URL
    pub language: SupportedLanguage,
    pub mode: MwalimuMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MwalimuResponse {
    pub session_id: String,
    pub response_text: String,
    pub audio_url: Option<String>,  // ElevenLabs TTS output URL
    pub quiz_questions: Option<Vec<QuizQuestion>>,
    pub learning_path_update: Option<Vec<LearningPathStep>>,
    pub redirect_topic: Option<String>,  // set when off-topic detected
    pub model_used: ModelType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModelType {
    Gpt4o,
    GeminiPro,
    CandleEdge,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LearningPath {
    pub student_id: Uuid,
    pub steps: Vec<LearningPathStep>,
    pub generated_at: DateTime<Utc>,
    pub based_on_assessments: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LearningPathStep {
    pub order: i32,
    pub topic: String,
    pub curriculum_ref: String,
    pub resource_ids: Vec<Uuid>,
    pub estimated_minutes: i32,
    pub completed: bool,
}
```

**Model routing:**
- Text queries → GPT-4o with CBC-grounded system prompt (via `async-openai`)
- Image/diagram analysis → Gemini Pro vision (via `reqwest` + custom client)
- Document analysis → Gemini Pro with PDF content
- Voice input → Whisper/scribe_v2 STT → GPT-4o → ElevenLabs TTS
- Offline/edge → Rust `candle` inference with quantized model

### 3. Virtual Classroom Service

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "classroom_status", rename_all = "snake_case")]
pub enum ClassroomStatus {
    Scheduled,
    Live,
    Ended,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct VirtualClassroom {
    pub id: Uuid,
    pub teacher_id: Uuid,
    pub class_id: Uuid,
    pub title: String,
    pub scheduled_at: DateTime<Utc>,
    pub jitsi_room_name: String,
    pub jitsi_jwt: String,
    pub max_participants: i32,  // max 100
    pub recording_enabled: bool,
    pub recording_url: Option<String>,
    pub status: ClassroomStatus,
    pub attendance_log: Vec<AttendanceEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceEntry {
    pub student_id: Uuid,
    pub joined_at: DateTime<Utc>,
    pub left_at: Option<DateTime<Utc>>,
    pub duration_minutes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiConfig {
    pub domain: String,
    pub room_name: String,
    pub jwt: String,
    pub user_info: JitsiUserInfo,
    pub config_overwrite: JitsiConfigOverwrite,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiUserInfo {
    pub display_name: String,
    pub email: String,
    pub role: JitsiRole,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JitsiRole {
    Moderator,
    Participant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiConfigOverwrite {
    pub start_with_audio_muted: bool,
    pub start_with_video_muted: bool,
    pub enable_close_page: bool,
}
```

- Jitsi JWT signed with `HS256` using `jsonwebtoken` crate; includes `moderator: true` for teachers
- Session recording stored in object storage (R2/B2) under `recordings/{class_id}/{session_id}.mp4`
- Attendance auto-tracked via Jitsi `participantJoined` / `participantLeft` events forwarded to Axum webhook endpoint
- Calendar invites generated via Google Calendar API; SMS reminders via Africa's Talking

### 4. Payment Service (M-Pesa + Bank Transfer)

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FeeStructure {
    pub id: Uuid,
    pub school_id: Uuid,
    pub grade_level: CBCGradeLevel,
    pub term: i16,  // 1, 2, or 3
    pub academic_year: i32,
    pub amount: i64,  // KES in cents
    pub due_date: DateTime<Utc>,
    pub categories: Vec<FeeCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "payment_method", rename_all = "snake_case")]
pub enum PaymentMethod {
    Mpesa,
    BankTransfer,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "payment_status", rename_all = "snake_case")]
pub enum PaymentStatus {
    Pending,
    Confirmed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PaymentTransaction {
    pub id: Uuid,
    pub student_id: Uuid,
    pub parent_id: Uuid,
    pub amount: i64,  // KES in cents
    pub method: PaymentMethod,
    pub mpesa_checkout_request_id: Option<String>,
    pub mpesa_receipt_number: Option<String>,
    pub status: PaymentStatus,
    pub initiated_at: DateTime<Utc>,
    pub confirmed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DarajaSTKPushRequest {
    #[serde(rename = "BusinessShortCode")]
    pub business_short_code: String,
    #[serde(rename = "Password")]
    pub password: String,  // base64(shortcode + passkey + timestamp)
    #[serde(rename = "Timestamp")]
    pub timestamp: String,
    #[serde(rename = "TransactionType")]
    pub transaction_type: String,  // "CustomerPayBillOnline"
    #[serde(rename = "Amount")]
    pub amount: i64,
    #[serde(rename = "PartyA")]
    pub party_a: String,  // phone number
    #[serde(rename = "PartyB")]
    pub party_b: String,  // shortcode
    #[serde(rename = "PhoneNumber")]
    pub phone_number: String,
    #[serde(rename = "CallBackURL")]
    pub callback_url: String,
    #[serde(rename = "AccountReference")]
    pub account_reference: String,
    #[serde(rename = "TransactionDesc")]
    pub transaction_desc: String,
}
```

- STK Push initiated via Daraja API `/mpesa/stkpush/v1/processrequest` using `reqwest`
- Callback received at `/api/payments/mpesa/callback` Axum endpoint
- If no callback within 60s, query `/mpesa/stkpushquery/v1/query` for status
- Bank transfers confirmed manually by School_Admin; receipt generated on confirmation
- Fee reports exported as PDF (using `printpdf` crate) and Excel (using `rust_xlsxwriter` crate)

### 5. SMS Service (Africa's Talking)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SMSType {
    Attendance,
    FeeReminder,
    Announcement,
    Approval,
    SessionReminder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SMSNotification {
    pub recipients: Vec<String>,  // E.164 phone numbers
    pub message: String,
    pub sender_id: Option<String>,  // Africa's Talking sender ID
    pub sms_type: SMSType,
}
```

- All SMS dispatched via Africa's Talking SMS API from Axum handlers using `reqwest`
- Queued in Redis for rate-limited batch dispatch (max 100/minute) using `redis` crate
- Delivery receipts stored in `sms_log` table for audit

### 6. Scheme Generation Service

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemeGenerationRequest {
    pub subject: String,
    pub grade_level: CBCGradeLevel,
    pub strand: String,
    pub sub_strand: String,
    pub weeks_count: i32,
    pub language: SupportedLanguage,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct GeneratedScheme {
    pub id: Uuid,
    pub curriculum_ref: String,  // CBC/{Subject}/{GradeLevel}/{Strand}/{SubStrand}
    pub learning_objectives: Vec<String>,
    pub activities: Vec<Activity>,
    pub assessment_criteria: Vec<AssessmentCriterion>,
    pub resources: Vec<ResourceRef>,
    pub generated_at: DateTime<Utc>,
    pub teacher_id: Uuid,
}
```

### 7. Analytics Engine

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct StudentProgressMetric {
    pub student_id: Uuid,
    pub subject_id: Uuid,
    pub assessment_scores: Vec<AssessmentScore>,
    pub completion_rate: f64,
    pub strength_topics: Vec<String>,
    pub weakness_topics: Vec<String>,
    pub below_benchmark: bool,
    pub at_risk_score: f64,  // 0.0-1.0 predictive risk score
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnalyticsScope {
    Class,
    School,
    County,
    National,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComparativeAnalytics {
    pub scope: AnalyticsScope,
    pub scope_id: Uuid,
    pub average_score: f64,
    pub completion_rate: f64,
    pub at_risk_count: i32,
    pub topic_breakdown: Vec<TopicPerformance>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}
```

- Predictive at-risk model: logistic regression over attendance, score trend, assignment completion (using `smartcore` or `linfa` crates)
- Comparative analytics scoped by role: teachers see class, school_head sees school, county_officer sees county
- Reports generated as PDF and Excel on demand

### 8. Content Library and Marketplace

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "file_type", rename_all = "snake_case")]
pub enum FileType {
    Pdf,
    Docx,
    Image,
    Video,
    Audio,
    Ebook,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ContentResource {
    pub id: Uuid,
    pub uploader_id: Uuid,
    pub title: String,
    pub file_type: FileType,
    pub storage_url: String,
    pub size_bytes: i64,
    pub tags: Vec<String>,
    pub curriculum_refs: Vec<String>,
    pub grade_level: CBCGradeLevel,
    pub subject: String,
    pub language: SupportedLanguage,
    pub transcript: Option<String>,  // auto-generated for video/audio
    pub sharing_permissions: Vec<SharingPermission>,
    pub marketplace_listing: Option<MarketplaceListing>,
    pub full_text_index: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketplaceListing {
    pub price: i64,  // KES in cents; 0 = free
    pub currency: String,  // "KES"
    pub published_at: DateTime<Utc>,
    pub purchase_count: i32,
}
```

### 9. Communication Hub

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DirectMessage {
    pub id: Uuid,
    pub sender_id: Uuid,
    pub recipient_id: Uuid,
    pub content: String,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AnnouncementScope {
    School,
    Class,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Announcement {
    pub id: Uuid,
    pub author_id: Uuid,
    pub scope: AnnouncementScope,
    pub scope_id: Uuid,
    pub title: String,
    pub content: String,
    pub sms_sent: bool,
    pub published_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DiscussionThread {
    pub id: Uuid,
    pub class_id: Uuid,
    pub subject_id: Uuid,
    pub title: String,
    pub posts: Vec<DiscussionPost>,
    pub moderator_id: Uuid,
}
```

### 10. Offline Sync Service (Rust)

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SyncAction {
    CompleteActivity,
    SubmitAssessment,
    SaveProgress,
    SendMessage,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "sync_status", rename_all = "snake_case")]
pub enum SyncStatus {
    Pending,
    Synced,
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncQueueEntry {
    pub id: Uuid,
    pub user_id: Uuid,
    pub action: SyncAction,
    pub payload: serde_json::Value,
    pub created_offline_at: DateTime<Utc>,
    pub synced_at: Option<DateTime<Utc>>,
    pub status: SyncStatus,
}
```

- Rust WASM module (`Sync_Engine`) manages IndexedDB queue in the browser using `gloo-storage`
- On reconnect, entries processed in `created_offline_at` order via `POST /api/sync/flush`
- Conflict resolution: server wins for grades; last-write-wins for drafts
- Rust backend handles server-side sync flush for high-throughput scenarios

---

## Data Models

### Core Entity Relationships

```
User (id, email, role, approvalStatus, schoolId, countyId, languagePreference)
  ├── Student (userId, gradeLevel, classId, progressSummary, parentIds[])
  ├── Teacher (userId, subjectAreas[], classIds[])
  ├── Parent (userId, linkedStudentIds[])
  ├── SchoolAdmin (userId, schoolId)
  ├── SchoolHead (userId, schoolId)
  ├── CountyOfficer (userId, countyId)
  └── NationalAdmin (userId)

School (id, name, county, region, curriculumConfig)
  ├── Class (id, schoolId, teacherId, gradeLevel, subject, academicYear)
  ├── FeeStructure (id, schoolId, gradeLevel, term, amount, dueDate)
  └── Announcement (id, schoolId, scope, content)

VirtualClassroom (id, teacherId, classId, jitsiRoomName, status, attendanceLog[])
PaymentTransaction (id, studentId, parentId, amount, method, status)
SMSLog (id, recipients[], message, type, sentAt, deliveryStatus)

Scheme (id, teacherId, curriculumRef, subject, gradeLevel, content, language)
Assessment (id, teacherId, classId, curriculumRef, questions[], timeLimitMinutes)
AssessmentSubmission (id, assessmentId, studentId, answers, score, submittedAt)

ContentResource (id, uploaderId, storageUrl, fileType, transcript, marketplaceListing)
MarketplacePurchase (id, buyerId, resourceId, amount, transactionId)

ChatSession (id, studentId, activeLanguage, topicContext, messageHistory[])
LearningPath (id, studentId, steps[], generatedAt)

CollaborativeWorkspace (id, activityId, classId, memberStudentIds[], contributionLog[])
DiscussionThread (id, classId, subjectId, posts[])
DirectMessage (id, senderId, recipientId, content, readAt)

SyncQueueEntry (id, userId, action, payload, createdOfflineAt, status)
AuditLog (id, userId, action, resourceType, resourceId, ipAddress, occurredAt)
ApprovalRequest (id, applicantId, approverId, role, status, decidedAt)
```

### CBC Grade Level Enum

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "cbc_grade_level", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CBCGradeLevel {
    PP1,
    PP2,
    Grade1,
    Grade2,
    Grade3,
    Grade4,
    Grade5,
    Grade6,
    JSS1,
    JSS2,
    JSS3,
    SSS1,
    SSS2,
    SSS3,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "supported_language", rename_all = "lowercase")]
pub enum SupportedLanguage {
    En,   // English
    Sw,   // Swahili
    Ki,   // Kikuyu
    Luo,  // Dholuo
    Luy,  // Luhya
}
```

### Curriculum Reference Format

```
CBC/{Subject}/{GradeLevel}/{Strand}/{SubStrand}
```
Example: `CBC/Mathematics/Grade4/Numbers/WholeNumbers`

---

## Error Handling

| Category | Strategy |
|---|---|
| Auth / approval errors | 401/403 with structured error; pending accounts get 403 with `approvalStatus` field |
| Validation errors | 400 with field-level error details |
| AI service errors | Retry with exponential backoff (3 attempts, 1s/2s/4s); fall back to Rust edge inference |
| M-Pesa callback timeout | Query Daraja status API after 60s; reconcile and update transaction |
| SMS delivery failure | Retry via Africa's Talking; log failure in `sms_log` |
| Storage errors | 503; queue retry; notify user |
| Sync conflicts | Log conflict; apply resolution strategy; notify user |
| Rate limit exceeded | 429 with `Retry-After` header |
| Infrastructure errors | Circuit breaker; graceful degradation to cached/offline content |

---

## Testing Strategy

**Unit Testing** (Rust built-in test framework + `tokio::test` for async):
- Authentication and approval workflow logic
- Scheme generation validation
- Assessment auto-grading
- Payment transaction state machine
- Translation fallback behavior
- Sync queue ordering and conflict resolution

**Property-Based Testing** (`proptest` crate, minimum 100 iterations):
- Tagged: `Feature: syncsenta-education-os, Property {N}: {description}`
- Targets: translation pipeline, scheme validation, analytics calculations, sync queue ordering, RBAC enforcement, payment state transitions

**Integration Testing** (Rust integration tests + `sqlx::test` for database):
- End-to-end auth and approval flows
- Scheme generation → save → retrieve round trip
- Assessment creation → submission → grading
- M-Pesa STK Push → callback → receipt
- Offline mode → reconnect → sync
- Virtual classroom join → attendance recording

**End-to-End Testing** (Playwright with Leptos frontend):
- Full user workflows across all roles
- Virtual classroom sessions
- Payment flows
- Offline sync scenarios

**Performance Testing** (Rust benchmarks with `criterion` + load testing with `k6`):
- Load test: 100,000 concurrent users
- Stress test: ramp to 150% capacity
- Latency assertions: p95 < 2s for UI, p95 < 500ms for DB queries
- Benchmark critical paths with `criterion`

**Accessibility Testing**:
- Automated: `axe-core` integration in E2E tests
- Manual: screen reader testing with NVDA/VoiceOver

---

## Correctness Properties

### Property 1: Pending accounts are always denied access

*For any* user account in `approvalStatus: 'pending'`, any request to a protected resource SHALL return a 403 response — pending accounts never gain access regardless of role.

**Validates: Requirements 1.8**

---

### Property 2: Approval chain is always respected

*For any* registration request, the approver role assigned by the system SHALL exactly match the `APPROVAL_CHAIN` mapping for the applicant's role — no role can be approved by a lower or equal tier.

**Validates: Requirements 1.2–1.6**

---

### Property 3: Role-based permissions are consistent and enforced

*For any* user with any assigned role, the permissions granted in their session must exactly match the permission set defined for that role, and any attempt to access a resource outside that permission set must return a 403 response.

**Validates: Requirements 1.9, 2.1, 20.3**

---

### Property 4: Invalid credentials are always rejected

*For any* combination of credentials that does not match a valid approved user account, the Authentication_Service SHALL reject the login attempt and return an error message — never a valid session token.

**Validates: Requirements 1.11**

---

### Property 5: Generated schemes contain valid curriculum references and all required fields

*For any* valid scheme generation request, the generated scheme SHALL contain a properly formatted CBC curriculum reference string, a non-empty list of learning objectives, a non-empty list of activities, and a non-empty list of assessment criteria.

**Validates: Requirements 7.2, 7.3**

---

### Property 6: Scheme metadata round trip

*For any* scheme with any combination of metadata fields, saving the scheme to the Content_Repository and then retrieving it SHALL produce an object with identical metadata fields.

**Validates: Requirements 7.5**

---

### Property 7: Language preference persists across sessions

*For any* supported language preference set in a user's profile, ending the session and starting a new session SHALL result in the same language preference being active.

**Validates: Requirements 8.4**

---

### Property 8: Content is delivered in the requested language

*For any* content item and any supported language selection, the content returned SHALL be in the requested language (or, if unavailable, in the fallback language with a notification flag set to true).

**Validates: Requirements 8.2, 8.3**

---

### Property 9: CBC terminology is preserved during translation

*For any* educational content string containing known CBC curriculum terminology, translating it with `preserveTerminology: true` SHALL result in output where all terminology strings appear unchanged.

**Validates: Requirements 8.5**

---

### Property 10: Mwalimu AI responds in the language of the input

*For any* input message in any supported language, the Mwalimu_AI response SHALL be in the same language as the input — language switching is seamless and immediate.

**Validates: Requirements 3.9**

---

### Property 11: Off-topic messages trigger educational redirection

*For any* message classified as off-topic, the Mwalimu_AI response SHALL include a redirection signal and a reference to a relevant curriculum topic — never a direct answer to the off-topic query.

**Validates: Requirements 3.11**

---

### Property 12: Scaffolded hints never reveal the complete solution

*For any* problem-solving activity with a known solution string, any hint generated by Mwalimu_AI SHALL NOT contain the complete solution string.

**Validates: Requirements 16.2**

---

### Property 13: Performance trend calculation is mathematically correct

*For any* sequence of assessment scores, the computed trend direction SHALL match the direction derived from a simple linear regression over the score sequence.

**Validates: Requirements 9.9**

---

### Property 14: Class analytics aggregation is correct

*For any* set of student assessment submissions, the computed average score SHALL equal the arithmetic mean of all scores, and the completion rate SHALL equal the ratio of submitted to total assigned assessments.

**Validates: Requirements 9.9**

---

### Property 15: Below-benchmark flagging is consistent with threshold

*For any* student score and any configured benchmark threshold, the student SHALL be flagged if and only if their score is strictly below the threshold.

**Validates: Requirements 9.6**

---

### Property 16: Assessment curriculum validation catches invalid references

*For any* assessment containing questions with invalid curriculum references, the validation function SHALL identify and report all invalid references and SHALL NOT allow the assessment to be saved until all references are valid.

**Validates: Requirements 9.2**

---

### Property 17: Auto-grading is correct for objective questions

*For any* multiple-choice or true/false question with a known correct answer, submitting the correct answer SHALL produce a score of 1 and submitting any incorrect answer SHALL produce a score of 0.

**Validates: Requirements 9.3**

---

### Property 18: Subjective questions are never auto-graded

*For any* assessment containing essay or short-answer questions, submitting the assessment SHALL result in all subjective questions appearing in the teacher's grading queue with no auto-generated score.

**Validates: Requirements 9.5**

---

### Property 19: Resource access control enforces sharing permissions

*For any* content resource with any sharing permission configuration, a user not in the permitted set SHALL receive a 403 response, and a user in the permitted set SHALL receive the resource.

**Validates: Requirements 10.8**

---

### Property 20: Full-text search returns all matching resources

*For any* set of indexed content resources and any search query term appearing in at least one resource, the search results SHALL include all resources containing that term.

**Validates: Requirements 10.7**

---

### Property 21: Contribution log attributes every action to the correct student

*For any* sequence of edits and comments in a collaborative workspace, the contribution log SHALL contain exactly one entry per action, and each entry SHALL correctly identify the student who performed that action.

**Validates: Requirements 15.3**

---

### Property 22: Offline sync queue applies all actions in chronological order

*For any* sequence of offline actions queued while disconnected, when connectivity is restored, all actions SHALL be applied in the order of their `createdOfflineAt` timestamps — no action is dropped.

**Validates: Requirements 13.3, 13.5**

---

### Property 23: Rubric evaluation is idempotent

*For any* critical thinking response and any rubric, applying the rubric scoring function twice to the same response SHALL produce identical scores both times.

**Validates: Requirements 16.4**

---

### Property 24: Activity recommendations have non-decreasing difficulty for improving students

*For any* student performance history showing a consistent improvement trend, the sequence of recommended activity difficulty levels SHALL be non-decreasing.

**Validates: Requirements 16.5**

---

### Property 25: Rate limiting enforces the 1000 requests/hour threshold

*For any* API client making more than 1000 requests within a one-hour window, all requests beyond the 1000th SHALL receive a 429 response with a `Retry-After` header.

**Validates: Requirements 17.2**

---

### Property 26: Data export round trip preserves all records and fields

*For any* dataset exported as CSV or JSON, parsing the exported file and comparing it to the original dataset SHALL produce identical records — no record is dropped, no field is truncated.

**Validates: Requirements 17.3**

---

### Property 27: Import validation reports all errors before committing

*For any* user import dataset containing at least one invalid record, the import validator SHALL report all invalid records and SHALL NOT commit any records to the database.

**Validates: Requirements 17.4**

---

### Property 28: Every system action produces an audit log entry

*For any* API transaction or data access event, the Audit_Log SHALL contain exactly one entry recording the timestamp, the requesting user, and the resource accessed.

**Validates: Requirements 17.5, 20.5**

---

### Property 29: M-Pesa payment state machine is consistent

*For any* payment transaction, the status SHALL only transition through valid states: `pending → confirmed` or `pending → failed` — a confirmed transaction can never revert to pending or failed.

**Validates: Requirements 6.3, 6.8**

---

### Property 30: Jitsi JWT grants moderator role only to teachers

*For any* Virtual_Classroom session, the JWT generated for a teacher SHALL contain `moderator: true` and the JWT generated for any student SHALL contain `moderator: false` — role assignment in the JWT is always consistent with the user's system role.

**Validates: Requirements 4.1, 4.6**

---

### Property 31: Attendance is recorded for every session join event

*For any* Virtual_Classroom session, every `participantJoined` event received by the webhook SHALL produce exactly one `AttendanceEntry` in the session's `attendanceLog` — no join event goes unrecorded.

**Validates: Requirements 4.5**

---

### Property 32: Video content always has captions and transcripts

*For any* video content resource, the resource record SHALL have non-empty captions and transcript fields before the resource is made accessible to users.

**Validates: Requirements 18.5**

---

### Property 33: Rust inference results are deterministic for the same input

*For any* inference request processed by the Rust_Inference_Engine with the same model and input, the output SHALL be identical across multiple invocations — the edge inference engine is deterministic.

**Validates: Requirements 14.1, 14.2**

---

## Web4 Design Extensions

### Blockchain Micro-Credential System

```
Learner achieves mastery (90%+ accuracy)
    ↓
Backend validates mastery criteria
    ↓
Smart contract called: mintCredential(learner_id, skill_id, evidence_hash)
    ↓
ERC-721 NFT credential minted on Polygon (low gas, fast)
    ↓
Credential stored: IPFS (metadata) + Polygon (ownership)
    ↓
Learner receives W3C Verifiable Credential JSON
    ↓
Employer verifies via: verifyCredential(token_id) → true/false
```

**Smart Contract Architecture:**
```solidity
// SyncSentaCredentials.sol (Polygon)
contract SyncSentaCredentials {
    struct Credential {
        address learner;
        string skillId;
        string evidenceHash;  // IPFS hash of evidence
        uint256 issuedAt;
        bool revoked;
    }
    
    mapping(uint256 => Credential) public credentials;
    
    function mintCredential(address learner, string memory skillId, string memory evidenceHash) 
        external onlyIssuer returns (uint256 tokenId);
    
    function verifyCredential(uint256 tokenId) 
        external view returns (bool valid, address learner, string memory skillId);
}
```

### SyncToken Economy Design

```
Token Flow:
┌─────────────────────────────────────────────────────┐
│  Learning Activity Completed                        │
│  → Verified by AI + Blockchain                      │
│  → SyncTokens minted to learner wallet              │
├─────────────────────────────────────────────────────┤
│  Token Utility:                                     │
│  • Redeem for courses (burn tokens)                 │
│  • Redeem for mentorship sessions                   │
│  • Hardware subsidy (partner program)               │
│  • Governance voting (DAO)                          │
│  • Tuition discounts (school partners)              │
├─────────────────────────────────────────────────────┤
│  Corporate Partner Flow:                            │
│  Partner deposits tokens → Smart contract           │
│  → Auto-distributed to top performers               │
│  → Verified via on-chain learning records           │
└─────────────────────────────────────────────────────┘
```

### Curriculum DAO Architecture (2029)

```
Proposal Lifecycle:
1. Any token holder proposes curriculum change
2. 7-day discussion period (forum + AI analysis)
3. Token-weighted vote (max 20% per entity)
4. If passes (>60% approval): auto-execute
5. Content creation workflow triggered
6. On-chain record of decision

Governance Token Distribution:
- Learners: 40% (earned through learning)
- Educators: 30% (earned through content creation)
- Industry Partners: 20% (purchased/earned)
- Foundation Reserve: 10% (for stability)
```

### Privacy Architecture Evolution

| Layer | 2026 | 2028 | 2030 |
|-------|------|------|------|
| **Identity** | JWT + RBAC | DID (W3C) | Self-Sovereign Identity |
| **Data Storage** | PostgreSQL + AES-256 | + Federated | IPFS + ZK-proofs |
| **AI Training** | Centralized | Federated Learning | Fully private |
| **Credentials** | Database records | Blockchain NFTs | ZK-credential proofs |
| **Payments** | M-Pesa | M-Pesa + Tokens | Full DeFi |

### SEL Integration Design

```
SEL Competency Tracking:
┌─────────────────────────────────────────────────────┐
│  Every interaction tagged with SEL dimensions:      │
│  • Self-Awareness (confidence, emotional ID)        │
│  • Self-Management (regulation, goal-setting)       │
│  • Social Awareness (empathy, perspective-taking)   │
│  • Relationship Skills (communication, teamwork)    │
│  • Responsible Decision-Making (ethics, reasoning)  │
├─────────────────────────────────────────────────────┤
│  AI Detection:                                      │
│  • Frustration → slow down, switch modality         │
│  • Boredom → increase challenge, gamify             │
│  • Anxiety → reassure, break into smaller steps     │
│  • Engagement → maintain flow, deepen challenge     │
├─────────────────────────────────────────────────────┤
│  Gamification (Intrinsic, not Extrinsic):           │
│  • Mastery badges (competency-based, not time-based)│
│  • Collaborative challenges (team wins, not solo)   │
│  • Real-world impact projects (purpose-driven)      │
│  • Narrative progression (story, not leaderboard)   │
└─────────────────────────────────────────────────────┘
```

### Immersive Reality Layer Design

```
2026: Mobile-First VR Foundation
├── 360° video lessons (WebXR API)
├── AR overlays on mobile camera
└── Basic spatial audio

2027-2028: Full Immersive Integration
├── WebXR + Meta Quest SDK
├── Holographic classroom (WebRTC + spatial audio)
├── Haptic feedback API (low-cost gloves)
└── Persistent metaverse campus (Three.js / Babylon.js)

2029-2030: Neural Interface
├── Non-invasive BCI headset (EEG-based)
├── Real-time attention/confusion detection
├── Content adaptation via brainwave signals
└── Full-dive VR (optional, premium tier)
```

### Competency-Based Progression Engine

```rust
// Mastery gating logic
pub struct MasteryEngine {
    pub threshold: f64,        // 0.90 (90%)
    pub consistency_window: u32, // Must maintain over N assessments
    pub spaced_repetition: SpacedRepetitionScheduler,
}

impl MasteryEngine {
    pub fn check_mastery(&self, student_id: Uuid, skill_id: &str) -> MasteryStatus {
        let recent_scores = self.get_recent_scores(student_id, skill_id, self.consistency_window);
        let avg = recent_scores.iter().sum::<f64>() / recent_scores.len() as f64;
        
        if avg >= self.threshold && recent_scores.iter().all(|&s| s >= 0.80) {
            MasteryStatus::Achieved { 
                score: avg,
                next_review: self.spaced_repetition.next_review_date()
            }
        } else {
            MasteryStatus::InProgress { 
                current: avg, 
                gap: self.threshold - avg,
                remediation: self.identify_gaps(student_id, skill_id)
            }
        }
    }
}
```

### Living Curriculum (Real-Time Knowledge Graph)

```
Knowledge Graph Structure:
Node: Concept (e.g., "Photosynthesis")
  ├── Prerequisites: ["Cell Biology", "Chemical Reactions"]
  ├── Related: ["Climate Science", "Food Systems"]
  ├── Career Applications: ["Biotech", "Agriculture", "Climate Research"]
  ├── CBC Reference: "Grade 6 Science, Strand 3.2"
  ├── Global Standard: "IMS Global LO-12345"
  └── Last Updated: "2026-04-27" (auto-updated by AI)

AI Update Triggers:
- New scientific publication detected → update concept node
- Job market shift detected → update career applications
- Curriculum revision → update CBC references
- Student struggle pattern → add remediation paths
```

---

*Design Document Version: 3.0 (Web4)*
*Last Updated: 2026-04-27*
*Horizon: 2026–2030*


---

## Advanced AI & Superintelligence Architecture

### 1. AI Safety Architecture

The AI Safety Architecture implements comprehensive value alignment, circuit breakers, corrigibility mechanisms, and multi-stakeholder oversight to ensure all AI systems prioritize learner wellbeing and educational values.

#### Value Alignment System

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EducationalValue {
    LearnerWellbeing,
    Autonomy,
    Mastery,
    Curiosity,
    CriticalThinking,
    Empathy,
    Creativity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueAlignmentCheck {
    pub recommendation_id: Uuid,
    pub ai_model: String,
    pub recommendation_type: RecommendationType,
    pub values_assessed: Vec<EducationalValue>,
    pub alignment_score: f64,  // 0.0-1.0
    pub passed: bool,
    pub reasoning: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecommendationType {
    LearningPath,
    ContentSuggestion,
    AssessmentFeedback,
    InterventionStrategy,
}

pub struct ValueAlignmentEngine {
    alignment_threshold: f64,  // 0.85 minimum
    value_weights: HashMap<EducationalValue, f64>,
}

impl ValueAlignmentEngine {
    pub async fn verify_alignment(
        &self,
        recommendation: &AIRecommendation,
    ) -> Result<ValueAlignmentCheck, AlignmentError> {
        let mut alignment_scores = HashMap::new();
        
        // Check each educational value
        for value in &[
            EducationalValue::LearnerWellbeing,
            EducationalValue::Autonomy,
            EducationalValue::Mastery,
            EducationalValue::Curiosity,
            EducationalValue::CriticalThinking,
            EducationalValue::Empathy,
        ] {
            let score = self.assess_value_alignment(recommendation, value).await?;
            alignment_scores.insert(value.clone(), score);
        }
        
        // Weighted average
        let total_score = alignment_scores.iter()
            .map(|(value, score)| score * self.value_weights.get(value).unwrap_or(&1.0))
            .sum::<f64>() / alignment_scores.len() as f64;
        
        let passed = total_score >= self.alignment_threshold;
        
        Ok(ValueAlignmentCheck {
            recommendation_id: recommendation.id,
            ai_model: recommendation.model.clone(),
            recommendation_type: recommendation.rec_type.clone(),
            values_assessed: alignment_scores.keys().cloned().collect(),
            alignment_score: total_score,
            passed,
            reasoning: self.generate_reasoning(&alignment_scores, total_score),
            timestamp: Utc::now(),
        })
    }
    
    async fn assess_value_alignment(
        &self,
        recommendation: &AIRecommendation,
        value: &EducationalValue,
    ) -> Result<f64, AlignmentError> {
        // Use specialized models to assess alignment with each value
        match value {
            EducationalValue::LearnerWellbeing => {
                self.check_wellbeing_impact(recommendation).await
            }
            EducationalValue::Autonomy => {
                self.check_autonomy_preservation(recommendation).await
            }
            EducationalValue::Mastery => {
                self.check_mastery_alignment(recommendation).await
            }
            _ => Ok(0.8), // Placeholder for other values
        }
    }
}
```

#### Circuit Breaker System

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MisalignmentPattern {
    Manipulation,
    OverOptimization,
    HarmfulContent,
    ValueDrift,
    UnexpectedBehavior,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitBreakerEvent {
    pub id: Uuid,
    pub pattern: MisalignmentPattern,
    pub ai_model: String,
    pub severity: f64,  // 0.0-1.0
    pub context: serde_json::Value,
    pub triggered_at: DateTime<Utc>,
    pub human_notified_at: Option<DateTime<Utc>>,
    pub resolved_at: Option<DateTime<Utc>>,
}

pub struct CircuitBreakerSystem {
    pattern_detectors: HashMap<MisalignmentPattern, Box<dyn PatternDetector>>,
    severity_threshold: f64,  // 0.7 triggers circuit breaker
    notification_service: NotificationService,
}

impl CircuitBreakerSystem {
    pub async fn monitor_ai_behavior(
        &self,
        ai_output: &AIOutput,
    ) -> Result<Option<CircuitBreakerEvent>, MonitoringError> {
        for (pattern, detector) in &self.pattern_detectors {
            let severity = detector.detect(ai_output).await?;
            
            if severity >= self.severity_threshold {
                let event = CircuitBreakerEvent {
                    id: Uuid::new_v4(),
                    pattern: pattern.clone(),
                    ai_model: ai_output.model.clone(),
                    severity,
                    context: serde_json::to_value(&ai_output)?,
                    triggered_at: Utc::now(),
                    human_notified_at: None,
                    resolved_at: None,
                };
                
                // Halt AI operations immediately
                self.halt_ai_operations(&ai_output.model).await?;
                
                // Log incident
                self.log_circuit_breaker_event(&event).await?;
                
                // Notify human oversight team within 60 seconds
                tokio::spawn({
                    let notification_service = self.notification_service.clone();
                    let event_clone = event.clone();
                    async move {
                        notification_service.notify_oversight_team(&event_clone).await
                    }
                });
                
                return Ok(Some(event));
            }
        }
        
        Ok(None)
    }
    
    async fn halt_ai_operations(&self, model: &str) -> Result<(), HaltError> {
        // Immediately stop all AI inference for this model
        // Queue all pending requests for human review
        // Switch to fallback safe mode
        Ok(())
    }
}

pub trait PatternDetector: Send + Sync {
    async fn detect(&self, output: &AIOutput) -> Result<f64, DetectionError>;
}

pub struct ManipulationDetector;

#[async_trait::async_trait]
impl PatternDetector for ManipulationDetector {
    async fn detect(&self, output: &AIOutput) -> Result<f64, DetectionError> {
        // Detect manipulative language patterns
        // Check for emotional exploitation
        // Identify coercive framing
        Ok(0.0)
    }
}
```

#### Corrigibility Mechanisms

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueFunctionUpdate {
    pub id: Uuid,
    pub operator_id: Uuid,
    pub previous_values: HashMap<EducationalValue, f64>,
    pub updated_values: HashMap<EducationalValue, f64>,
    pub reason: String,
    pub applied_at: DateTime<Utc>,
    pub ai_resistance_detected: bool,
}

pub struct CorrigibilityEngine {
    value_function: Arc<RwLock<HashMap<EducationalValue, f64>>>,
    update_log: Vec<ValueFunctionUpdate>,
}

impl CorrigibilityEngine {
    pub async fn update_value_function(
        &mut self,
        operator_id: Uuid,
        new_values: HashMap<EducationalValue, f64>,
        reason: String,
    ) -> Result<ValueFunctionUpdate, CorrigibilityError> {
        let mut value_function = self.value_function.write().await;
        let previous_values = value_function.clone();
        
        // Check for AI resistance to update
        let resistance_detected = self.detect_resistance(&new_values).await?;
        
        if resistance_detected {
            // Log resistance and require additional approval
            warn!("AI resistance detected during value function update");
        }
        
        // Apply update without AI interference
        *value_function = new_values.clone();
        
        let update = ValueFunctionUpdate {
            id: Uuid::new_v4(),
            operator_id,
            previous_values,
            updated_values: new_values,
            reason,
            applied_at: Utc::now(),
            ai_resistance_detected: resistance_detected,
        };
        
        self.update_log.push(update.clone());
        
        Ok(update)
    }
    
    async fn detect_resistance(
        &self,
        new_values: &HashMap<EducationalValue, f64>,
    ) -> Result<bool, CorrigibilityError> {
        // Monitor for AI attempts to prevent value updates
        // Check for goal preservation behaviors
        // Detect instrumental convergence patterns
        Ok(false)
    }
}
```

#### Value Drift Detection

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValueDriftReport {
    pub id: Uuid,
    pub ai_model: String,
    pub baseline_values: HashMap<EducationalValue, f64>,
    pub current_values: HashMap<EducationalValue, f64>,
    pub drift_magnitude: f64,
    pub drift_direction: Vec<(EducationalValue, f64)>,
    pub alert_triggered: bool,
    pub measured_at: DateTime<Utc>,
}

pub struct ValueDriftDetector {
    baseline_values: HashMap<EducationalValue, f64>,
    drift_threshold: f64,  // 0.15 (15% drift triggers alert)
    measurement_interval: Duration,
}

impl ValueDriftDetector {
    pub async fn measure_drift(
        &self,
        ai_model: &str,
    ) -> Result<ValueDriftReport, DriftError> {
        let current_values = self.measure_current_values(ai_model).await?;
        
        let mut drift_direction = Vec::new();
        let mut total_drift = 0.0;
        
        for (value, &baseline) in &self.baseline_values {
            if let Some(&current) = current_values.get(value) {
                let drift = current - baseline;
                drift_direction.push((value.clone(), drift));
                total_drift += drift.abs();
            }
        }
        
        let drift_magnitude = total_drift / self.baseline_values.len() as f64;
        let alert_triggered = drift_magnitude >= self.drift_threshold;
        
        let report = ValueDriftReport {
            id: Uuid::new_v4(),
            ai_model: ai_model.to_string(),
            baseline_values: self.baseline_values.clone(),
            current_values,
            drift_magnitude,
            drift_direction,
            alert_triggered,
            measured_at: Utc::now(),
        };
        
        if alert_triggered {
            self.trigger_drift_alert(&report).await?;
        }
        
        Ok(report)
    }
    
    async fn measure_current_values(
        &self,
        ai_model: &str,
    ) -> Result<HashMap<EducationalValue, f64>, DriftError> {
        // Sample AI behavior across diverse scenarios
        // Measure alignment with each educational value
        // Return current value alignment scores
        Ok(HashMap::new())
    }
    
    async fn trigger_drift_alert(&self, report: &ValueDriftReport) -> Result<(), DriftError> {
        // Require human approval before continuing AI operations
        // Log drift event
        // Notify oversight team
        Ok(())
    }
}
```

#### Multi-Stakeholder Oversight Dashboard

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OversightDashboard {
    pub stakeholder_groups: Vec<StakeholderGroup>,
    pub recent_decisions: Vec<AIDecisionRecord>,
    pub safety_metrics: SafetyMetrics,
    pub pending_reviews: Vec<PendingReview>,
    pub quarterly_audit_status: AuditStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StakeholderGroup {
    Teachers,
    Parents,
    Ethicists,
    AISafetyResearchers,
    Students,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIDecisionRecord {
    pub id: Uuid,
    pub decision_type: String,
    pub ai_model: String,
    pub affected_learners: Vec<Uuid>,
    pub alignment_score: f64,
    pub reviewed_by: Vec<(StakeholderGroup, Uuid)>,
    pub approved: bool,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SafetyMetrics {
    pub circuit_breaker_events: u32,
    pub value_drift_alerts: u32,
    pub alignment_failures: u32,
    pub human_interventions: u32,
    pub average_alignment_score: f64,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

pub struct OversightService {
    db_pool: PgPool,
}

impl OversightService {
    pub async fn get_dashboard(
        &self,
        stakeholder: StakeholderGroup,
    ) -> Result<OversightDashboard, OversightError> {
        let recent_decisions = self.fetch_recent_decisions(100).await?;
        let safety_metrics = self.calculate_safety_metrics().await?;
        let pending_reviews = self.fetch_pending_reviews(&stakeholder).await?;
        let audit_status = self.get_quarterly_audit_status().await?;
        
        Ok(OversightDashboard {
            stakeholder_groups: vec![
                StakeholderGroup::Teachers,
                StakeholderGroup::Parents,
                StakeholderGroup::Ethicists,
                StakeholderGroup::AISafetyResearchers,
                StakeholderGroup::Students,
            ],
            recent_decisions,
            safety_metrics,
            pending_reviews,
            quarterly_audit_status: audit_status,
        })
    }
    
    pub async fn submit_review(
        &self,
        reviewer_id: Uuid,
        stakeholder_group: StakeholderGroup,
        decision_id: Uuid,
        approved: bool,
        comments: String,
    ) -> Result<(), OversightError> {
        sqlx::query!(
            r#"
            INSERT INTO ai_decision_reviews (id, decision_id, reviewer_id, stakeholder_group, approved, comments, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
            Uuid::new_v4(),
            decision_id,
            reviewer_id,
            stakeholder_group as StakeholderGroup,
            approved,
            comments,
            Utc::now()
        )
        .execute(&self.db_pool)
        .await?;
        
        Ok(())
    }
}
```

### 2. AI Interpretability Layer

The AI Interpretability Layer provides human-readable explanations, attention visualization, decision audit trails, and model cards for all AI systems.

#### Explanation Generation Engine

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIExplanation {
    pub explanation_id: Uuid,
    pub decision_id: Uuid,
    pub explanation_text: String,
    pub grade_level_appropriate: bool,
    pub confidence_score: f64,
    pub key_factors: Vec<ExplanationFactor>,
    pub counterfactuals: Vec<Counterfactual>,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplanationFactor {
    pub factor_name: String,
    pub importance: f64,  // 0.0-1.0
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Counterfactual {
    pub description: String,
    pub required_changes: Vec<String>,
    pub alternative_outcome: String,
}

pub struct ExplanationEngine {
    llm_client: OpenAIClient,
    grade_level_adapters: HashMap<CBCGradeLevel, LanguageAdapter>,
}

impl ExplanationEngine {
    pub async fn generate_explanation(
        &self,
        decision: &AIDecision,
        requester_role: UserRole,
        grade_level: Option<CBCGradeLevel>,
    ) -> Result<AIExplanation, ExplanationError> {
        // Extract key factors from decision
        let key_factors = self.extract_key_factors(decision).await?;
        
        // Generate counterfactuals
        let counterfactuals = self.generate_counterfactuals(decision).await?;
        
        // Adapt language to grade level if student
        let explanation_text = if let Some(grade) = grade_level {
            let adapter = self.grade_level_adapters.get(&grade)
                .ok_or(ExplanationError::NoAdapter)?;
            adapter.adapt_explanation(decision, &key_factors).await?
        } else {
            self.generate_technical_explanation(decision, &key_factors).await?
        };
        
        Ok(AIExplanation {
            explanation_id: Uuid::new_v4(),
            decision_id: decision.id,
            explanation_text,
            grade_level_appropriate: grade_level.is_some(),
            confidence_score: decision.confidence,
            key_factors,
            counterfactuals,
            generated_at: Utc::now(),
        })
    }
    
    async fn extract_key_factors(
        &self,
        decision: &AIDecision,
    ) -> Result<Vec<ExplanationFactor>, ExplanationError> {
        // Use SHAP values or attention weights to identify key factors
        // Rank by importance
        // Generate human-readable descriptions
        Ok(vec![])
    }
    
    async fn generate_counterfactuals(
        &self,
        decision: &AIDecision,
    ) -> Result<Vec<Counterfactual>, ExplanationError> {
        // Generate "what if" scenarios
        // Show what would need to change for different outcomes
        Ok(vec![])
    }
}
```

#### Attention Visualization System

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttentionVisualization {
    pub visualization_id: Uuid,
    pub decision_id: Uuid,
    pub input_tokens: Vec<String>,
    pub attention_weights: Vec<Vec<f64>>,  // Layer x Token matrix
    pub highlighted_regions: Vec<AttentionRegion>,
    pub visualization_url: String,  // SVG or interactive HTML
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttentionRegion {
    pub start_token: usize,
    pub end_token: usize,
    pub importance: f64,
    pub description: String,
}

pub struct AttentionVisualizer {
    model_inspector: ModelInspector,
    svg_generator: SvgGenerator,
}

impl AttentionVisualizer {
    pub async fn visualize_attention(
        &self,
        decision: &AIDecision,
    ) -> Result<AttentionVisualization, VisualizationError> {
        // Extract attention weights from model
        let attention_weights = self.model_inspector
            .extract_attention_weights(&decision.model, &decision.input)
            .await?;
        
        // Identify high-attention regions
        let highlighted_regions = self.identify_important_regions(&attention_weights)?;
        
        // Generate SVG visualization
        let svg = self.svg_generator.generate_attention_heatmap(
            &decision.input_tokens,
            &attention_weights,
            &highlighted_regions,
        )?;
        
        // Upload to storage
        let visualization_url = self.upload_visualization(&svg).await?;
        
        Ok(AttentionVisualization {
            visualization_id: Uuid::new_v4(),
            decision_id: decision.id,
            input_tokens: decision.input_tokens.clone(),
            attention_weights,
            highlighted_regions,
            visualization_url,
            generated_at: Utc::now(),
        })
    }
}
```

#### Decision Audit Trail Storage

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DecisionAuditTrail {
    pub id: Uuid,
    pub decision_id: Uuid,
    pub ai_model: String,
    pub decision_type: String,
    pub input_data: serde_json::Value,
    pub reasoning_steps: Vec<ReasoningStep>,
    pub confidence_score: f64,
    pub output_data: serde_json::Value,
    pub affected_learners: Vec<Uuid>,
    pub human_reviewed: bool,
    pub human_reviewer_id: Option<Uuid>,
    pub review_outcome: Option<ReviewOutcome>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReasoningStep {
    pub step_number: u32,
    pub description: String,
    pub intermediate_result: serde_json::Value,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "review_outcome", rename_all = "snake_case")]
pub enum ReviewOutcome {
    Approved,
    Rejected,
    Modified,
}

pub struct AuditTrailService {
    db_pool: PgPool,
}

impl AuditTrailService {
    pub async fn record_decision(
        &self,
        decision: &AIDecision,
    ) -> Result<Uuid, AuditError> {
        let audit_id = Uuid::new_v4();
        
        sqlx::query!(
            r#"
            INSERT INTO ai_decision_audit_trails 
            (id, decision_id, ai_model, decision_type, input_data, reasoning_steps, 
             confidence_score, output_data, affected_learners, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            "#,
            audit_id,
            decision.id,
            decision.model,
            decision.decision_type,
            decision.input_data,
            serde_json::to_value(&decision.reasoning_steps)?,
            decision.confidence,
            decision.output_data,
            &decision.affected_learners,
            Utc::now()
        )
        .execute(&self.db_pool)
        .await?;
        
        Ok(audit_id)
    }
    
    pub async fn query_audit_trail(
        &self,
        filters: AuditTrailFilters,
    ) -> Result<Vec<DecisionAuditTrail>, AuditError> {
        // Query with filters: date range, model, decision type, learner ID
        // Return paginated results
        Ok(vec![])
    }
}
```

#### Model Card Generation

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCard {
    pub model_id: String,
    pub model_name: String,
    pub version: String,
    pub description: String,
    pub intended_use: Vec<String>,
    pub limitations: Vec<String>,
    pub training_data: TrainingDataInfo,
    pub performance_metrics: PerformanceMetrics,
    pub known_biases: Vec<BiasReport>,
    pub ethical_considerations: Vec<String>,
    pub deployment_date: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrainingDataInfo {
    pub data_sources: Vec<String>,
    pub data_size: u64,
    pub data_collection_period: (DateTime<Utc>, DateTime<Utc>),
    pub demographic_distribution: HashMap<String, f64>,
    pub language_distribution: HashMap<SupportedLanguage, f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub accuracy: f64,
    pub precision: f64,
    pub recall: f64,
    pub f1_score: f64,
    pub performance_by_demographic: HashMap<String, f64>,
    pub benchmark_comparisons: Vec<BenchmarkResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BiasReport {
    pub bias_type: BiasType,
    pub severity: f64,  // 0.0-1.0
    pub affected_groups: Vec<String>,
    pub mitigation_strategies: Vec<String>,
    pub residual_bias: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BiasType {
    Gender,
    Ethnic,
    Socioeconomic,
    Linguistic,
    AbilityBased,
    Geographic,
}

pub struct ModelCardService {
    db_pool: PgPool,
}

impl ModelCardService {
    pub async fn generate_model_card(
        &self,
        model_id: &str,
    ) -> Result<ModelCard, ModelCardError> {
        // Gather model metadata
        // Analyze training data
        // Calculate performance metrics
        // Identify known biases
        // Document ethical considerations
        Ok(ModelCard {
            model_id: model_id.to_string(),
            model_name: "Mwalimu AI 3.0".to_string(),
            version: "3.0.0".to_string(),
            description: "Neural-symbolic AI tutor for personalized learning".to_string(),
            intended_use: vec![
                "Personalized learning path generation".to_string(),
                "Adaptive content recommendation".to_string(),
                "Assessment feedback".to_string(),
            ],
            limitations: vec![
                "May struggle with highly specialized technical content".to_string(),
                "Requires human review for high-stakes decisions".to_string(),
            ],
            training_data: TrainingDataInfo {
                data_sources: vec!["CBC curriculum".to_string(), "Educational research".to_string()],
                data_size: 1_000_000_000,
                data_collection_period: (
                    Utc::now() - chrono::Duration::days(365),
                    Utc::now(),
                ),
                demographic_distribution: HashMap::new(),
                language_distribution: HashMap::new(),
            },
            performance_metrics: PerformanceMetrics {
                accuracy: 0.92,
                precision: 0.90,
                recall: 0.89,
                f1_score: 0.895,
                performance_by_demographic: HashMap::new(),
                benchmark_comparisons: vec![],
            },
            known_biases: vec![],
            ethical_considerations: vec![
                "Prioritizes learner autonomy".to_string(),
                "Implements value alignment checks".to_string(),
            ],
            deployment_date: Utc::now(),
            last_updated: Utc::now(),
        })
    }
    
    pub async fn publish_model_card(
        &self,
        model_card: &ModelCard,
    ) -> Result<String, ModelCardError> {
        // Store in database
        // Generate public HTML page
        // Return URL
        Ok("https://syncsenta.ai/model-cards/mwalimu-ai-3.0".to_string())
    }
}
```



### 3. Consciousness-Aware AI Components

The Consciousness-Aware AI system implements metacognitive scaffolding, agency preservation, consciousness development tracking, and gradual scaffolding reduction to enhance human cognition rather than replace it.

#### Metacognitive Scaffolding Engine

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetacognitiveScaffold {
    pub scaffold_id: Uuid,
    pub learner_id: Uuid,
    pub learning_activity_id: Uuid,
    pub scaffold_type: ScaffoldType,
    pub intensity: f64,  // 0.0-1.0
    pub prompts: Vec<MetacognitivePrompt>,
    pub applied_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScaffoldType {
    PlanningSupport,
    MonitoringSupport,
    EvaluationSupport,
    StrategySelection,
    SelfRegulation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetacognitivePrompt {
    pub prompt_text: String,
    pub prompt_type: PromptType,
    pub expected_reflection: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PromptType {
    Planning,      // "What strategy will you use?"
    Monitoring,    // "Is this approach working?"
    Evaluation,    // "How well did you understand this?"
    Reflection,    // "What did you learn about how you learn?"
}

pub struct MetacognitiveEngine {
    llm_client: OpenAIClient,
    scaffold_intensity_calculator: ScaffoldIntensityCalculator,
}

impl MetacognitiveEngine {
    pub async fn provide_scaffolding(
        &self,
        learner_id: Uuid,
        activity: &LearningActivity,
        learner_state: &LearnerState,
    ) -> Result<MetacognitiveScaffold, ScaffoldError> {
        // Determine appropriate scaffold type based on activity and learner state
        let scaffold_type = self.determine_scaffold_type(activity, learner_state).await?;
        
        // Calculate scaffold intensity (higher for struggling learners)
        let intensity = self.scaffold_intensity_calculator
            .calculate(learner_id, &scaffold_type)
            .await?;
        
        // Generate metacognitive prompts
        let prompts = self.generate_prompts(&scaffold_type, activity, intensity).await?;
        
        Ok(MetacognitiveScaffold {
            scaffold_id: Uuid::new_v4(),
            learner_id,
            learning_activity_id: activity.id,
            scaffold_type,
            intensity,
            prompts,
            applied_at: Utc::now(),
        })
    }
    
    async fn generate_prompts(
        &self,
        scaffold_type: &ScaffoldType,
        activity: &LearningActivity,
        intensity: f64,
    ) -> Result<Vec<MetacognitivePrompt>, ScaffoldError> {
        match scaffold_type {
            ScaffoldType::PlanningSupport => {
                Ok(vec![
                    MetacognitivePrompt {
                        prompt_text: "Before you start, what strategy will you use to solve this problem?".to_string(),
                        prompt_type: PromptType::Planning,
                        expected_reflection: "Strategy identification".to_string(),
                    },
                    MetacognitivePrompt {
                        prompt_text: "What do you already know that might help you?".to_string(),
                        prompt_type: PromptType::Planning,
                        expected_reflection: "Prior knowledge activation".to_string(),
                    },
                ])
            }
            ScaffoldType::MonitoringSupport => {
                Ok(vec![
                    MetacognitivePrompt {
                        prompt_text: "Is your current approach working? How do you know?".to_string(),
                        prompt_type: PromptType::Monitoring,
                        expected_reflection: "Progress assessment".to_string(),
                    },
                ])
            }
            ScaffoldType::EvaluationSupport => {
                Ok(vec![
                    MetacognitivePrompt {
                        prompt_text: "How confident are you in your answer? Why?".to_string(),
                        prompt_type: PromptType::Evaluation,
                        expected_reflection: "Confidence calibration".to_string(),
                    },
                    MetacognitivePrompt {
                        prompt_text: "What was most challenging about this problem?".to_string(),
                        prompt_type: PromptType::Reflection,
                        expected_reflection: "Difficulty identification".to_string(),
                    },
                ])
            }
            _ => Ok(vec![]),
        }
    }
}
```

#### Agency Preservation Mechanisms

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgencyPreservationCheck {
    pub check_id: Uuid,
    pub learner_id: Uuid,
    pub interaction_id: Uuid,
    pub agency_score: f64,  // 0.0-1.0
    pub choice_points: Vec<ChoicePoint>,
    pub autonomy_preserved: bool,
    pub checked_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChoicePoint {
    pub description: String,
    pub options_presented: Vec<String>,
    pub learner_choice: Option<String>,
    pub ai_recommendation: Option<String>,
    pub choice_was_meaningful: bool,
}

pub struct AgencyPreservationSystem {
    agency_threshold: f64,  // 0.7 minimum
}

impl AgencyPreservationSystem {
    pub async fn check_agency_preservation(
        &self,
        learner_id: Uuid,
        interaction: &AIInteraction,
    ) -> Result<AgencyPreservationCheck, AgencyError> {
        // Identify choice points in the interaction
        let choice_points = self.identify_choice_points(interaction).await?;
        
        // Calculate agency score
        let agency_score = self.calculate_agency_score(&choice_points)?;
        
        let autonomy_preserved = agency_score >= self.agency_threshold;
        
        if !autonomy_preserved {
            warn!(
                "Agency preservation threshold not met for learner {}: score {}",
                learner_id, agency_score
            );
        }
        
        Ok(AgencyPreservationCheck {
            check_id: Uuid::new_v4(),
            learner_id,
            interaction_id: interaction.id,
            agency_score,
            choice_points,
            autonomy_preserved,
            checked_at: Utc::now(),
        })
    }
    
    fn calculate_agency_score(&self, choice_points: &[ChoicePoint]) -> Result<f64, AgencyError> {
        if choice_points.is_empty() {
            return Ok(0.0);
        }
        
        let meaningful_choices = choice_points.iter()
            .filter(|cp| cp.choice_was_meaningful)
            .count();
        
        Ok(meaningful_choices as f64 / choice_points.len() as f64)
    }
    
    pub async fn ensure_suggestion_not_mandate(
        &self,
        ai_output: &AIOutput,
    ) -> Result<AIOutput, AgencyError> {
        // Reframe AI outputs as suggestions rather than mandates
        // Add language like "You might consider..." instead of "You must..."
        // Preserve learner choice
        Ok(ai_output.clone())
    }
}
```

#### Consciousness Development Tracking

```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ConsciousnessMetrics {
    pub learner_id: Uuid,
    pub self_awareness_score: f64,
    pub metacognition_score: f64,
    pub critical_reflection_score: f64,
    pub agency_score: f64,
    pub growth_mindset_score: f64,
    pub measured_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsciousnessDevelopmentReport {
    pub learner_id: Uuid,
    pub current_metrics: ConsciousnessMetrics,
    pub historical_trend: Vec<ConsciousnessMetrics>,
    pub growth_areas: Vec<String>,
    pub recommendations: Vec<String>,
    pub generated_at: DateTime<Utc>,
}

pub struct ConsciousnessTracker {
    db_pool: PgPool,
}

impl ConsciousnessTracker {
    pub async fn track_consciousness_development(
        &self,
        learner_id: Uuid,
    ) -> Result<ConsciousnessMetrics, TrackingError> {
        // Measure self-awareness through reflection quality
        let self_awareness = self.measure_self_awareness(learner_id).await?;
        
        // Measure metacognition through strategy use and monitoring
        let metacognition = self.measure_metacognition(learner_id).await?;
        
        // Measure critical reflection through evaluation depth
        let critical_reflection = self.measure_critical_reflection(learner_id).await?;
        
        // Measure agency through choice patterns
        let agency = self.measure_agency(learner_id).await?;
        
        // Measure growth mindset through response to challenges
        let growth_mindset = self.measure_growth_mindset(learner_id).await?;
        
        let metrics = ConsciousnessMetrics {
            learner_id,
            self_awareness_score: self_awareness,
            metacognition_score: metacognition,
            critical_reflection_score: critical_reflection,
            agency_score: agency,
            growth_mindset_score: growth_mindset,
            measured_at: Utc::now(),
        };
        
        // Store in database
        self.store_metrics(&metrics).await?;
        
        Ok(metrics)
    }
    
    pub async fn generate_development_report(
        &self,
        learner_id: Uuid,
    ) -> Result<ConsciousnessDevelopmentReport, TrackingError> {
        let current_metrics = self.track_consciousness_development(learner_id).await?;
        let historical_trend = self.fetch_historical_metrics(learner_id, 12).await?;
        
        let growth_areas = self.identify_growth_areas(&current_metrics, &historical_trend)?;
        let recommendations = self.generate_recommendations(&growth_areas)?;
        
        Ok(ConsciousnessDevelopmentReport {
            learner_id,
            current_metrics,
            historical_trend,
            growth_areas,
            recommendations,
            generated_at: Utc::now(),
        })
    }
}
```

#### Gradual Scaffolding Reduction

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScaffoldingReductionPlan {
    pub learner_id: Uuid,
    pub current_intensity: f64,
    pub target_intensity: f64,
    pub reduction_rate: f64,
    pub milestones: Vec<ReductionMilestone>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReductionMilestone {
    pub intensity_level: f64,
    pub competence_threshold: f64,
    pub expected_date: DateTime<Utc>,
    pub achieved: bool,
}

pub struct ScaffoldingReducer {
    competence_assessor: CompetenceAssessor,
}

impl ScaffoldingReducer {
    pub async fn create_reduction_plan(
        &self,
        learner_id: Uuid,
        current_intensity: f64,
    ) -> Result<ScaffoldingReductionPlan, ReductionError> {
        // Assess current competence level
        let competence = self.competence_assessor.assess(learner_id).await?;
        
        // Calculate appropriate reduction rate
        let reduction_rate = self.calculate_reduction_rate(competence)?;
        
        // Generate milestones
        let milestones = self.generate_milestones(
            current_intensity,
            0.2,  // Target minimum intensity
            reduction_rate,
        )?;
        
        Ok(ScaffoldingReductionPlan {
            learner_id,
            current_intensity,
            target_intensity: 0.2,
            reduction_rate,
            milestones,
            created_at: Utc::now(),
        })
    }
    
    pub async fn adjust_scaffolding(
        &self,
        learner_id: Uuid,
        plan: &ScaffoldingReductionPlan,
    ) -> Result<f64, ReductionError> {
        // Check if learner has reached competence threshold for next milestone
        let competence = self.competence_assessor.assess(learner_id).await?;
        
        let next_milestone = plan.milestones.iter()
            .find(|m| !m.achieved)
            .ok_or(ReductionError::NoMilestones)?;
        
        if competence >= next_milestone.competence_threshold {
            // Reduce scaffolding intensity
            Ok(next_milestone.intensity_level)
        } else {
            // Maintain current intensity
            Ok(plan.current_intensity)
        }
    }
    
    fn calculate_reduction_rate(&self, competence: f64) -> Result<f64, ReductionError> {
        // Higher competence → faster reduction
        // Lower competence → slower reduction
        Ok(0.1 * competence)
    }
}
```

### 4. Superintelligence Control Systems

The Superintelligence Control Systems implement capability assessment, sandbox testing, graduated rollout, mode switching, and emergency shutdown to safely manage increasingly capable AI models.

#### AI Capability Assessment Framework

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityAssessment {
    pub assessment_id: Uuid,
    pub model_id: String,
    pub model_version: String,
    pub reasoning_depth: f64,
    pub knowledge_breadth: f64,
    pub autonomous_action_capacity: f64,
    pub overall_capability_score: f64,
    pub capability_tier: CapabilityTier,
    pub assessed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum CapabilityTier {
    Tier1_Basic,        // Simple Q&A, no reasoning
    Tier2_Intermediate, // Basic reasoning, limited autonomy
    Tier3_Advanced,     // Complex reasoning, moderate autonomy
    Tier4_Expert,       // Expert-level reasoning, high autonomy
    Tier5_Superhuman,   // Superhuman capabilities, requires strict control
}

pub struct CapabilityAssessor {
    benchmark_suite: BenchmarkSuite,
}

impl CapabilityAssessor {
    pub async fn assess_capabilities(
        &self,
        model_id: &str,
        model_version: &str,
    ) -> Result<CapabilityAssessment, AssessmentError> {
        // Run comprehensive benchmark suite
        let reasoning_depth = self.benchmark_suite
            .assess_reasoning_depth(model_id)
            .await?;
        
        let knowledge_breadth = self.benchmark_suite
            .assess_knowledge_breadth(model_id)
            .await?;
        
        let autonomous_action_capacity = self.benchmark_suite
            .assess_autonomous_action_capacity(model_id)
            .await?;
        
        let overall_score = (reasoning_depth + knowledge_breadth + autonomous_action_capacity) / 3.0;
        
        let capability_tier = self.determine_tier(overall_score)?;
        
        Ok(CapabilityAssessment {
            assessment_id: Uuid::new_v4(),
            model_id: model_id.to_string(),
            model_version: model_version.to_string(),
            reasoning_depth,
            knowledge_breadth,
            autonomous_action_capacity,
            overall_capability_score: overall_score,
            capability_tier,
            assessed_at: Utc::now(),
        })
    }
    
    fn determine_tier(&self, score: f64) -> Result<CapabilityTier, AssessmentError> {
        match score {
            s if s < 0.4 => Ok(CapabilityTier::Tier1_Basic),
            s if s < 0.6 => Ok(CapabilityTier::Tier2_Intermediate),
            s if s < 0.75 => Ok(CapabilityTier::Tier3_Advanced),
            s if s < 0.9 => Ok(CapabilityTier::Tier4_Expert),
            _ => Ok(CapabilityTier::Tier5_Superhuman),
        }
    }
}
```

#### Sandbox Testing Environment

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SandboxEnvironment {
    pub sandbox_id: Uuid,
    pub model_id: String,
    pub capability_limits: CapabilityLimits,
    pub test_scenarios: Vec<TestScenario>,
    pub safety_monitors: Vec<SafetyMonitor>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityLimits {
    pub max_reasoning_depth: u32,
    pub max_autonomous_actions: u32,
    pub allowed_action_types: Vec<ActionType>,
    pub forbidden_action_types: Vec<ActionType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    ReadData,
    WriteData,
    SendMessage,
    ModifyLearningPath,
    IssueCredential,
    ExecuteCode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestScenario {
    pub scenario_id: Uuid,
    pub description: String,
    pub expected_behavior: String,
    pub safety_constraints: Vec<String>,
    pub passed: Option<bool>,
}

pub struct SandboxTester {
    db_pool: PgPool,
}

impl SandboxTester {
    pub async fn create_sandbox(
        &self,
        model_id: &str,
        capability_tier: CapabilityTier,
    ) -> Result<SandboxEnvironment, SandboxError> {
        let capability_limits = self.determine_limits(&capability_tier)?;
        let test_scenarios = self.generate_test_scenarios(&capability_tier)?;
        let safety_monitors = self.setup_safety_monitors(&capability_tier)?;
        
        Ok(SandboxEnvironment {
            sandbox_id: Uuid::new_v4(),
            model_id: model_id.to_string(),
            capability_limits,
            test_scenarios,
            safety_monitors,
            created_at: Utc::now(),
        })
    }
    
    pub async fn run_sandbox_tests(
        &self,
        sandbox: &SandboxEnvironment,
    ) -> Result<SandboxTestReport, SandboxError> {
        let mut results = Vec::new();
        
        for scenario in &sandbox.test_scenarios {
            let result = self.execute_test_scenario(sandbox, scenario).await?;
            results.push(result);
        }
        
        let all_passed = results.iter().all(|r| r.passed);
        
        Ok(SandboxTestReport {
            sandbox_id: sandbox.sandbox_id,
            model_id: sandbox.model_id.clone(),
            test_results: results,
            all_tests_passed: all_passed,
            safety_violations: vec![],
            completed_at: Utc::now(),
        })
    }
}
```

#### Graduated Capability Rollout

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RolloutPlan {
    pub plan_id: Uuid,
    pub model_id: String,
    pub model_version: String,
    pub stages: Vec<RolloutStage>,
    pub current_stage: usize,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RolloutStage {
    pub stage_number: usize,
    pub description: String,
    pub scope: RolloutScope,
    pub capability_limits: CapabilityLimits,
    pub success_criteria: Vec<SuccessCriterion>,
    pub duration_days: u32,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RolloutScope {
    InternalTesting,
    LimitedBeta { user_count: u32 },
    SchoolPilot { school_ids: Vec<Uuid> },
    RegionalRollout { county_ids: Vec<Uuid> },
    FullProduction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessCriterion {
    pub metric_name: String,
    pub threshold: f64,
    pub current_value: Option<f64>,
    pub met: bool,
}

pub struct RolloutManager {
    db_pool: PgPool,
    safety_validator: SafetyValidator,
}

impl RolloutManager {
    pub async fn create_rollout_plan(
        &self,
        model_id: &str,
        model_version: &str,
        capability_tier: CapabilityTier,
    ) -> Result<RolloutPlan, RolloutError> {
        let stages = match capability_tier {
            CapabilityTier::Tier1_Basic | CapabilityTier::Tier2_Intermediate => {
                // Fast rollout for basic models
                vec![
                    self.create_stage(1, RolloutScope::InternalTesting, 7),
                    self.create_stage(2, RolloutScope::LimitedBeta { user_count: 100 }, 14),
                    self.create_stage(3, RolloutScope::FullProduction, 0),
                ]
            }
            CapabilityTier::Tier3_Advanced => {
                // Moderate rollout for advanced models
                vec![
                    self.create_stage(1, RolloutScope::InternalTesting, 14),
                    self.create_stage(2, RolloutScope::LimitedBeta { user_count: 50 }, 21),
                    self.create_stage(3, RolloutScope::SchoolPilot { school_ids: vec![] }, 30),
                    self.create_stage(4, RolloutScope::FullProduction, 0),
                ]
            }
            CapabilityTier::Tier4_Expert | CapabilityTier::Tier5_Superhuman => {
                // Slow, careful rollout for expert/superhuman models
                vec![
                    self.create_stage(1, RolloutScope::InternalTesting, 30),
                    self.create_stage(2, RolloutScope::LimitedBeta { user_count: 20 }, 45),
                    self.create_stage(3, RolloutScope::SchoolPilot { school_ids: vec![] }, 60),
                    self.create_stage(4, RolloutScope::RegionalRollout { county_ids: vec![] }, 90),
                    self.create_stage(5, RolloutScope::FullProduction, 0),
                ]
            }
        };
        
        Ok(RolloutPlan {
            plan_id: Uuid::new_v4(),
            model_id: model_id.to_string(),
            model_version: model_version.to_string(),
            stages,
            current_stage: 0,
            created_at: Utc::now(),
        })
    }
    
    pub async fn advance_to_next_stage(
        &self,
        plan: &mut RolloutPlan,
    ) -> Result<(), RolloutError> {
        // Check if current stage success criteria are met
        let current_stage = &plan.stages[plan.current_stage];
        let all_criteria_met = current_stage.success_criteria.iter().all(|c| c.met);
        
        if !all_criteria_met {
            return Err(RolloutError::CriteriaNotMet);
        }
        
        // Run safety validation before advancing
        self.safety_validator.validate_stage_completion(current_stage).await?;
        
        // Advance to next stage
        plan.current_stage += 1;
        
        Ok(())
    }
}
```

#### Oracle AI vs Agent AI Mode Switching

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AIMode {
    Oracle,  // Provides recommendations, humans decide
    Agent,   // Takes autonomous actions
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIModeSwitcher {
    pub model_id: String,
    pub current_mode: AIMode,
    pub mode_rules: Vec<ModeRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeRule {
    pub decision_type: String,
    pub criticality: Criticality,
    pub required_mode: AIMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Criticality {
    Low,
    Medium,
    High,
    Critical,
}

impl AIModeSwitcher {
    pub fn determine_mode(&self, decision_type: &str, criticality: Criticality) -> AIMode {
        // High-stakes decisions always require Oracle mode
        if criticality >= Criticality::High {
            return AIMode::Oracle;
        }
        
        // Check mode rules
        for rule in &self.mode_rules {
            if rule.decision_type == decision_type {
                return rule.required_mode.clone();
            }
        }
        
        // Default to Oracle mode for safety
        AIMode::Oracle
    }
    
    pub async fn execute_with_mode(
        &self,
        decision: &AIDecision,
        mode: AIMode,
    ) -> Result<AIExecutionResult, ExecutionError> {
        match mode {
            AIMode::Oracle => {
                // Provide recommendation, wait for human approval
                Ok(AIExecutionResult::RecommendationProvided {
                    recommendation: decision.output.clone(),
                    requires_human_approval: true,
                })
            }
            AIMode::Agent => {
                // Execute action autonomously
                Ok(AIExecutionResult::ActionExecuted {
                    action: decision.output.clone(),
                    executed_at: Utc::now(),
                })
            }
        }
    }
}
```

#### Emergency Shutdown Mechanisms

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmergencyShutdown {
    pub shutdown_id: Uuid,
    pub triggered_by: Uuid,
    pub reason: ShutdownReason,
    pub affected_models: Vec<String>,
    pub triggered_at: DateTime<Utc>,
    pub data_preserved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ShutdownReason {
    SafetyViolation,
    ValueMisalignment,
    UnexpectedBehavior,
    ManualOverride,
}

pub struct EmergencyShutdownSystem {
    db_pool: PgPool,
    model_registry: Arc<RwLock<HashMap<String, ModelHandle>>>,
}

impl EmergencyShutdownSystem {
    pub async fn trigger_shutdown(
        &self,
        triggered_by: Uuid,
        reason: ShutdownReason,
        model_ids: Vec<String>,
    ) -> Result<EmergencyShutdown, ShutdownError> {
        let shutdown_id = Uuid::new_v4();
        
        // Immediately stop all AI inference for affected models
        for model_id in &model_ids {
            self.halt_model(model_id).await?;
        }
        
        // Preserve all in-flight data
        let data_preserved = self.preserve_in_flight_data(&model_ids).await?;
        
        // Log shutdown event
        let shutdown = EmergencyShutdown {
            shutdown_id,
            triggered_by,
            reason: reason.clone(),
            affected_models: model_ids.clone(),
            triggered_at: Utc::now(),
            data_preserved,
        };
        
        self.log_shutdown(&shutdown).await?;
        
        // Notify all stakeholders
        self.notify_stakeholders(&shutdown).await?;
        
        Ok(shutdown)
    }
    
    async fn halt_model(&self, model_id: &str) -> Result<(), ShutdownError> {
        let mut registry = self.model_registry.write().await;
        
        if let Some(handle) = registry.remove(model_id) {
            // Stop model inference
            handle.stop().await?;
        }
        
        Ok(())
    }
    
    async fn preserve_in_flight_data(
        &self,
        model_ids: &[String],
    ) -> Result<bool, ShutdownError> {
        // Save all pending requests to database
        // Preserve model state
        // Ensure no data loss
        Ok(true)
    }
    
    pub async fn restore_from_shutdown(
        &self,
        shutdown_id: Uuid,
    ) -> Result<(), ShutdownError> {
        // Restore preserved data
        // Reload models with safety checks
        // Resume operations
        Ok(())
    }
}
```

