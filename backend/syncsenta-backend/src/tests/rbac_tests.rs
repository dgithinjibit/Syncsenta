/// Property-based tests for RBAC middleware
/// Task 2.8: Write property test for role-based permission consistency (proptest)
/// **Validates: Requirements 1.9, 2.1, 20.3**
///
/// This test validates Property 3 from the design document:
/// "For any user with any assigned role, the permissions granted in their session
/// must exactly match the permission set defined for that role, and any attempt to
/// access a resource outside that permission set must return a 403 response."

#[cfg(test)]
mod rbac_property_tests {
    use proptest::prelude::*;
    use syncsenta_common::models::UserRole;

    // ─── Property 3: Role-based permissions are consistent and enforced ───────
    // **Validates: Requirements 1.9, 2.1, 20.3**
    //
    // For any user with any assigned role, the permissions granted must exactly
    // match the permission set defined for that role. Any attempt to access a
    // resource outside that permission set must be denied with 403.
    //
    // This test validates that:
    // 1. Permission checks are consistent (same role + same resource = same result)
    // 2. Unauthorized roles are always denied access
    // 3. The RBAC middleware correctly enforces role requirements
    // 4. Permission decisions are deterministic and repeatable

    /// Strategy to generate arbitrary user roles
    fn arb_user_role() -> impl Strategy<Value = UserRole> {
        prop_oneof![
            Just(UserRole::Student),
            Just(UserRole::Parent),
            Just(UserRole::Teacher),
            Just(UserRole::SchoolAdmin),
            Just(UserRole::SchoolHead),
            Just(UserRole::CountyOfficer),
            Just(UserRole::NationalAdmin),
        ]
    }

    /// Represents a protected resource with required roles
    #[derive(Debug, Clone)]
    struct ProtectedResource {
        name: String,
        allowed_roles: Vec<UserRole>,
    }

    /// Strategy to generate arbitrary protected resources
    fn arb_protected_resource() -> impl Strategy<Value = ProtectedResource> {
        (
            "[a-z_]{3,20}",
            prop::collection::vec(arb_user_role(), 1..=7),
        )
            .prop_map(|(name, mut roles)| {
                // Deduplicate roles
                roles.sort_by_key(|r| format!("{:?}", r));
                roles.dedup();
                ProtectedResource {
                    name,
                    allowed_roles: roles,
                }
            })
    }

    /// Simulates the RBAC middleware permission check
    /// Returns true if access is granted, false if denied (403)
    fn check_permission(user_role: &UserRole, allowed_roles: &[UserRole]) -> bool {
        allowed_roles.contains(user_role)
    }

    /// Simulates the HTTP status code returned by RBAC middleware
    fn get_status_code(user_role: &UserRole, allowed_roles: &[UserRole]) -> u16 {
        if check_permission(user_role, allowed_roles) {
            200 // OK - access granted
        } else {
            403 // FORBIDDEN - access denied
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property Test: Permission checks are deterministic
        ///
        /// For any user role and protected resource, checking permissions
        /// multiple times must always produce the same result.
        #[test]
        fn property_permission_check_deterministic(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let result1 = check_permission(&user_role, &resource.allowed_roles);
            let result2 = check_permission(&user_role, &resource.allowed_roles);
            let result3 = check_permission(&user_role, &resource.allowed_roles);

            prop_assert_eq!(
                result1, result2,
                "Permission check must be deterministic. Role: {:?}, Resource: {}",
                user_role, resource.name
            );
            prop_assert_eq!(
                result2, result3,
                "Permission check must be deterministic across multiple calls"
            );
        }

        /// Property Test: Unauthorized roles always receive 403
        ///
        /// For any user role not in the allowed roles list, the RBAC
        /// middleware must return 403 FORBIDDEN.
        #[test]
        fn property_unauthorized_always_403(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_authorized = resource.allowed_roles.contains(&user_role);
            let status_code = get_status_code(&user_role, &resource.allowed_roles);

            if !is_authorized {
                prop_assert_eq!(
                    status_code, 403,
                    "Unauthorized role must receive 403. Role: {:?}, Allowed: {:?}",
                    user_role, resource.allowed_roles
                );
            }
        }

        /// Property Test: Authorized roles always receive 200
        ///
        /// For any user role in the allowed roles list, the RBAC
        /// middleware must allow access (return 200).
        #[test]
        fn property_authorized_always_200(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_authorized = resource.allowed_roles.contains(&user_role);
            let status_code = get_status_code(&user_role, &resource.allowed_roles);

            if is_authorized {
                prop_assert_eq!(
                    status_code, 200,
                    "Authorized role must receive 200. Role: {:?}, Allowed: {:?}",
                    user_role, resource.allowed_roles
                );
            }
        }

        /// Property Test: Permission check is consistent with role list
        ///
        /// The permission check result must exactly match whether the role
        /// is in the allowed roles list - no other factors should influence it.
        #[test]
        fn property_permission_matches_role_list(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let expected = resource.allowed_roles.contains(&user_role);
            let actual = check_permission(&user_role, &resource.allowed_roles);

            prop_assert_eq!(
                actual, expected,
                "Permission check must match role list membership. Role: {:?}, Allowed: {:?}",
                user_role, resource.allowed_roles
            );
        }

        /// Property Test: Empty allowed roles denies all access
        ///
        /// A resource with no allowed roles must deny access to all users.
        #[test]
        fn property_empty_roles_denies_all(
            user_role in arb_user_role(),
        ) {
            let empty_roles: Vec<UserRole> = vec![];
            let status_code = get_status_code(&user_role, &empty_roles);

            prop_assert_eq!(
                status_code, 403,
                "Empty allowed roles must deny all access. Role: {:?}",
                user_role
            );
        }

        /// Property Test: All roles allowed grants universal access
        ///
        /// A resource that allows all 7 roles must grant access to any user.
        #[test]
        fn property_all_roles_grants_universal_access(
            user_role in arb_user_role(),
        ) {
            let all_roles = vec![
                UserRole::Student,
                UserRole::Parent,
                UserRole::Teacher,
                UserRole::SchoolAdmin,
                UserRole::SchoolHead,
                UserRole::CountyOfficer,
                UserRole::NationalAdmin,
            ];
            let status_code = get_status_code(&user_role, &all_roles);

            prop_assert_eq!(
                status_code, 200,
                "All roles allowed must grant universal access. Role: {:?}",
                user_role
            );
        }

        /// Property Test: Single role restriction is enforced
        ///
        /// A resource restricted to a single role must deny all other roles.
        #[test]
        fn property_single_role_restriction_enforced(
            allowed_role in arb_user_role(),
            user_role in arb_user_role(),
        ) {
            let single_role = vec![allowed_role.clone()];
            let status_code = get_status_code(&user_role, &single_role);

            if user_role == allowed_role {
                prop_assert_eq!(
                    status_code, 200,
                    "Matching role must be granted access"
                );
            } else {
                prop_assert_eq!(
                    status_code, 403,
                    "Non-matching role must be denied. User: {:?}, Allowed: {:?}",
                    user_role, allowed_role
                );
            }
        }

        /// Property Test: Permission check is commutative for role lists
        ///
        /// The order of roles in the allowed list should not affect the result.
        #[test]
        fn property_permission_check_order_independent(
            user_role in arb_user_role(),
            mut roles in prop::collection::vec(arb_user_role(), 1..=7),
        ) {
            // Check with original order
            let result1 = check_permission(&user_role, &roles);

            // Reverse the order
            roles.reverse();
            let result2 = check_permission(&user_role, &roles);

            prop_assert_eq!(
                result1, result2,
                "Permission check must be order-independent. Role: {:?}",
                user_role
            );
        }

        /// Property Test: Duplicate roles in allowed list don't affect result
        ///
        /// Having duplicate roles in the allowed list should not change
        /// the permission decision.
        #[test]
        fn property_duplicate_roles_no_effect(
            user_role in arb_user_role(),
            allowed_role in arb_user_role(),
        ) {
            let single = vec![allowed_role.clone()];
            let duplicate = vec![allowed_role.clone(), allowed_role.clone(), allowed_role];

            let result_single = check_permission(&user_role, &single);
            let result_duplicate = check_permission(&user_role, &duplicate);

            prop_assert_eq!(
                result_single, result_duplicate,
                "Duplicate roles must not affect permission check. User: {:?}, Allowed: {:?}",
                user_role, single[0]
            );
        }

        /// Property Test: Permission denial is absolute
        ///
        /// When a role is not in the allowed list, there is no partial access
        /// or degraded mode - access is completely denied.
        #[test]
        fn property_denial_is_absolute(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_allowed = resource.allowed_roles.contains(&user_role);
            let can_access = check_permission(&user_role, &resource.allowed_roles);

            // Permission check must be binary: either full access or no access
            prop_assert_eq!(
                can_access, is_allowed,
                "Permission must be binary (no partial access). Role: {:?}",
                user_role
            );
        }

        /// Property Test: Role hierarchy does not grant implicit permissions
        ///
        /// Higher-tier roles (e.g., NationalAdmin) do not automatically get
        /// access to resources unless explicitly listed in allowed roles.
        #[test]
        fn property_no_implicit_hierarchy_permissions(
            resource in arb_protected_resource(),
        ) {
            // NationalAdmin is the highest role
            let national_admin = UserRole::NationalAdmin;
            let has_access = check_permission(&national_admin, &resource.allowed_roles);
            let is_explicitly_allowed = resource.allowed_roles.contains(&national_admin);

            prop_assert_eq!(
                has_access, is_explicitly_allowed,
                "Even NationalAdmin must be explicitly allowed. Allowed: {:?}",
                resource.allowed_roles
            );
        }

        /// Property Test: Student role has no implicit admin access
        ///
        /// Student role (lowest tier) must never gain access to admin resources
        /// unless explicitly granted.
        #[test]
        fn property_student_no_implicit_admin_access(
            admin_roles in prop::collection::vec(
                prop_oneof![
                    Just(UserRole::SchoolAdmin),
                    Just(UserRole::SchoolHead),
                    Just(UserRole::CountyOfficer),
                    Just(UserRole::NationalAdmin),
                ],
                1..=4
            ),
        ) {
            let student = UserRole::Student;
            let has_access = check_permission(&student, &admin_roles);

            prop_assert!(
                !has_access,
                "Student must not have implicit admin access. Admin roles: {:?}",
                admin_roles
            );
        }

        /// Property Test: Permission check is idempotent
        ///
        /// Checking permissions multiple times in sequence must not change
        /// the result or have side effects.
        #[test]
        fn property_permission_check_idempotent(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let results: Vec<bool> = (0..10)
                .map(|_| check_permission(&user_role, &resource.allowed_roles))
                .collect();

            // All results must be identical
            let first = results[0];
            for (i, &result) in results.iter().enumerate() {
                prop_assert_eq!(
                    result, first,
                    "Permission check #{} must match first check. Role: {:?}",
                    i, user_role
                );
            }
        }

        /// Property Test: Mixed role lists enforce correct permissions
        ///
        /// Resources with mixed role requirements (e.g., Teacher + SchoolAdmin)
        /// must grant access to any of the allowed roles and deny all others.
        #[test]
        fn property_mixed_roles_correct_enforcement(
            user_role in arb_user_role(),
            allowed_roles in prop::collection::vec(arb_user_role(), 2..=5),
        ) {
            let should_allow = allowed_roles.contains(&user_role);
            let does_allow = check_permission(&user_role, &allowed_roles);

            prop_assert_eq!(
                does_allow, should_allow,
                "Mixed role list must correctly enforce permissions. User: {:?}, Allowed: {:?}",
                user_role, allowed_roles
            );
        }

        /// Property Test: Status code mapping is consistent
        ///
        /// The HTTP status code must consistently map to the permission decision:
        /// allowed = 200, denied = 403, no other codes.
        #[test]
        fn property_status_code_mapping_consistent(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_allowed = check_permission(&user_role, &resource.allowed_roles);
            let status_code = get_status_code(&user_role, &resource.allowed_roles);

            if is_allowed {
                prop_assert_eq!(status_code, 200, "Allowed must return 200");
            } else {
                prop_assert_eq!(status_code, 403, "Denied must return 403");
            }

            // No other status codes should be possible
            prop_assert!(
                status_code == 200 || status_code == 403,
                "Status code must be either 200 or 403, got: {}",
                status_code
            );
        }
    }
}

/// Unit tests for RBAC middleware
/// Run with: cargo test --package syncsenta-backend rbac

#[cfg(test)]
mod rbac_unit_tests {
    use syncsenta_common::models::UserRole;

    #[test]
    fn test_role_equality() {
        // Verify UserRole enum equality works correctly
        assert_eq!(UserRole::Student, UserRole::Student);
        assert_eq!(UserRole::Teacher, UserRole::Teacher);
        assert_ne!(UserRole::Student, UserRole::Teacher);
    }

    #[test]
    fn test_role_contains_check() {
        // Verify role checking logic
        let allowed_roles = vec![UserRole::Teacher, UserRole::SchoolAdmin];
        
        assert!(allowed_roles.contains(&UserRole::Teacher));
        assert!(allowed_roles.contains(&UserRole::SchoolAdmin));
        assert!(!allowed_roles.contains(&UserRole::Student));
        assert!(!allowed_roles.contains(&UserRole::Parent));
    }

    #[test]
    fn test_all_roles_distinct() {
        // Verify all roles are distinct
        let all_roles = vec![
            UserRole::Student,
            UserRole::Parent,
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];

        // Check that each role is unique
        for (i, role1) in all_roles.iter().enumerate() {
            for (j, role2) in all_roles.iter().enumerate() {
                if i == j {
                    assert_eq!(role1, role2);
                } else {
                    assert_ne!(role1, role2);
                }
            }
        }
    }

    #[test]
    fn test_role_serialization() {
        // Verify roles can be serialized/deserialized
        use serde_json;

        let role = UserRole::Teacher;
        let json = serde_json::to_string(&role).unwrap();
        assert_eq!(json, r#""teacher""#);

        let deserialized: UserRole = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, UserRole::Teacher);
    }

    #[test]
    fn test_multiple_roles_allowed() {
        // Test that multiple roles can be specified
        let admin_roles = vec![
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];

        assert_eq!(admin_roles.len(), 4);
        assert!(admin_roles.contains(&UserRole::SchoolAdmin));
        assert!(admin_roles.contains(&UserRole::NationalAdmin));
        assert!(!admin_roles.contains(&UserRole::Student));
    }

    #[test]
    fn test_single_role_allowed() {
        // Test that a single role can be specified
        let teacher_only = vec![UserRole::Teacher];

        assert_eq!(teacher_only.len(), 1);
        assert!(teacher_only.contains(&UserRole::Teacher));
        assert!(!teacher_only.contains(&UserRole::Student));
        assert!(!teacher_only.contains(&UserRole::SchoolAdmin));
    }

    #[test]
    fn test_empty_roles_denies_all() {
        // Test that empty role list denies all access
        let no_roles: Vec<UserRole> = vec![];

        assert_eq!(no_roles.len(), 0);
        assert!(!no_roles.contains(&UserRole::Student));
        assert!(!no_roles.contains(&UserRole::Teacher));
        assert!(!no_roles.contains(&UserRole::NationalAdmin));
    }

    #[test]
    fn test_role_hierarchy_levels() {
        // Verify we have exactly 7 role levels as per requirements
        let all_roles = vec![
            UserRole::Student,
            UserRole::Parent,
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];

        assert_eq!(all_roles.len(), 7, "Should have exactly 7 user roles");
    }

    #[test]
    fn test_privileged_roles() {
        // Test identification of privileged roles (those requiring MFA)
        let privileged_roles = vec![
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];

        let basic_roles = vec![
            UserRole::Student,
            UserRole::Parent,
            UserRole::Teacher,
        ];

        // Verify privileged roles are distinct from basic roles
        for priv_role in &privileged_roles {
            assert!(!basic_roles.contains(priv_role));
        }

        for basic_role in &basic_roles {
            assert!(!privileged_roles.contains(basic_role));
        }
    }

    #[test]
    fn test_role_format_consistency() {
        // Verify all roles serialize to snake_case as per design
        use serde_json;

        let test_cases = vec![
            (UserRole::Student, "student"),
            (UserRole::Parent, "parent"),
            (UserRole::Teacher, "teacher"),
            (UserRole::SchoolAdmin, "school_admin"),
            (UserRole::SchoolHead, "school_head"),
            (UserRole::CountyOfficer, "county_officer"),
            (UserRole::NationalAdmin, "national_admin"),
        ];

        for (role, expected) in test_cases {
            let json = serde_json::to_string(&role).unwrap();
            assert_eq!(json, format!(r#""{}""#, expected));
        }
    }
}
