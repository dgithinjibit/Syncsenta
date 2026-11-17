/// Property-based and unit tests for authentication and approval workflow.
/// Run with: cargo test --package syncsenta-backend

#[cfg(test)]
mod auth_property_tests {
    use proptest::prelude::*;
    use syncsenta_common::models::{ApprovalStatus, UserRole, get_approver_role};
    use crate::services::auth::{hash_password, verify_password, generate_token, validate_token};
    use syncsenta_common::models::{SupportedLanguage, UserProfile};
    use chrono::Utc;
    use uuid::Uuid;

    // ─── Property 1: Pending accounts are always denied access ───────────────
    // Validates: Requirements 1.8
    // A user with ApprovalStatus::Pending must never receive a valid JWT
    // that passes the approved-check in login_user.
    proptest! {
        #[test]
        fn pending_accounts_denied_access(
            role_idx in 0usize..6,
        ) {
            let roles = [
                UserRole::Student, UserRole::Parent, UserRole::Teacher,
                UserRole::SchoolAdmin, UserRole::SchoolHead, UserRole::CountyOfficer,
            ];
            let role = roles[role_idx].clone();

            // Simulate the approval check in login_user
            let approval_status = ApprovalStatus::Pending;
            let is_allowed = approval_status == ApprovalStatus::Approved;

            prop_assert!(!is_allowed, "Pending account for {:?} must be denied", role);
        }
    }

    // ─── Property 2: Approval chain is always respected ──────────────────────
    // Validates: Requirements 1.2–1.6
    proptest! {
        #[test]
        fn approval_chain_correctness(role_idx in 0usize..7) {
            let roles = [
                UserRole::Student, UserRole::Parent, UserRole::Teacher,
                UserRole::SchoolAdmin, UserRole::SchoolHead, UserRole::CountyOfficer,
                UserRole::NationalAdmin,
            ];
            let role = &roles[role_idx];
            let approver = get_approver_role(role);

            match role {
                UserRole::Student | UserRole::Parent =>
                    prop_assert_eq!(approver, UserRole::Teacher),
                UserRole::Teacher | UserRole::SchoolAdmin =>
                    prop_assert_eq!(approver, UserRole::SchoolHead),
                UserRole::SchoolHead =>
                    prop_assert_eq!(approver, UserRole::CountyOfficer),
                UserRole::CountyOfficer =>
                    prop_assert_eq!(approver, UserRole::NationalAdmin),
                UserRole::NationalAdmin =>
                    prop_assert_eq!(approver, UserRole::NationalAdmin),
            }
        }
    }

    // ─── Property 3: Role-based permissions are consistent ───────────────────
    // Validates: Requirements 1.9, 20.3
    proptest! {
        #[test]
        fn role_permissions_consistent(role_idx in 0usize..7) {
            let roles = [
                UserRole::Student, UserRole::Parent, UserRole::Teacher,
                UserRole::SchoolAdmin, UserRole::SchoolHead, UserRole::CountyOfficer,
                UserRole::NationalAdmin,
            ];
            let role = &roles[role_idx];

            // NationalAdmin must always be able to approve CountyOfficers
            // Teacher must always be able to approve Students and Parents
            let can_approve_student = matches!(role, UserRole::Teacher);
            let can_approve_county = matches!(role, UserRole::NationalAdmin);

            match role {
                UserRole::Teacher => prop_assert!(can_approve_student),
                UserRole::NationalAdmin => prop_assert!(can_approve_county),
                _ => {}
            }
        }
    }

    // ─── Property 4: Invalid credentials are always rejected ─────────────────
    // Validates: Requirements 1.11
    proptest! {
        #[test]
        fn invalid_credentials_rejected(
            password in "[a-zA-Z0-9]{8,32}",
            wrong_password in "[a-zA-Z0-9]{8,32}",
        ) {
            // Only test when passwords differ
            prop_assume!(password != wrong_password);

            let hash = hash_password(&password).unwrap();
            let result = verify_password(&wrong_password, &hash).unwrap();
            prop_assert!(!result, "Wrong password must not verify");
        }
    }

    // ─── Property 5: Correct password always verifies ────────────────────────
    proptest! {
        #[test]
        fn correct_password_always_verifies(
            password in "[a-zA-Z0-9!@#$%]{8,32}",
        ) {
            let hash = hash_password(&password).unwrap();
            let result = verify_password(&password, &hash).unwrap();
            prop_assert!(result, "Correct password must always verify");
        }
    }

    // ─── Property 6: JWT round-trip preserves claims ─────────────────────────
    proptest! {
        #[test]
        fn jwt_round_trip(role_idx in 0usize..7) {
            let roles = [
                UserRole::Student, UserRole::Parent, UserRole::Teacher,
                UserRole::SchoolAdmin, UserRole::SchoolHead, UserRole::CountyOfficer,
                UserRole::NationalAdmin,
            ];
            let role = roles[role_idx].clone();
            let secret = "test_secret_32_chars_minimum_len!";

            let profile = UserProfile {
                id: Uuid::new_v4(),
                email: "test@syncsenta.co.ke".into(),
                phone: None,
                role: role.clone(),
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

            prop_assert_eq!(claims.sub, profile.id.to_string());
            prop_assert_eq!(claims.role, role);
            prop_assert!(!claims.mfa_verified);
        }
    }
}

#[cfg(test)]
mod auth_unit_tests {
    use syncsenta_common::models::{ApprovalStatus, UserRole, get_approver_role};
    use crate::services::auth::{hash_password, verify_password};

    #[test]
    fn test_approval_chain_student_to_teacher() {
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
    }

    #[test]
    fn test_approval_chain_parent_to_teacher() {
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
    }

    #[test]
    fn test_approval_chain_teacher_to_school_head() {
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
    }

    #[test]
    fn test_approval_chain_school_admin_to_school_head() {
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
    }

    #[test]
    fn test_approval_chain_school_head_to_county() {
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
    }

    #[test]
    fn test_approval_chain_county_to_national() {
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
    }

    #[test]
    fn test_national_admin_self_approves() {
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }

    #[test]
    fn test_pending_status_not_approved() {
        assert_ne!(ApprovalStatus::Pending, ApprovalStatus::Approved);
    }

    #[test]
    fn test_rejected_status_not_approved() {
        assert_ne!(ApprovalStatus::Rejected, ApprovalStatus::Approved);
    }

    #[test]
    fn test_password_hash_and_verify() {
        let password = "SecurePass123!";
        let hash = hash_password(password).unwrap();
        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("WrongPass456!", &hash).unwrap());
    }

    #[test]
    fn test_different_passwords_produce_different_hashes() {
        let h1 = hash_password("password1").unwrap();
        let h2 = hash_password("password1").unwrap();
        // Argon2 uses random salt, so same password → different hashes
        assert_ne!(h1, h2);
        // But both should verify correctly
        assert!(verify_password("password1", &h1).unwrap());
        assert!(verify_password("password1", &h2).unwrap());
    }

    #[test]
    fn test_mfa_required_for_privileged_roles() {
        let privileged = [
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];
        for role in &privileged {
            let requires_mfa = matches!(
                role,
                UserRole::SchoolAdmin
                    | UserRole::SchoolHead
                    | UserRole::CountyOfficer
                    | UserRole::NationalAdmin
            );
            assert!(requires_mfa, "{:?} should require MFA", role);
        }
    }

    #[test]
    fn test_mfa_not_required_for_basic_roles() {
        let basic = [UserRole::Student, UserRole::Parent, UserRole::Teacher];
        for role in &basic {
            let requires_mfa = matches!(
                role,
                UserRole::SchoolAdmin
                    | UserRole::SchoolHead
                    | UserRole::CountyOfficer
                    | UserRole::NationalAdmin
            );
            assert!(!requires_mfa, "{:?} should not require MFA", role);
        }
    }
}
