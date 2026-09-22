//! SyncSenta Blockchain Layer
//! 
//! This crate provides Web3 integration for SyncSenta Education OS:
//! - Smart contract interactions (Credentials, Tokens, Approvals, Content Registry)
//! - Polygon blockchain integration via ethers-rs
//! - IPFS content storage and retrieval
//! - Event listening and processing

pub mod contracts;
pub mod ipfs;
pub mod types;

pub use contracts::*;
pub use ipfs::*;
pub use types::*;
