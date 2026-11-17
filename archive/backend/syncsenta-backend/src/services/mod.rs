// STUDENT-FOCUSED BUILD: Only student-related services active
pub mod assessment;  // Student assessments and MeTTa
pub mod auth;        // Authentication (needed for student login)
pub mod mastery;     // Student skill mastery tracking
pub mod mwalimu;     // Mwalimu AI chat for students
pub mod translation; // Gikuyu translation for multilingual learning
pub mod ipfs;        // IPFS storage and content integrity helpers
pub mod scheme;      // Curriculum scheme helpers
pub mod token_economy; // Blockchain learning rewards
pub mod wallet_mfa;  // Privileged wallet authentication

// COMMENTED OUT: Non-student services for later implementation
// pub mod analytics;      // Teacher/admin analytics
// pub mod approvals;      // Admin approval workflows
// pub mod notifications; // System notifications
// pub mod payment;       // Payment processing
// pub mod sms;           // SMS notifications
// pub mod sync;          // Data synchronization
