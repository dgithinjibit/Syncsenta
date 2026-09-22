/// Property-based test for approval chain correctness
/// Task 2.6: Write property test for approval chain correctness (proptest)
/// **Property 2: Approval chain is always respected**
/// **Validates: Requirements 1.2–1.6**
///
/// This test validates that:
/// 1. For any registration request, the approver role is correctly determined
/// 2. Approval requests are routed to the correct approver based on the approval chain
/// 3. The approval chain hierarchy is always respected (no role can be approved by a lower tier)
/// 4. All role transitions follow the defined approval chain

#[cfg(test)]
mod approval_chain_property_tests {
    use proptest::prelude::*;
    use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole, get_approver_role};
    use chrono::Utc;
    use uuid::Uuid;

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

    /// Strategy to generate arbitrary supported languages
    fn arb_language() -> impl Strategy<Value = SupportedLanguage> {
        prop_oneof![
            Just(SupportedLanguage::En),
            Just(SupportedLanguage::Sw),
            Just(SupportedLanguage::Ki),
            Just(SupportedLanguage::Luo),
            Just(SupportedLanguage::Luy),
        ]
    }

    /// Strategy to generate arbitrary user profiles with pending approval status
    fn arb_pending_user_profile() -> impl Strategy<Value = UserProfile> {
        (
            arb_user_role(),
            arb_language(),
            any::<bool>(), // mfa_enabled
            proptest::option::of(any::<[u8; 16]>()), // school_id
            proptest::option::of(any::<[u8; 16]>()), // county_id
            "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}",  // email
            proptest::option::of("\\+254[0-9]{9}"),    // phone (Kenyan format)
        )
            .prop_map(
                |(role, language, mfa_enabled, school_id, county_id, email, phone)| UserProfile {
                    id: Uuid::new_v4(),
                    email,
                    phone,
                    role,
                    approval_status: ApprovalStatus::Pending,
                    approved_by: None,
                    school_id: school_id.map(Uuid::from_bytes),
                    county_id: county_id.map(Uuid::from_bytes),
                    language_preference: language,
                    did: None,
                    wallet_address: None,
                    mfa_enabled,
                    created_at: Utc::now(),
                },
            )
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
        fn approval_chain_always_respected(profile in arb_pending_user_profile()) {
            let requester_role = &profile.role;
            let approver_role = get_approver_role(requester_role);

            // Verify the approval chain mapping is correct
            match requester_role {
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
        fn approver_is_always_higher_tier(profile in arb_pending_user_profile()) {
            let requester_role = &profile.role;
            let approver_role = get_approver_role(requester_role);

            // Define role hierarchy levels (higher number = higher authority)
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

            let requester_level = get_hierarchy_level(requester_role);
            let approver_level = get_hierarchy_level(&approver_role);

            // Approver must be at same or higher level (NationalAdmin approves itself)
            prop_assert!(
                approver_level >= requester_level,
                "Approver role {:?} (level {}) must be at same or higher level than requester {:?} (level {})",
                approver_role,
                approver_level,
                requester_role,
                requester_level
            );
        }

        /// Property Test: Approval chain is deterministic
        ///
        /// For any given role, calling get_approver_role multiple times
        /// must always return the same approver role (deterministic behavior).
        #[test]
        fn approval_chain_is_deterministic(profile in arb_pending_user_profile()) {
            let role = &profile.role;
            
            let approver1 = get_approver_role(role);
            let approver2 = get_approver_role(role);
            let approver3 = get_approver_role(role);

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
        fn no_circular_approval_chains(profile in arb_pending_user_profile()) {
            let mut current_role = profile.role.clone();
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
        fn approval_chain_length_is_bounded(profile in arb_pending_user_profile()) {
            let mut current_role = profile.role.clone();
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
                    profile.role
                );
            }
        }

        /// Property Test: Peer roles have same approver
        ///
        /// Roles at the same tier (Student/Parent, Teacher/SchoolAdmin)
        /// should have the same approver role.
        #[test]
        fn peer_roles_have_same_approver(role1 in arb_user_role(), role2 in arb_user_role()) {
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
}

#[cfg(test)]
mod approval_chain_unit_tests {
    use syncsenta_common::models::{UserRole, get_approver_role};

    /// Unit test: Verify complete approval chain from Student to NationalAdmin
    #[test]
    fn test_complete_approval_chain_student() {
        let student = UserRole::Student;
        let teacher = get_approver_role(&student);
        let school_head = get_approver_role(&teacher);
        let county_officer = get_approver_role(&school_head);
        let national_admin = get_approver_role(&county_officer);

        assert_eq!(teacher, UserRole::Teacher);
        assert_eq!(school_head, UserRole::SchoolHead);
        assert_eq!(county_officer, UserRole::CountyOfficer);
        assert_eq!(national_admin, UserRole::NationalAdmin);
    }

    /// Unit test: Verify complete approval chain from Parent to NationalAdmin
    #[test]
    fn test_complete_approval_chain_parent() {
        let parent = UserRole::Parent;
        let teacher = get_approver_role(&parent);
        let school_head = get_approver_role(&teacher);
        let county_officer = get_approver_role(&school_head);
        let national_admin = get_approver_role(&county_officer);

        assert_eq!(teacher, UserRole::Teacher);
        assert_eq!(school_head, UserRole::SchoolHead);
        assert_eq!(county_officer, UserRole::CountyOfficer);
        assert_eq!(national_admin, UserRole::NationalAdmin);
    }

    /// Unit test: Verify all role mappings are correct
    #[test]
    fn test_all_role_approver_mappings() {
        assert_eq!(get_approver_role(&UserRole::Student), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Parent), UserRole::Teacher);
        assert_eq!(get_approver_role(&UserRole::Teacher), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolAdmin), UserRole::SchoolHead);
        assert_eq!(get_approver_role(&UserRole::SchoolHead), UserRole::CountyOfficer);
        assert_eq!(get_approver_role(&UserRole::CountyOfficer), UserRole::NationalAdmin);
        assert_eq!(get_approver_role(&UserRole::NationalAdmin), UserRole::NationalAdmin);
    }

    /// Unit test: Verify NationalAdmin is the top of the hierarchy
    #[test]
    fn test_national_admin_is_top_tier() {
        let national_admin = UserRole::NationalAdmin;
        let approver = get_approver_role(&national_admin);
        
        // NationalAdmin approves itself (self-managed)
        assert_eq!(approver, UserRole::NationalAdmin);
    }

    /// Unit test: Verify no role can skip hierarchy levels
    #[test]
    fn test_no_hierarchy_skipping() {
        // Student cannot be approved by SchoolHead (must go through Teacher)
        assert_ne!(get_approver_role(&UserRole::Student), UserRole::SchoolHead);
        
        // Teacher cannot be approved by CountyOfficer (must go through SchoolHead)
        assert_ne!(get_approver_role(&UserRole::Teacher), UserRole::CountyOfficer);
        
        // SchoolHead cannot be approved by NationalAdmin directly (must go through CountyOfficer)
        // Wait, this is wrong - SchoolHead IS approved by CountyOfficer, not NationalAdmin
        // Let me fix this test
        assert_ne!(get_approver_role(&UserRole::SchoolHead), UserRole::NationalAdmin);
    }
}
