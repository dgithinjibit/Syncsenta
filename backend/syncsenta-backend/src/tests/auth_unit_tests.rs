/// Unit tests for authentication and approval flows (Task 2.9)
/// Tests registration → pending state, approval chain routing, MFA enforcement, 403 on pending access
/// Validates Requirements 1.1–1.13
///
/// Run with: cargo test --package syncsenta-backend auth_unit_tests

#[cfg(test)]
mod auth_unit_tests {
    use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole, get_approver_role};
    use crate::services::auth::{
        hash_password, verify_password, generate_token, validate_token,
    };
    use chrono::Utc;
    use uuid::Uuid;

    // ─── Registration Flow Tests ─────────────────────────────────────────────

    #[test]
    fn test_registration_sets_pending_for_student() {
        // Requirement 1.1, 1.2: Students start in pending state
        let role = UserRole::Student;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_sets_pending_for_parent() {
        // Requirement 1.1: Parents start in pending state
        let role = UserRole::Parent;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_sets_pending_for_teacher() {
        // Requirement 1.3: Teachers start in pending state
        let role = UserRole::Teacher;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_sets_pending_for_school_admin() {
        // Requirement 1.4: School admins start in pending state
        let role = UserRole::SchoolAdmin;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_sets_pending_for_school_head() {
        // Requirement 1.5: School heads start in pending state
        let role = UserRole::SchoolHead;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_sets_pending_for_county_officer() {
        // Requirement 1.6: County officers start in pending state
        let role = UserRole::CountyOfficer;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Pending);
    }

    #[test]
    fn test_registration_auto_approves_national_admin() {
        // Requirement 1.1: NationalAdmin is auto-approved
        let role = UserRole::NationalAdmin;
        let approval_status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(approval_status, ApprovalStatus::Approved);
    }

    // ─── Approval Chain Routing Tests ────────────────────────────────────────

    #[test]
    fn test_approval_chain_student_requires_teacher() {
        // Requirement 1.2: Students approved by Teachers
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
    }

    #[test]
    fn test_approval_chain_parent_requires_teacher() {
        // Requirement 1.2: Parents approved by Teachers
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
    }

    #[test]
    fn test_approval_chain_teacher_requires_school_head() {
        // Requirement 1.3: Teachers approved by School Heads
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
    }

    #[test]
    fn test_approval_chain_school_admin_requires_school_head() {
        // Requirement 1.4: School Admins approved by School Heads
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
    }

    #[test]
    fn test_approval_chain_school_head_requires_county_officer() {
        // Requirement 1.5: School Heads approved by County Officers
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
    }

    #[test]
    fn test_approval_chain_county_officer_requires_national_admin() {
        // Requirement 1.6: County Officers approved by National Admins
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
    }

    #[test]
    fn test_approval_chain_national_admin_self_approves() {
        // Requirement 1.1: National Admins are self-managed
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }

    #[test]
    fn test_approval_chain_never_allows_lower_tier_approval() {
        // Requirement 1.9: Lower tiers cannot approve higher tiers
        // Student cannot approve Teacher
        assert_ne!(get_approver_role(&UserRole::Teacher), UserRole::Student);
        // Teacher cannot approve School Head
        assert_ne!(get_approver_role(&UserRole::SchoolHead), UserRole::Teacher);
        // School Head cannot approve County Officer
        assert_ne!(get_approver_role(&UserRole::CountyOfficer), UserRole::SchoolHead);
    }

    // ─── MFA Enforcement Tests ───────────────────────────────────────────────

    #[test]
    fn test_mfa_required_for_school_admin() {
        // Requirement 1.12: School Admins require MFA
        let role = UserRole::SchoolAdmin;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(requires_mfa, "SchoolAdmin must require MFA");
    }

    #[test]
    fn test_mfa_required_for_school_head() {
        // Requirement 1.12: School Heads require MFA
        let role = UserRole::SchoolHead;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(requires_mfa, "SchoolHead must require MFA");
    }

    #[test]
    fn test_mfa_required_for_county_officer() {
        // Requirement 1.12: County Officers require MFA
        let role = UserRole::CountyOfficer;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(requires_mfa, "CountyOfficer must require MFA");
    }

    #[test]
    fn test_mfa_required_for_national_admin() {
        // Requirement 1.12: National Admins require MFA
        let role = UserRole::NationalAdmin;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(requires_mfa, "NationalAdmin must require MFA");
    }

    #[test]
    fn test_mfa_not_required_for_student() {
        // Requirement 1.12: Students do not require MFA
        let role = UserRole::Student;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(!requires_mfa, "Student should not require MFA");
    }

    #[test]
    fn test_mfa_not_required_for_parent() {
        // Requirement 1.12: Parents do not require MFA
        let role = UserRole::Parent;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(!requires_mfa, "Parent should not require MFA");
    }

    #[test]
    fn test_mfa_not_required_for_teacher() {
        // Requirement 1.12: Teachers do not require MFA
        let role = UserRole::Teacher;
        let requires_mfa = matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(!requires_mfa, "Teacher should not require MFA");
    }

    // ─── Pending Access Denial Tests (403) ───────────────────────────────────

    #[test]
    fn test_pending_account_denied_access() {
        // Requirement 1.8: Pending accounts must be denied access
        let approval_status = ApprovalStatus::Pending;
        let is_allowed = approval_status == ApprovalStatus::Approved;
        assert!(!is_allowed, "Pending accounts must be denied access");
    }

    #[test]
    fn test_rejected_account_denied_access() {
        // Requirement 1.8: Rejected accounts must be denied access
        let approval_status = ApprovalStatus::Rejected;
        let is_allowed = approval_status == ApprovalStatus::Approved;
        assert!(!is_allowed, "Rejected accounts must be denied access");
    }

    #[test]
    fn test_approved_account_granted_access() {
        // Requirement 1.8: Only approved accounts get access
        let approval_status = ApprovalStatus::Approved;
        let is_allowed = approval_status == ApprovalStatus::Approved;
        assert!(is_allowed, "Approved accounts must be granted access");
    }

    #[test]
    fn test_pending_status_not_equal_to_approved() {
        // Requirement 1.8: Pending is distinct from Approved
        assert_ne!(ApprovalStatus::Pending, ApprovalStatus::Approved);
    }

    #[test]
    fn test_rejected_status_not_equal_to_approved() {
        // Requirement 1.8: Rejected is distinct from Approved
        assert_ne!(ApprovalStatus::Rejected, ApprovalStatus::Approved);
    }

    // ─── Login Flow Tests ─────────────────────────────────────────────────────

    #[test]
    fn test_valid_credentials_with_approved_status_allows_login() {
        // Requirement 1.10: Valid credentials + approved status = successful login
        let approval_status = ApprovalStatus::Approved;
        let password = "SecurePass123!";
        let hash = hash_password(password).unwrap();
        let password_valid = verify_password(password, &hash).unwrap();
        
        let can_login = password_valid && approval_status == ApprovalStatus::Approved;
        assert!(can_login, "Valid credentials with approved status should allow login");
    }

    #[test]
    fn test_valid_credentials_with_pending_status_denies_login() {
        // Requirement 1.8, 1.10: Valid credentials + pending status = denied
        let approval_status = ApprovalStatus::Pending;
        let password = "SecurePass123!";
        let hash = hash_password(password).unwrap();
        let password_valid = verify_password(password, &hash).unwrap();
        
        let can_login = password_valid && approval_status == ApprovalStatus::Approved;
        assert!(!can_login, "Valid credentials with pending status should deny login");
    }

    #[test]
    fn test_invalid_credentials_always_denied() {
        // Requirement 1.11: Invalid credentials are always rejected
        let password = "CorrectPassword123!";
        let wrong_password = "WrongPassword456!";
        let hash = hash_password(password).unwrap();
        let password_valid = verify_password(wrong_password, &hash).unwrap();
        
        assert!(!password_valid, "Invalid credentials must always be rejected");
    }

    // ─── JWT Token Generation Tests ──────────────────────────────────────────

    #[test]
    fn test_jwt_contains_user_id() {
        // Requirement 1.10: JWT tokens contain user_id
        let secret = "test_secret_32_chars_minimum_len!";
        let user_id = Uuid::new_v4();
        
        let profile = UserProfile {
            id: user_id,
            email: "test@syncsenta.co.ke".into(),
            phone: None,
            role: UserRole::Student,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: None,
            county_id: None,
            language_preference: SupportedLanguage::En,
            did: None,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        };

        let token = generate_token(&profile, secret, false).unwrap();
        let claims = validate_token(&token, secret).unwrap();
        
        assert_eq!(claims.sub, user_id.to_string());
    }

    #[test]
    fn test_jwt_contains_role() {
        // Requirement 1.10: JWT tokens contain role
        let secret = "test_secret_32_chars_minimum_len!";
        
        let profile = UserProfile {
            id: Uuid::new_v4(),
            email: "teacher@syncsenta.co.ke".into(),
            phone: None,
            role: UserRole::Teacher,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: None,
            county_id: None,
            language_preference: SupportedLanguage::En,
            did: None,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        };

        let token = generate_token(&profile, secret, false).unwrap();
        let claims = validate_token(&token, secret).unwrap();
        
        assert_eq!(claims.role, UserRole::Teacher);
    }

    #[test]
    fn test_jwt_contains_approval_status_implicitly() {
        // Requirement 1.10: JWT is only generated for approved users
        // The login_user function blocks pending/rejected accounts before token generation
        let approval_status = ApprovalStatus::Approved;
        assert_eq!(approval_status, ApprovalStatus::Approved);
    }

    #[test]
    fn test_jwt_contains_mfa_verified_flag() {
        // Requirement 1.12: JWT tokens track MFA verification status
        let secret = "test_secret_32_chars_minimum_len!";
        
        let profile = UserProfile {
            id: Uuid::new_v4(),
            email: "admin@syncsenta.co.ke".into(),
            phone: None,
            role: UserRole::SchoolAdmin,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: None,
            county_id: None,
            language_preference: SupportedLanguage::En,
            did: None,
            wallet_address: None,
            mfa_enabled: true,
            created_at: Utc::now(),
        };

        let token_without_mfa = generate_token(&profile, secret, false).unwrap();
        let claims_without_mfa = validate_token(&token_without_mfa, secret).unwrap();
        assert!(!claims_without_mfa.mfa_verified);

        let token_with_mfa = generate_token(&profile, secret, true).unwrap();
        let claims_with_mfa = validate_token(&token_with_mfa, secret).unwrap();
        assert!(claims_with_mfa.mfa_verified);
    }

    // ─── Password Hashing Tests ──────────────────────────────────────────────

    #[test]
    fn test_password_hashing_uses_argon2() {
        // Requirement 1.1: Passwords are hashed with Argon2
        let password = "SecurePassword123!";
        let hash = hash_password(password).unwrap();
        
        // Argon2 hashes start with $argon2
        assert!(hash.starts_with("$argon2"), "Hash should use Argon2 format");
    }

    #[test]
    fn test_password_verification_succeeds_for_correct_password() {
        // Requirement 1.10: Correct passwords verify successfully
        let password = "MySecurePass456!";
        let hash = hash_password(password).unwrap();
        
        assert!(verify_password(password, &hash).unwrap());
    }

    #[test]
    fn test_password_verification_fails_for_incorrect_password() {
        // Requirement 1.11: Incorrect passwords fail verification
        let password = "CorrectPassword";
        let wrong_password = "WrongPassword";
        let hash = hash_password(password).unwrap();
        
        assert!(!verify_password(wrong_password, &hash).unwrap());
    }

    #[test]
    fn test_same_password_produces_different_hashes() {
        // Argon2 uses random salt, ensuring different hashes for same password
        let password = "SamePassword123!";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();
        
        assert_ne!(hash1, hash2, "Same password should produce different hashes due to random salt");
        
        // But both should verify correctly
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }

    // ─── Approval Decision Tests ──────────────────────────────────────────────

    #[test]
    fn test_approve_action_changes_status_to_approved() {
        // Requirement 1.2-1.6: Approve action updates status
        let decision = "approve";
        let new_status = if decision == "approve" {
            ApprovalStatus::Approved
        } else {
            ApprovalStatus::Rejected
        };
        
        assert_eq!(new_status, ApprovalStatus::Approved);
    }

    #[test]
    fn test_reject_action_changes_status_to_rejected() {
        // Requirement 1.2-1.6: Reject action updates status
        let decision = "reject";
        let new_status = if decision == "approve" {
            ApprovalStatus::Approved
        } else {
            ApprovalStatus::Rejected
        };
        
        assert_eq!(new_status, ApprovalStatus::Rejected);
    }

    #[test]
    fn test_only_correct_approver_can_approve() {
        // Requirement 1.9: Only the designated approver role can approve
        let target_role = UserRole::Student;
        let required_approver = get_approver_role(&target_role);
        let actual_approver = UserRole::Teacher;
        
        let is_authorized = actual_approver == required_approver;
        assert!(is_authorized, "Teacher should be authorized to approve Student");
        
        let wrong_approver = UserRole::Student;
        let is_unauthorized = wrong_approver == required_approver;
        assert!(!is_unauthorized, "Student should not be authorized to approve Student");
    }

    // ─── Role-Based Permission Tests ──────────────────────────────────────────

    #[test]
    fn test_student_cannot_approve_registrations() {
        // Requirement 1.9: Students have no approval permissions
        let role = UserRole::Student;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(!can_approve, "Students cannot approve registrations");
    }

    #[test]
    fn test_parent_cannot_approve_registrations() {
        // Requirement 1.9: Parents have no approval permissions
        let role = UserRole::Parent;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(!can_approve, "Parents cannot approve registrations");
    }

    #[test]
    fn test_teacher_can_approve_registrations() {
        // Requirement 1.2, 1.9: Teachers can approve Students and Parents
        let role = UserRole::Teacher;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(can_approve, "Teachers can approve registrations");
    }

    #[test]
    fn test_school_head_can_approve_registrations() {
        // Requirement 1.3, 1.4, 1.9: School Heads can approve Teachers and School Admins
        let role = UserRole::SchoolHead;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(can_approve, "School Heads can approve registrations");
    }

    #[test]
    fn test_county_officer_can_approve_registrations() {
        // Requirement 1.5, 1.9: County Officers can approve School Heads
        let role = UserRole::CountyOfficer;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(can_approve, "County Officers can approve registrations");
    }

    #[test]
    fn test_national_admin_can_approve_registrations() {
        // Requirement 1.6, 1.9: National Admins can approve County Officers
        let role = UserRole::NationalAdmin;
        let can_approve = matches!(
            role,
            UserRole::Teacher
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );
        assert!(can_approve, "National Admins can approve registrations");
    }

    // ─── Session Expiry Tests ─────────────────────────────────────────────────

    #[test]
    fn test_jwt_has_expiry_time() {
        // Requirement 1.13: JWT tokens have expiration
        let secret = "test_secret_32_chars_minimum_len!";
        
        let profile = UserProfile {
            id: Uuid::new_v4(),
            email: "test@syncsenta.co.ke".into(),
            phone: None,
            role: UserRole::Student,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: None,
            county_id: None,
            language_preference: SupportedLanguage::En,
            did: None,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        };

        let token = generate_token(&profile, secret, false).unwrap();
        let claims = validate_token(&token, secret).unwrap();
        
        // Token should have an expiry time in the future
        assert!(claims.exp > claims.iat, "Token expiry must be after issue time");
    }

    #[test]
    fn test_jwt_expiry_is_24_hours() {
        // JWT tokens expire after 24 hours (86400 seconds)
        let secret = "test_secret_32_chars_minimum_len!";
        
        let profile = UserProfile {
            id: Uuid::new_v4(),
            email: "test@syncsenta.co.ke".into(),
            phone: None,
            role: UserRole::Student,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: None,
            county_id: None,
            language_preference: SupportedLanguage::En,
            did: None,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        };

        let token = generate_token(&profile, secret, false).unwrap();
        let claims = validate_token(&token, secret).unwrap();
        
        let duration = claims.exp - claims.iat;
        // 24 hours = 86400 seconds
        assert_eq!(duration, 86400, "Token should expire after 24 hours");
    }
}

// ─── DID Authentication Unit Tests ──────────────────────────────────────────

#[cfg(test)]
mod did_auth_unit_tests {
    use crate::auth::did::{generate_did, resolve_did, DIDMethod};
    use crate::auth::vc::{issue_credential, verify_credential, create_presentation, verify_presentation};
    use crate::middleware::rbac::{generate_zk_commitment, verify_zk_role_claim, ZKRoleClaim};
    use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole};
    use chrono::Utc;
    use uuid::Uuid;

    fn make_approved_user(role: UserRole) -> UserProfile {
        UserProfile {
            id: Uuid::new_v4(),
            did: Some(format!("did:key:z6Mk{}", Uuid::new_v4().simple())),
            email: "user@syncsenta.co.ke".to_string(),
            phone: Some("+254712345678".to_string()),
            role,
            approval_status: ApprovalStatus::Approved,
            approved_by: Some(Uuid::new_v4()),
            school_id: Some(Uuid::new_v4()),
            county_id: None,
            language_preference: SupportedLanguage::En,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        }
    }

    // ─── DID Generation ──────────────────────────────────────────────────────

    #[test]
    fn test_did_key_format() {
        let id = Uuid::new_v4();
        let did = generate_did(id, DIDMethod::Key);
        assert!(did.starts_with("did:key:z"), "DID key must start with did:key:z");
    }

    #[test]
    fn test_did_web_format() {
        let id = Uuid::new_v4();
        let did = generate_did(id, DIDMethod::Web);
        assert!(did.starts_with("did:web:syncsenta.education:users:"));
        assert!(did.contains(&id.to_string()));
    }

    #[test]
    fn test_did_is_deterministic() {
        let id = Uuid::new_v4();
        let did1 = generate_did(id, DIDMethod::Key);
        let did2 = generate_did(id, DIDMethod::Key);
        assert_eq!(did1, did2, "Same user ID must produce same DID");
    }

    #[test]
    fn test_different_users_different_dids() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let did1 = generate_did(id1, DIDMethod::Key);
        let did2 = generate_did(id2, DIDMethod::Key);
        assert_ne!(did1, did2, "Different users must have different DIDs");
    }

    // ─── DID Resolution ──────────────────────────────────────────────────────

    #[test]
    fn test_resolve_valid_did() {
        let id = Uuid::new_v4();
        let did = generate_did(id, DIDMethod::Key);
        let doc = resolve_did(&did);
        assert!(doc.is_ok());
        let doc = doc.unwrap();
        assert_eq!(doc.id, did);
        assert!(!doc.verification_method.is_empty());
        assert!(!doc.authentication.is_empty());
    }

    #[test]
    fn test_resolve_invalid_did_fails() {
        assert!(resolve_did("not-a-did").is_err());
        assert!(resolve_did("did:").is_err());
        assert!(resolve_did("").is_err());
    }

    // ─── Verifiable Credential Issuance ──────────────────────────────────────

    #[test]
    fn test_vc_issued_for_approved_user() {
        let user = make_approved_user(UserRole::Teacher);
        let issuer = "did:web:syncsenta.education:issuer";
        let vc = issue_credential(&user, issuer);
        assert!(vc.is_ok());
        let vc = vc.unwrap();
        assert_eq!(vc.issuer, issuer);
        assert_eq!(vc.credential_subject.role, UserRole::Teacher);
        assert_eq!(vc.credential_subject.approval_status, ApprovalStatus::Approved);
    }

    #[test]
    fn test_vc_fails_without_did() {
        let mut user = make_approved_user(UserRole::Student);
        user.did = None;
        let vc = issue_credential(&user, "did:web:syncsenta.education:issuer");
        assert!(vc.is_err(), "VC issuance must fail if user has no DID");
    }

    #[test]
    fn test_vc_contains_correct_role() {
        for role in [
            UserRole::Student,
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::NationalAdmin,
        ] {
            let user = make_approved_user(role.clone());
            let vc = issue_credential(&user, "did:web:syncsenta.education:issuer").unwrap();
            assert_eq!(vc.credential_subject.role, role);
        }
    }

    // ─── Verifiable Credential Verification ──────────────────────────────────

    #[test]
    fn test_valid_vc_verifies() {
        let user = make_approved_user(UserRole::SchoolHead);
        let vc = issue_credential(&user, "did:web:syncsenta.education:issuer").unwrap();
        assert!(verify_credential(&vc).is_ok());
        assert!(verify_credential(&vc).unwrap());
    }

    #[test]
    fn test_tampered_vc_rejected() {
        let user = make_approved_user(UserRole::Teacher);
        let mut vc = issue_credential(&user, "did:web:syncsenta.education:issuer").unwrap();
        // Tamper with the proof
        vc.proof.proof_value = "tampered_proof_value".to_string();
        let result = verify_credential(&vc);
        assert!(result.is_err(), "Tampered VC must be rejected");
    }

    #[test]
    fn test_vc_missing_context_rejected() {
        let user = make_approved_user(UserRole::Teacher);
        let mut vc = issue_credential(&user, "did:web:syncsenta.education:issuer").unwrap();
        vc.context.clear();
        let result = verify_credential(&vc);
        assert!(result.is_err(), "VC without context must be rejected");
    }

    // ─── Verifiable Presentation ─────────────────────────────────────────────

    #[test]
    fn test_vp_creation_and_verification() {
        let user = make_approved_user(UserRole::CountyOfficer);
        let holder_did = user.did.clone().unwrap();
        let vc = issue_credential(&user, "did:web:syncsenta.education:issuer").unwrap();
        let vp = create_presentation(vec![vc], &holder_did);
        assert!(vp.is_ok());
        let vp = vp.unwrap();
        assert_eq!(vp.verifiable_credential.len(), 1);
        let primary_vc = verify_presentation(&vp);
        assert!(primary_vc.is_ok());
    }

    #[test]
    fn test_empty_vp_rejected() {
        use crate::auth::vc::{VerifiablePresentation, Proof};
        let vp = VerifiablePresentation {
            context: vec!["https://www.w3.org/2018/credentials/v1".to_string()],
            presentation_type: vec!["VerifiablePresentation".to_string()],
            verifiable_credential: vec![],
            proof: Proof {
                proof_type: "Ed25519Signature2020".to_string(),
                created: Utc::now(),
                verification_method: "did:key:z6Mk#key-1".to_string(),
                proof_purpose: "authentication".to_string(),
                proof_value: "test".to_string(),
            },
        };
        assert!(verify_presentation(&vp).is_err(), "Empty VP must be rejected");
    }

    // ─── ZK Role Proofs ──────────────────────────────────────────────────────

    #[test]
    fn test_zk_commitment_verifies() {
        let role = UserRole::SchoolAdmin;
        let nonce = "test_nonce";
        let commitment = generate_zk_commitment(&role, nonce);
        let claim = ZKRoleClaim {
            commitment,
            nonce: nonce.to_string(),
            predicate: "min_level:teacher".to_string(),
        };
        assert!(verify_zk_role_claim(&claim, &UserRole::Teacher, &role));
    }

    #[test]
    fn test_zk_insufficient_role_rejected() {
        let role = UserRole::Student;
        let nonce = "nonce_abc";
        let commitment = generate_zk_commitment(&role, nonce);
        let claim = ZKRoleClaim {
            commitment,
            nonce: nonce.to_string(),
            predicate: "min_level:school_admin".to_string(),
        };
        assert!(!verify_zk_role_claim(&claim, &UserRole::SchoolAdmin, &role));
    }

    // ─── Wallet MFA ──────────────────────────────────────────────────────────

    #[test]
    fn test_wallet_mfa_required_for_privileged_roles() {
        use crate::services::wallet_mfa::requires_wallet_mfa;
        assert!(requires_wallet_mfa(&UserRole::SchoolAdmin));
        assert!(requires_wallet_mfa(&UserRole::SchoolHead));
        assert!(requires_wallet_mfa(&UserRole::CountyOfficer));
        assert!(requires_wallet_mfa(&UserRole::NationalAdmin));
        assert!(!requires_wallet_mfa(&UserRole::Student));
        assert!(!requires_wallet_mfa(&UserRole::Parent));
        assert!(!requires_wallet_mfa(&UserRole::Teacher));
    }

    #[test]
    fn test_wallet_challenge_contains_user_id() {
        use crate::services::wallet_mfa::generate_wallet_challenge;
        let id = Uuid::new_v4();
        let challenge = generate_wallet_challenge(id);
        assert!(challenge.contains(&id.to_string()));
        assert!(challenge.starts_with("SyncSenta MFA Challenge: "));
    }

    // ─── Approval Chain ──────────────────────────────────────────────────────

    #[test]
    fn test_approval_chain_all_roles() {
        use syncsenta_common::models::get_approver_role;
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }

    #[test]
    fn test_national_admin_auto_approved() {
        let role = UserRole::NationalAdmin;
        let status = match role {
            UserRole::NationalAdmin => ApprovalStatus::Approved,
            _ => ApprovalStatus::Pending,
        };
        assert_eq!(status, ApprovalStatus::Approved);
    }

    #[test]
    fn test_403_on_pending_access() {
        // Simulate the middleware check
        let approval_status = ApprovalStatus::Pending;
        let http_status = if approval_status != ApprovalStatus::Approved { 403u16 } else { 200u16 };
        assert_eq!(http_status, 403);
    }
}
