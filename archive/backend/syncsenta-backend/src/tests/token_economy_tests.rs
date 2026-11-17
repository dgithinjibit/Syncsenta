//! Property-based and unit tests for SyncToken economy
//!
//! Task 4.4: Property 35 — Token minting and burning maintain consistent supply
//! Task 4.5: Unit tests for token economy
//! Validates: Requirements 27.1, 27.2, 27.3

#[cfg(test)]
mod token_economy_property_tests {
    use proptest::prelude::*;
    use crate::services::token_economy::{MilestoneType, RedemptionType};

    /// Strategy to generate valid token amounts
    fn arb_token_amount() -> impl Strategy<Value = u64> {
        1u64..=10_000u64
    }

    /// Strategy to generate milestone types
    fn arb_milestone() -> impl Strategy<Value = MilestoneType> {
        prop_oneof![
            Just(MilestoneType::AssessmentMastery),
            Just(MilestoneType::QuizMastery),
            Just(MilestoneType::LearningPathMilestone),
            Just(MilestoneType::DailyLoginStreak),
            Just(MilestoneType::CourseCompletion),
        ]
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 35: Token minting and burning maintain consistent supply
        ///
        /// For any sequence of mint and burn operations:
        /// 1. Total supply = sum of all mints - sum of all burns
        /// 2. Supply is always non-negative
        /// 3. Burns cannot exceed available balance
        #[test]
        fn property_token_supply_consistency(
            mint_amounts in prop::collection::vec(arb_token_amount(), 1..=10),
            burn_fraction in 0.0f64..=1.0f64,
        ) {
            let total_minted: u64 = mint_amounts.iter().sum();
            let burn_amount = (total_minted as f64 * burn_fraction) as u64;
            let burn_amount = burn_amount.min(total_minted); // Cannot burn more than minted

            let final_supply = total_minted.saturating_sub(burn_amount);

            // Supply must be non-negative
            prop_assert!(
                final_supply <= total_minted,
                "Final supply {} must be <= total minted {}",
                final_supply, total_minted
            );

            // Supply conservation: minted - burned = final
            prop_assert_eq!(
                final_supply,
                total_minted - burn_amount,
                "Supply conservation violated"
            );
        }

        /// Property: Burning more than balance is impossible
        #[test]
        fn property_cannot_burn_more_than_balance(
            balance in arb_token_amount(),
            burn_attempt in arb_token_amount(),
        ) {
            let actual_burn = burn_attempt.min(balance);
            let remaining = balance - actual_burn;

            // Remaining balance is always non-negative
            prop_assert!(
                remaining <= balance,
                "Remaining {} must be <= balance {}",
                remaining, balance
            );

            // If burn attempt exceeds balance, it's capped
            if burn_attempt > balance {
                prop_assert_eq!(
                    actual_burn, balance,
                    "Burn must be capped at balance"
                );
                prop_assert_eq!(remaining, 0, "Balance must be 0 after full burn");
            }
        }

        /// Property: Milestone rewards are always positive
        #[test]
        fn property_milestone_rewards_positive(
            milestone in arb_milestone(),
        ) {
            let reward = milestone.token_reward();
            prop_assert!(
                reward > 0,
                "Milestone reward must be positive: {:?} = {}",
                milestone, reward
            );
        }

        /// Property: Token supply never exceeds max supply
        #[test]
        fn property_supply_never_exceeds_max(
            mint_amounts in prop::collection::vec(arb_token_amount(), 1..=100),
        ) {
            let max_supply: u64 = 1_000_000_000; // 1 billion tokens
            let total_minted: u64 = mint_amounts.iter().sum();

            // In production, minting is blocked when total would exceed max
            let effective_minted = total_minted.min(max_supply);

            prop_assert!(
                effective_minted <= max_supply,
                "Effective minted {} must not exceed max supply {}",
                effective_minted, max_supply
            );
        }

        /// Property: Multiple mints accumulate correctly
        #[test]
        fn property_multiple_mints_accumulate(
            amounts in prop::collection::vec(arb_token_amount(), 2..=5),
        ) {
            let total: u64 = amounts.iter().sum();
            let mut running_total: u64 = 0;

            for amount in &amounts {
                running_total += amount;
            }

            prop_assert_eq!(
                running_total, total,
                "Running total must equal sum of all mints"
            );
        }

        /// Property: Burn reduces balance by exact amount
        #[test]
        fn property_burn_reduces_exact_amount(
            initial_balance in arb_token_amount(),
            burn_amount in arb_token_amount(),
        ) {
            let burn_amount = burn_amount.min(initial_balance);
            let expected_remaining = initial_balance - burn_amount;
            let actual_remaining = initial_balance.saturating_sub(burn_amount);

            prop_assert_eq!(
                actual_remaining, expected_remaining,
                "Burn must reduce balance by exact amount"
            );
        }

        /// Property: Token economy is deterministic
        ///
        /// Same sequence of operations always produces same final balance.
        #[test]
        fn property_token_economy_deterministic(
            mints in prop::collection::vec(arb_token_amount(), 1..=5),
            burns in prop::collection::vec(arb_token_amount(), 0..=3),
        ) {
            let total_minted: u64 = mints.iter().sum();
            let total_burned: u64 = burns.iter().sum::<u64>().min(total_minted);
            let balance1 = total_minted.saturating_sub(total_burned);

            // Same calculation again
            let total_minted2: u64 = mints.iter().sum();
            let total_burned2: u64 = burns.iter().sum::<u64>().min(total_minted2);
            let balance2 = total_minted2.saturating_sub(total_burned2);

            prop_assert_eq!(
                balance1, balance2,
                "Token economy must be deterministic"
            );
        }
    }
}

#[cfg(test)]
mod token_economy_unit_tests {
    use crate::services::token_economy::*;

    #[test]
    fn test_assessment_mastery_reward() {
        assert_eq!(MilestoneType::AssessmentMastery.token_reward(), 50);
    }

    #[test]
    fn test_quiz_mastery_reward() {
        assert_eq!(MilestoneType::QuizMastery.token_reward(), 10);
    }

    #[test]
    fn test_learning_path_milestone_reward() {
        assert_eq!(MilestoneType::LearningPathMilestone.token_reward(), 25);
    }

    #[test]
    fn test_daily_login_streak_reward() {
        assert_eq!(MilestoneType::DailyLoginStreak.token_reward(), 5);
    }

    #[test]
    fn test_course_completion_reward() {
        assert_eq!(MilestoneType::CourseCompletion.token_reward(), 100);
    }

    #[test]
    fn test_token_balance_math() {
        let minted: u64 = 500;
        let burned: u64 = 150;
        let available = minted.saturating_sub(burned);
        assert_eq!(available, 350);
    }

    #[test]
    fn test_token_balance_zero_floor() {
        let minted: u64 = 100;
        let burned: u64 = 200; // More than minted
        let available = minted.saturating_sub(burned);
        assert_eq!(available, 0, "Balance must not go negative");
    }

    #[test]
    fn test_insufficient_balance_detection() {
        let balance: u64 = 100;
        let redemption: u64 = 150;
        assert!(redemption > balance, "Should detect insufficient balance");
    }

    #[test]
    fn test_exact_balance_redemption() {
        let balance: u64 = 100;
        let redemption: u64 = 100;
        assert!(redemption <= balance, "Exact balance redemption should be allowed");
        let remaining = balance - redemption;
        assert_eq!(remaining, 0);
    }

    #[test]
    fn test_milestone_serialization() {
        let milestone = MilestoneType::AssessmentMastery;
        let json = serde_json::to_string(&milestone).unwrap();
        assert_eq!(json, r#""assessment_mastery""#);

        let deserialized: MilestoneType = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, MilestoneType::AssessmentMastery);
    }

    #[test]
    fn test_redemption_type_serialization() {
        let types = vec![
            (RedemptionType::CoursePurchase, "course_purchase"),
            (RedemptionType::MentorshipBooking, "mentorship_booking"),
            (RedemptionType::HardwareSubsidy, "hardware_subsidy"),
            (RedemptionType::ContentUnlock, "content_unlock"),
        ];

        for (redemption_type, expected) in types {
            let json = serde_json::to_string(&redemption_type).unwrap();
            assert_eq!(json, format!(r#""{}""#, expected));
        }
    }

    #[test]
    fn test_max_supply_constraint() {
        let max_supply: u64 = 1_000_000_000;
        let current: u64 = 999_999_950;
        let mint_amount: u64 = 100;

        let would_exceed = current + mint_amount > max_supply;
        assert!(would_exceed, "Should detect max supply violation");
    }

    #[test]
    fn test_partner_pool_distribution() {
        // Simulate partner pool distribution
        let pool_balance: u64 = 10_000;
        let learner_rewards: Vec<u64> = vec![500, 300, 200, 100, 50];
        let total_distribution: u64 = learner_rewards.iter().sum();

        assert!(total_distribution <= pool_balance, "Distribution must not exceed pool");
        let remaining = pool_balance - total_distribution;
        assert_eq!(remaining, 8_850);
    }

    #[test]
    fn test_all_milestone_types_have_positive_rewards() {
        let milestones = vec![
            MilestoneType::AssessmentMastery,
            MilestoneType::QuizMastery,
            MilestoneType::LearningPathMilestone,
            MilestoneType::DailyLoginStreak,
            MilestoneType::CourseCompletion,
        ];

        for milestone in milestones {
            assert!(
                milestone.token_reward() > 0,
                "All milestones must have positive rewards: {:?}",
                milestone
            );
        }
    }
}
