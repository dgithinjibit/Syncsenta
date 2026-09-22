/// Standalone example demonstrating approval chain property tests
/// This can be run with: cargo run --example approval_chain_proptest
///
/// Task 2.6: Write property test for approval chain correctness (proptest)
/// **Property 2: Approval chain is always respected**
/// **Validates: Requirements 1.2–1.6**

use syncsenta_common::models::{UserRole, get_approver_role};

fn main() {
    println!("=== Approval Chain Property Test Demonstration ===\n");
    
    // Test all role mappings
    println!("1. Testing approval chain mappings:");
    test_all_approval_mappings();
    
    println!("\n2. Testing hierarchy levels:");
    test_hierarchy_levels();
    
    println!("\n3. Testing chain completeness:");
    test_chain_completeness();
    
    println!("\n4. Testing peer roles:");
    test_peer_roles();
    
    println!("\n5. Testing determinism:");
    test_determinism();
    
    println!("\n✅ All approval chain property tests passed!");
    println!("\nNote: Run full property-based tests with:");
    println!("  cargo test --package syncsenta-backend approval_chain_property_tests");
}

fn test_all_approval_mappings() {
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
        println!("  {:?} → {:?}", role, approver);
        
        // Verify the mapping is correct
        match role {
            UserRole::Student => assert_eq!(approver, UserRole::Teacher),
            UserRole::Parent => assert_eq!(approver, UserRole::Teacher),
            UserRole::Teacher => assert_eq!(approver, UserRole::SchoolHead),
            UserRole::SchoolAdmin => assert_eq!(approver, UserRole::SchoolHead),
            UserRole::SchoolHead => assert_eq!(approver, UserRole::CountyOfficer),
            UserRole::CountyOfficer => assert_eq!(approver, UserRole::NationalAdmin),
            UserRole::NationalAdmin => assert_eq!(approver, UserRole::NationalAdmin),
        }
    }
}

fn test_hierarchy_levels() {
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
        
        println!("  {:?} (L{}) → {:?} (L{}) ✓", role, requester_level, approver, approver_level);
    }
}

fn test_chain_completeness() {
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
        let mut chain = vec![current_role.clone()];
        let max_hops = 10;
        
        for _ in 0..max_hops {
            let approver = get_approver_role(&current_role);
            
            if approver == UserRole::NationalAdmin {
                chain.push(approver);
                break;
            }
            
            chain.push(approver.clone());
            current_role = approver;
        }
        
        assert_eq!(
            chain.last().unwrap(),
            &UserRole::NationalAdmin,
            "Chain from {:?} must reach NationalAdmin",
            role
        );
        
        println!("  {:?} → ... → NationalAdmin ({} hops) ✓", role, chain.len() - 1);
    }
}

fn test_peer_roles() {
    // Test Student and Parent (both approved by Teacher)
    let student_approver = get_approver_role(&UserRole::Student);
    let parent_approver = get_approver_role(&UserRole::Parent);
    assert_eq!(student_approver, parent_approver);
    println!("  Student & Parent → same approver (Teacher) ✓");
    
    // Test Teacher and SchoolAdmin (both approved by SchoolHead)
    let teacher_approver = get_approver_role(&UserRole::Teacher);
    let admin_approver = get_approver_role(&UserRole::SchoolAdmin);
    assert_eq!(teacher_approver, admin_approver);
    println!("  Teacher & SchoolAdmin → same approver (SchoolHead) ✓");
}

fn test_determinism() {
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
        let approver1 = get_approver_role(role);
        let approver2 = get_approver_role(role);
        let approver3 = get_approver_role(role);
        
        assert_eq!(approver1, approver2);
        assert_eq!(approver2, approver3);
    }
    
    println!("  All roles return consistent approvers across multiple calls ✓");
}
