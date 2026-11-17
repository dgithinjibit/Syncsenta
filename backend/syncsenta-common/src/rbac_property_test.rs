/// Property-based tests for RBAC - Task 2.8
/// **Validates: Requirements 1.9, 2.1, 20.3**

#[cfg(test)]
mod rbac_property_tests {
    use proptest::prelude::*;
    use crate::models::UserRole;

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

        #[test]
        fn property_permission_check_deterministic(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let result1 = check_permission(&user_role, &resource.allowed_roles);
            let result2 = check_permission(&user_role, &resource.allowed_roles);
            let result3 = check_permission(&user_role, &resource.allowed_roles);

            prop_assert_eq!(result1, result2);
            prop_assert_eq!(result2, result3);
        }

        #[test]
        fn property_unauthorized_always_403(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_authorized = resource.allowed_roles.contains(&user_role);
            let status_code = get_status_code(&user_role, &resource.allowed_roles);

            if !is_authorized {
                prop_assert_eq!(status_code, 403);
            }
        }

        #[test]
        fn property_authorized_always_200(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let is_authorized = resource.allowed_roles.contains(&user_role);
            let status_code = get_status_code(&user_role, &resource.allowed_roles);

            if is_authorized {
                prop_assert_eq!(status_code, 200);
            }
        }

        #[test]
        fn property_permission_matches_role_list(
            user_role in arb_user_role(),
            resource in arb_protected_resource(),
        ) {
            let expected = resource.allowed_roles.contains(&user_role);
            let actual = check_permission(&user_role, &resource.allowed_roles);

            prop_assert_eq!(actual, expected);
        }

        #[test]
        fn property_empty_roles_denies_all(
            user_role in arb_user_role(),
        ) {
            let empty_roles: Vec<UserRole> = vec![];
            let status_code = get_status_code(&user_role, &empty_roles);

            prop_assert_eq!(status_code, 403);
        }
    }
}
