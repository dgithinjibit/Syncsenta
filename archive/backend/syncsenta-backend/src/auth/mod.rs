//! DID-based authentication module
//! 
//! This module implements W3C DID and Verifiable Credentials authentication
//! to replace the old JWT-based system.

pub mod did;
pub mod vc;
pub mod middleware;
pub mod service;

#[cfg(test)]
mod tests;

pub use did::*;
pub use vc::*;
pub use middleware::*;
pub use service::*;
