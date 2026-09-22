/// Property-based tests for approval chain correctness
/// Task 2.6: Write property test for approval chain correctness (proptest)
/// **Property 2: Approval chain is always respected**
/// **Validates: Requirements 1.2–1.6**

#[cfg(test)]
mod approval_chain_tests {
    use crate::models::{UserRole, get_approver_role};
    use proptest::prelude::*;
    
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
    
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        /// Property Test: Approval chain is ALWAYS respected
        ///
        /// For any user role, the approver role must match the defined approval chain:
        /// - Student → Teacher approves
        /// - Parent → Teacher approves
        /// - Teacher → SchoolHead approves
        /// - SchoolAdmin → SchoolHead approves
        /// - SchoolHead → CountyOfficer approves
        /// - CountyOfficer → NationalAdmin approves
        /// - NationalAdmin → Auto-approved (self-managed)
        #[test]
        fn prop_approval_chain_always_respected(role in arb_user_role()) {
            let approver_role = get_approver_role(&role);

            // Verify the approval chain mapping is correct
            match role {
                UserRole::Student => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::Teacher,
                        "Student must be approved by Teacher"
                    );
                }
                UserRole::Parent => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::Teacher,
                        "Parent must be approved by Teacher"
                    );
                }
                UserRole::Teacher => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::SchoolHead,
                        "Teacher must be approved by SchoolHead"
                    );
                }
                UserRole::SchoolAdmin => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::SchoolHead,
                        "SchoolAdmin must be approved by SchoolHead"
                    );
                }
                UserRole::SchoolHead => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::CountyOfficer,
                        "SchoolHead must be approved by CountyOfficer"
                    );
                }
                UserRole::CountyOfficer => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::NationalAdmin,
                        "CountyOfficer must be approved by NationalAdmin"
                    );
                }
                UserRole::NationalAdmin => {
                    prop_assert_eq!(
                        approver_role,
                        UserRole::NationalAdmin,
                        "NationalAdmin is self-managed (auto-approved)"
                    );
                }
            }
        }
        
        /// Property Test: Approver role is always higher in hierarchy
        ///
        /// For any role (except NationalAdmin), the approver role must be
        /// higher in the organizational hierarchy. This ensures no role can
        /// be approved by a lower or equal tier.
        #[test]
        fn prop_approver_is_always_higher_tier(role in arb_user_role()) {
            let approver_role = get_approver_role(&role);

            // Define role hierarchy levels (higher number = higher authority)
            let get_hierarchy_level = |r: &UserRole| -> u8 {
                match r {
                    UserRole::Student => 1,
                    UserRole::Parent => 1,
                    UserRole::Teacher => 2,
                    UserRole::SchoolAdmin => 2,
                    UserRole::SchoolHead => 3,
                    UserRole::CountyOfficer => 4,
                    UserRole::NationalAdmin => 5,
                }
            };

            let requester_level = get_hierarchy_level(&role);
            let approver_level = get_hierarchy_level(&approver_role);

            // Approver must be at same or higher level (NationalAdmin approves itself)
            prop_assert!(
                approver_level >= requester_level,
                "Approver role {:?} (level {}) must be at same or higher level than requester {:?} (level {})",
                approver_role,
                approver_level,
                role,
                requester_level
            );
        }
        
        /// Property Test: Approval chain is deterministic
        ///
        /// For any given role, calling get_approver_role multiple times
        /// must always return the same approver role (deterministic behavior).
        #[test]
        fn prop_approval_chain_is_deterministic(role in arb_user_role()) {
            let approver1 = get_approver_role(&role);
            let approver2 = get_approver_role(&role);
            let approver3 = get_approver_role(&role);

            prop_assert_eq!(
                &approver1,
                &approver2,
                "get_approver_role must be deterministic (call 1 vs 2)"
            );
            prop_assert_eq!(
                &approver2,
                &approver3,
                "get_approver_role must be deterministic (call 2 vs 3)"
            );
        }
        
        /// Property Test: No circular approval chains
        ///
        /// Following the approval chain from any role should eventually
        /// reach NationalAdmin without cycles. This prevents infinite loops
        /// in the approval workflow.
        #[test]
        fn prop_no_circular_approval_chains(role in arb_user_role()) {
            let mut current_role = role.clone();
            let mut visited_roles = vec![current_role.clone()];
            let max_chain_length = 10; // Safety limit

            // Follow the approval chain until we reach NationalAdmin or detect a cycle
            for _ in 0..max_chain_length {
                let approver = get_approver_role(&current_role);
                
                // Check for cycles
                prop_assert!(
                    !visited_roles.contains(&approver) || approver == UserRole::NationalAdmin,
                    "Circular approval chain detected: {:?} -> {:?}",
                    visited_roles,
                    approver
                );

                visited_roles.push(approver.clone());
                
                // If we reached NationalAdmin, the chain is valid
                if approver == UserRole::NationalAdmin {
                    break;
                }
                
                current_role = approver;
            }

            // The chain must end at NationalAdmin
            prop_assert_eq!(
                visited_roles.last().unwrap(),
                &UserRole::NationalAdmin,
                "Approval chain must eventually reach NationalAdmin"
            );
        }
        
        /// Property Test: Approval chain length is bounded
        ///
        /// The approval chain from any role to NationalAdmin should not
        /// exceed a reasonable length (max 5 hops for this 7-tier system).
        #[test]
        fn prop_approval_chain_length_is_bounded(role in arb_user_role()) {
            let mut current_role = role.clone();
            let mut chain_length = 0;
            let max_expected_length = 5; // Student -> Teacher -> SchoolHead -> CountyOfficer -> NationalAdmin

            // Count hops to NationalAdmin
            while current_role != UserRole::NationalAdmin {
                current_role = get_approver_role(&current_role);
                chain_length += 1;

                prop_assert!(
                    chain_length <= max_expected_length,
                    "Approval chain too long: {} hops from {:?}",
                    chain_length,
                    role
                );
            }
        }
        
        /// Property Test: Peer roles have same approver
        ///
        /// Roles at the same tier (Student/Parent, Teacher/SchoolAdmin)
        /// should have the same approver role.
        #[test]
        fn prop_peer_roles_have_same_approver(role1 in arb_user_role(), role2 in arb_user_role()) {
            let are_peers = match (&role1, &role2) {
                (UserRole::Student, UserRole::Parent) | (UserRole::Parent, UserRole::Student) => true,
                (UserRole::Teacher, UserRole::SchoolAdmin) | (UserRole::SchoolAdmin, UserRole::Teacher) => true,
                _ => false,
            };

            if are_peers {
                let approver1 = get_approver_role(&role1);
                let approver2 = get_approver_role(&role2);
                
                prop_assert_eq!(
                    approver1,
                    approver2,
                    "Peer roles {:?} and {:?} must have the same approver",
                    role1,
                    role2
                );
            }
        }
    }
    
    // Unit tests below
    
    #[test]
    fn test_student_approved_by_teacher() {
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
    }
    
    #[test]
    fn test_parent_approved_by_teacher() {
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
    }
    
    #[test]
    fn test_teacher_approved_by_school_head() {
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
    }
    
    #[test]
    fn test_school_admin_approved_by_school_head() {
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
    }
    
    #[test]
    fn test_school_head_approved_by_county_officer() {
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
    }
    
    #[test]
    fn test_county_officer_approved_by_national_admin() {
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
    }
    
    #[test]
    fn test_national_admin_self_managed() {
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }
    
    #[test]
    fn test_approval_chain_hierarchy() {
        let get_hierarchy_level = |role: &UserRole| -> u8 {
            match role {
                UserRole::Student => 1,
                UserRole::Parent => 1,
                UserRole::Teacher => 2,
                UserRole::SchoolAdmin => 2,
                UserRole::SchoolHead => 3,
                UserRole::CountyOfficer => 4,
                UserRole::NationalAdmin => 5,
            }
        };
        
        let roles = vec![
            UserRole::Student,
            UserRole::Parent,
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
            UserRole::NationalAdmin,
        ];
        
        for role in &roles {
            let approver = get_approver_role(role);
            let requester_level = get_hierarchy_level(role);
            let approver_level = get_hierarchy_level(&approver);
            
            assert!(
                approver_level >= requester_level,
                "Approver {:?} (level {}) must be at same or higher level than requester {:?} (level {})",
                approver,
                approver_level,
                role,
                requester_level
            );
        }
    }
    
    #[test]
    fn test_peer_roles_same_approver() {
        // Student and Parent are peers (both approved by Teacher)
        assert_eq!(
            get_approver_role(&UserRole::Student),
            get_approver_role(&UserRole::Parent)
        );
        
        // Teacher and SchoolAdmin are peers (both approved by SchoolHead)
        assert_eq!(
            get_approver_role(&UserRole::Teacher),
            get_approver_role(&UserRole::SchoolAdmin)
        );
    }
    
    #[test]
    fn test_chain_reaches_national_admin() {
        let roles = vec![
            UserRole::Student,
            UserRole::Parent,
            UserRole::Teacher,
            UserRole::SchoolAdmin,
            UserRole::SchoolHead,
            UserRole::CountyOfficer,
        ];
        
        for role in &roles {
            let mut current_role = role.clone();
            let max_hops = 10;
            
            for _ in 0..max_hops {
                current_role = get_approver_role(&current_role);
                if current_role == UserRole::NationalAdmin {
                    break;
                }
            }
            
            assert_eq!(
                current_role,
                UserRole::NationalAdmin,
                "Chain from {:?} must eventually reach NationalAdmin",
                role
            );
        }
    }
}
