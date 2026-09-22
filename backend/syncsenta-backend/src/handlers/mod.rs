// STUDENT-FOCUSED BUILD: Only student-related handlers active
pub mod assessments;  // Student assessments and MeTTa
pub mod auth;         // Authentication (needed for student login)
pub mod mvp;          // MVP vertical slice: chat + WS + teacher dashboard
pub mod mwalimu;      // Mwalimu AI chat for students
pub mod translation;  // Gikuyu translation for multilingual learning
pub mod omega_claw;   // SyncSenta student activity progression and hints

// COMMENTED OUT: Non-student handlers for later implementation
// pub mod approvals;    // Admin approval workflows
// pub mod blockchain;   // Blockchain operations
// pub mod ipfs;         // IPFS storage
// pub mod schemes;      // Scheme generation (teacher-only)
// pub mod classrooms;   // Classroom management
// pub mod payments;     // Payment processing
// pub mod analytics;    // Analytics and reporting
// pub mod content;      // Content management
// pub mod sync;         // Data synchronization
// pub mod messages;     // Messaging system
// pub mod tokens;       // Token economy
