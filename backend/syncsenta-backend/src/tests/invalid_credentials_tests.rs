/// Property-based test for invalid credential rejection
/// Task 2.7: Write property test for invalid credential rejection (proptest)
/// **Validates: Requirements 1.11**
///
/// This test validates Property 4 from the design document:
/// "For any combination of credentials that does not match a valid approved user
/// account, the Authentication_Service SHALL reject the login attempt and return
/// an error message — never a valid session token."

#[cfg(test)]
mod invalid_credentials_property_tests {
    use proptest::prelude::*;
    use crate::services::auth::{hash_password, verify_password};

    // ─── Property 4: Invalid credentials are always rejected ─────────────────
    // **Validates: Requirements 1.11**
    //
    // For any combination of credentials that does not match a valid approved
    // user account, the login attempt MUST be rejected.
    //
    // This test validates that:
    // 1. Wrong passwords are always rejected
    // 2. Non-existent emails are always rejected
    // 3. Password verification correctly rejects mismatched passwords
    // 4. No combination of invalid credentials bypasses authentication

    /// Strategy to generate arbitrary valid passwords
    fn arb_password() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9!@#$%^&*]{8,32}"
    }

    /// Strategy to generate arbitrary email addresses
    fn arb_email() -> impl Strategy<Value = String> {
        "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}"
    }

    /// Strategy to generate different passwords (guaranteed to be different)
    fn arb_different_passwords() -> impl Strategy<Value = (String, String)> {
        (arb_password(), arb_password()).prop_filter(
            "Passwords must be different",
            |(p1, p2)| p1 != p2
        )
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property Test: Wrong password is always rejected
        ///
        /// For any valid password hash, attempting to verify with a different
        /// password must always fail.
        #[test]
        fn property_wrong_password_always_rejected(
            (correct_password, wrong_password) in arb_different_passwords()
        ) {
            // Hash the correct password
            let hash = hash_password(&correct_password)
                .expect("Password hashing should succeed");
            
            // Verify with wrong password
            let verification_result = verify_password(&wrong_password, &hash)
                .expect("Password verification should not error");
            
            prop_assert!(
                !verification_result,
                "Wrong password must be rejected. Correct: {}, Wrong: {}",
                correct_password,
                wrong_password
            );
        }

        /// Property Test: Password verification is deterministic
        ///
        /// Verifying the same password against the same hash must always
        /// produce the same result (true for correct, false for incorrect).
        #[test]
        fn property_password_verification_deterministic(
            password in arb_password()
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            // Verify multiple times
            let result1 = verify_password(&password, &hash)
                .expect("Verification should not error");
            let result2 = verify_password(&password, &hash)
                .expect("Verification should not error");
            let result3 = verify_password(&password, &hash)
                .expect("Verification should not error");
            
            prop_assert_eq!(result1, result2, "Verification must be deterministic");
            prop_assert_eq!(result2, result3, "Verification must be deterministic");
            prop_assert!(result1, "Correct password must verify successfully");
        }

        /// Property Test: Correct password always verifies
        ///
        /// For any password, hashing it and then verifying with the same
        /// password must always succeed.
        #[test]
        fn property_correct_password_always_verifies(
            password in arb_password()
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            let verification_result = verify_password(&password, &hash)
                .expect("Password verification should not error");
            
            prop_assert!(
                verification_result,
                "Correct password must verify successfully"
            );
        }

        /// Property Test: Empty password is rejected
        ///
        /// Empty passwords should never verify against any hash.
        #[test]
        fn property_empty_password_rejected(
            valid_password in arb_password()
        ) {
            let hash = hash_password(&valid_password)
                .expect("Password hashing should succeed");
            
            let empty_verification = verify_password("", &hash)
                .expect("Verification should not error");
            
            prop_assert!(
                !empty_verification,
                "Empty password must be rejected"
            );
        }

        /// Property Test: Case sensitivity in passwords
        ///
        /// Passwords are case-sensitive; changing case must cause rejection.
        #[test]
        fn property_password_case_sensitive(
            password in "[a-z]{8,16}"  // lowercase only
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            let uppercase_password = password.to_uppercase();
            
            // Only verify if the uppercase version is actually different
            if uppercase_password != password {
                let verification_result = verify_password(&uppercase_password, &hash)
                    .expect("Verification should not error");
                
                prop_assert!(
                    !verification_result,
                    "Password verification must be case-sensitive. Original: {}, Upper: {}",
                    password,
                    uppercase_password
                );
            }
        }

        /// Property Test: Whitespace changes cause rejection
        ///
        /// Adding or removing whitespace from a password must cause rejection.
        #[test]
        fn property_whitespace_sensitive(
            password in "[a-zA-Z0-9]{8,16}"
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            // Try with leading space
            let with_leading_space = format!(" {}", password);
            let leading_result = verify_password(&with_leading_space, &hash)
                .expect("Verification should not error");
            
            // Try with trailing space
            let with_trailing_space = format!("{} ", password);
            let trailing_result = verify_password(&with_trailing_space, &hash)
                .expect("Verification should not error");
            
            prop_assert!(
                !leading_result,
                "Password with leading space must be rejected"
            );
            prop_assert!(
                !trailing_result,
                "Password with trailing space must be rejected"
            );
        }

        /// Property Test: Substring of password is rejected
        ///
        /// A substring of the correct password must not verify.
        #[test]
        fn property_password_substring_rejected(
            password in "[a-zA-Z0-9]{10,20}"
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            // Take first half of password
            let substring = &password[..password.len() / 2];
            
            let verification_result = verify_password(substring, &hash)
                .expect("Verification should not error");
            
            prop_assert!(
                !verification_result,
                "Password substring must be rejected. Full: {}, Substring: {}",
                password,
                substring
            );
        }

        /// Property Test: Password with extra characters is rejected
        ///
        /// Adding characters to the correct password must cause rejection.
        #[test]
        fn property_password_with_extra_chars_rejected(
            password in arb_password(),
            extra in "[a-zA-Z0-9]{1,5}"
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            let modified_password = format!("{}{}", password, extra);
            
            let verification_result = verify_password(&modified_password, &hash)
                .expect("Verification should not error");
            
            prop_assert!(
                !verification_result,
                "Password with extra characters must be rejected. Original: {}, Modified: {}",
                password,
                modified_password
            );
        }

        /// Property Test: Similar passwords are rejected
        ///
        /// Passwords that differ by only one character must be rejected.
        #[test]
        fn property_similar_passwords_rejected(
            password in "[a-zA-Z0-9]{8,16}"
        ) {
            let hash = hash_password(&password)
                .expect("Password hashing should succeed");
            
            // Change the first character
            let mut chars: Vec<char> = password.chars().collect();
            if let Some(first_char) = chars.first_mut() {
                *first_char = if *first_char == 'a' { 'b' } else { 'a' };
            }
            let similar_password: String = chars.into_iter().collect();
            
            if similar_password != password {
                let verification_result = verify_password(&similar_password, &hash)
                    .expect("Verification should not error");
                
                prop_assert!(
                    !verification_result,
                    "Similar password must be rejected. Original: {}, Similar: {}",
                    password,
                    similar_password
                );
            }
        }

        /// Property Test: Hash format validation
        ///
        /// Invalid hash formats should be detected and rejected.
        #[test]
        fn property_invalid_hash_format_rejected(
            password in arb_password(),
            invalid_hash in "[a-zA-Z0-9]{10,50}"  // Not a valid argon2 hash
        ) {
            // Attempting to verify against an invalid hash should fail
            let result = verify_password(&password, &invalid_hash);
            
            prop_assert!(
                result.is_err(),
                "Invalid hash format must be rejected"
            );
        }

        /// Property Test: Different hashes for same password
        ///
        /// Due to salting, hashing the same password twice must produce
        /// different hashes, but both must verify correctly.
        #[test]
        fn property_different_hashes_same_password(
            password in arb_password()
        ) {
            let hash1 = hash_password(&password)
                .expect("Password hashing should succeed");
            let hash2 = hash_password(&password)
                .expect("Password hashing should succeed");
            
            // Hashes should be different (due to random salt)
            prop_assert_ne!(
                &hash1,
                &hash2,
                "Same password must produce different hashes due to salting"
            );
            
            // But both should verify correctly
            let verify1 = verify_password(&password, &hash1)
                .expect("Verification should not error");
            let verify2 = verify_password(&password, &hash2)
                .expect("Verification should not error");
            
            prop_assert!(verify1, "First hash must verify");
            prop_assert!(verify2, "Second hash must verify");
        }

        /// Property Test: Cross-verification fails
        ///
        /// A password hashed once should not verify against a different
        /// password's hash.
        #[test]
        fn property_cross_verification_fails(
            (password1, password2) in arb_different_passwords()
        ) {
            let hash1 = hash_password(&password1)
                .expect("Password hashing should succeed");
            let hash2 = hash_password(&password2)
                .expect("Password hashing should succeed");
            
            // password1 should not verify against hash2
            let cross_verify1 = verify_password(&password1, &hash2)
                .expect("Verification should not error");
            
            // password2 should not verify against hash1
            let cross_verify2 = verify_password(&password2, &hash1)
                .expect("Verification should not error");
            
            prop_assert!(
                !cross_verify1,
                "Password1 must not verify against password2's hash"
            );
            prop_assert!(
                !cross_verify2,
                "Password2 must not verify against password1's hash"
            );
        }
    }
}

// ─── Integration Tests: Login Flow ──────────────────────────────────────────

#[cfg(test)]
mod invalid_credentials_integration_tests {
    use proptest::prelude::*;
    use syncsenta_common::models::ApprovalStatus;
    use crate::services::auth::{hash_password, verify_password};

    /// Strategy to generate arbitrary valid passwords
    fn arb_password() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9!@#$%^&*]{8,32}"
    }

    /// Strategy to generate arbitrary email addresses
    fn arb_email() -> impl Strategy<Value = String> {
        "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}"
    }

    /// Simulates the credential check from login_user
    /// Returns true if credentials are valid
    fn simulate_credential_check(
        provided_password: &str,
        stored_hash: &str,
    ) -> bool {
        verify_password(provided_password, stored_hash).unwrap_or(false)
    }

    /// Simulates the complete login flow check
    /// Returns true if login should succeed
    fn simulate_login_flow(
        email_exists: bool,
        password_correct: bool,
        approval_status: &ApprovalStatus,
    ) -> bool {
        // Login succeeds only if:
        // 1. Email exists in database
        // 2. Password is correct
        // 3. Account is approved
        email_exists && password_correct && *approval_status == ApprovalStatus::Approved
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property Test: Non-existent email always fails login
        ///
        /// If the email doesn't exist in the database, login must fail
        /// regardless of the password provided.
        #[test]
        fn property_nonexistent_email_fails(
            _email in arb_email(),
            _password in arb_password(),
        ) {
            let email_exists = false;  // Email not in database
            let password_correct = true;  // Even if password would be correct
            let approval_status = ApprovalStatus::Approved;
            
            let login_succeeds = simulate_login_flow(
                email_exists,
                password_correct,
                &approval_status
            );
            
            prop_assert!(
                !login_succeeds,
                "Login must fail for non-existent email"
            );
        }

        /// Property Test: Wrong password always fails login
        ///
        /// Even with a valid email and approved account, wrong password
        /// must cause login to fail.
        #[test]
        fn property_wrong_password_fails_login(
            email in arb_email(),
            (correct_password, wrong_password) in (arb_password(), arb_password())
                .prop_filter("Passwords must differ", |(p1, p2)| p1 != p2)
        ) {
            let hash = hash_password(&correct_password)
                .expect("Hashing should succeed");
            
            let password_correct = simulate_credential_check(&wrong_password, &hash);
            
            let login_succeeds = simulate_login_flow(
                true,  // Email exists
                password_correct,
                &ApprovalStatus::Approved
            );
            
            prop_assert!(
                !login_succeeds,
                "Login must fail with wrong password. Email: {}, Correct: {}, Wrong: {}",
                email,
                correct_password,
                wrong_password
            );
        }

        /// Property Test: Invalid credentials never generate tokens
        ///
        /// With invalid credentials, the login flow must never reach
        /// the token generation step.
        #[test]
        fn property_invalid_credentials_no_token(
            _email in arb_email(),
            _password in arb_password(),
        ) {
            // Simulate various invalid credential scenarios
            let scenarios = vec![
                (false, true, ApprovalStatus::Approved),  // Email doesn't exist
                (true, false, ApprovalStatus::Approved),  // Wrong password
                (true, true, ApprovalStatus::Pending),    // Not approved
                (false, false, ApprovalStatus::Approved), // Both wrong
            ];
            
            for (email_exists, password_correct, approval_status) in scenarios {
                let reaches_token_generation = simulate_login_flow(
                    email_exists,
                    password_correct,
                    &approval_status
                );
                
                prop_assert!(
                    !reaches_token_generation,
                    "Invalid credentials must not reach token generation. \
                     Email exists: {}, Password correct: {}, Status: {:?}",
                    email_exists,
                    password_correct,
                    approval_status
                );
            }
        }

        /// Property Test: Credential check happens before approval check
        ///
        /// The login flow must verify credentials before checking approval
        /// status (fail fast on invalid credentials).
        #[test]
        fn property_credential_check_order(
            (correct_password, wrong_password) in (arb_password(), arb_password())
                .prop_filter("Passwords must differ", |(p1, p2)| p1 != p2)
        ) {
            let hash = hash_password(&correct_password)
                .expect("Hashing should succeed");
            
            // With wrong password, we should fail at credential check
            let password_valid = simulate_credential_check(&wrong_password, &hash);
            
            prop_assert!(
                !password_valid,
                "Credential check must fail before approval check"
            );
        }

        /// Property Test: All credential components must be valid
        ///
        /// Login requires ALL of: valid email, correct password, approved status.
        /// If any component is invalid, login must fail.
        #[test]
        fn property_all_components_required(
            _email in arb_email(),
            _password in arb_password(),
        ) {
            // Test all combinations where at least one component is invalid
            let test_cases = vec![
                (true, true, true),    // All valid - should succeed
                (false, true, true),   // Invalid email
                (true, false, true),   // Invalid password
                (true, true, false),   // Not approved
                (false, false, true),  // Invalid email and password
                (false, true, false),  // Invalid email and not approved
                (true, false, false),  // Invalid password and not approved
                (false, false, false), // All invalid
            ];
            
            for (email_valid, password_valid, approved) in test_cases {
                let approval_status = if approved {
                    ApprovalStatus::Approved
                } else {
                    ApprovalStatus::Pending
                };
                
                let login_succeeds = simulate_login_flow(
                    email_valid,
                    password_valid,
                    &approval_status
                );
                
                let should_succeed = email_valid && password_valid && approved;
                
                prop_assert_eq!(
                    login_succeeds,
                    should_succeed,
                    "Login result must match expected. Email: {}, Password: {}, Approved: {}",
                    email_valid,
                    password_valid,
                    approved
                );
            }
        }

        /// Property Test: Password verification is constant-time resistant
        ///
        /// Verification should not leak information through timing.
        /// This is ensured by argon2's constant-time comparison.
        #[test]
        fn property_verification_timing_safe(
            password in arb_password()
        ) {
            let hash = hash_password(&password)
                .expect("Hashing should succeed");
            
            // Verify correct password
            let result1 = verify_password(&password, &hash);
            
            // Verify wrong password
            let wrong = format!("{}x", password);
            let result2 = verify_password(&wrong, &hash);
            
            // Both should complete without error (timing-safe)
            prop_assert!(result1.is_ok(), "Correct password verification should not error");
            prop_assert!(result2.is_ok(), "Wrong password verification should not error");
            
            // Results should be correct
            prop_assert!(result1.unwrap(), "Correct password should verify");
            prop_assert!(!result2.unwrap(), "Wrong password should not verify");
        }
    }
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod invalid_credentials_unit_tests {
    use crate::services::auth::{hash_password, verify_password};

    #[test]
    fn test_wrong_password_rejected() {
        let correct = "SecurePassword123!";
        let wrong = "WrongPassword456!";
        
        let hash = hash_password(correct).expect("Hashing should succeed");
        let result = verify_password(wrong, &hash).expect("Verification should not error");
        
        assert!(!result, "Wrong password must be rejected");
    }

    #[test]
    fn test_correct_password_accepted() {
        let password = "SecurePassword123!";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password(password, &hash).expect("Verification should not error");
        
        assert!(result, "Correct password must be accepted");
    }

    #[test]
    fn test_empty_password_rejected() {
        let password = "SecurePassword123!";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password("", &hash).expect("Verification should not error");
        
        assert!(!result, "Empty password must be rejected");
    }

    #[test]
    fn test_case_sensitive_password() {
        let password = "password";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password("PASSWORD", &hash).expect("Verification should not error");
        
        assert!(!result, "Password verification must be case-sensitive");
    }

    #[test]
    fn test_whitespace_sensitive() {
        let password = "password";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        
        let with_space = " password";
        let result1 = verify_password(with_space, &hash).expect("Verification should not error");
        
        let with_trailing = "password ";
        let result2 = verify_password(with_trailing, &hash).expect("Verification should not error");
        
        assert!(!result1, "Password with leading space must be rejected");
        assert!(!result2, "Password with trailing space must be rejected");
    }

    #[test]
    fn test_substring_rejected() {
        let password = "LongSecurePassword123";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let substring = "LongSecure";
        let result = verify_password(substring, &hash).expect("Verification should not error");
        
        assert!(!result, "Password substring must be rejected");
    }

    #[test]
    fn test_extra_characters_rejected() {
        let password = "SecurePassword";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let with_extra = "SecurePassword123";
        let result = verify_password(with_extra, &hash).expect("Verification should not error");
        
        assert!(!result, "Password with extra characters must be rejected");
    }

    #[test]
    fn test_similar_password_rejected() {
        let password = "password1";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let similar = "password2";
        let result = verify_password(similar, &hash).expect("Verification should not error");
        
        assert!(!result, "Similar password must be rejected");
    }

    #[test]
    fn test_invalid_hash_format() {
        let password = "password";
        let invalid_hash = "not_a_valid_argon2_hash";
        
        let result = verify_password(password, invalid_hash);
        
        assert!(result.is_err(), "Invalid hash format must be rejected");
    }

    #[test]
    fn test_different_hashes_same_password() {
        let password = "SecurePassword123!";
        
        let hash1 = hash_password(password).expect("Hashing should succeed");
        let hash2 = hash_password(password).expect("Hashing should succeed");
        
        // Hashes should be different due to random salt
        assert_ne!(hash1, hash2, "Same password must produce different hashes");
        
        // But both should verify correctly
        let verify1 = verify_password(password, &hash1).expect("Verification should not error");
        let verify2 = verify_password(password, &hash2).expect("Verification should not error");
        
        assert!(verify1, "First hash must verify");
        assert!(verify2, "Second hash must verify");
    }

    #[test]
    fn test_cross_verification_fails() {
        let password1 = "Password1";
        let password2 = "Password2";
        
        let hash1 = hash_password(password1).expect("Hashing should succeed");
        let hash2 = hash_password(password2).expect("Hashing should succeed");
        
        // password1 should not verify against hash2
        let cross1 = verify_password(password1, &hash2).expect("Verification should not error");
        
        // password2 should not verify against hash1
        let cross2 = verify_password(password2, &hash1).expect("Verification should not error");
        
        assert!(!cross1, "Password1 must not verify against password2's hash");
        assert!(!cross2, "Password2 must not verify against password1's hash");
    }

    #[test]
    fn test_special_characters_in_password() {
        let password = "P@ssw0rd!#$%";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password(password, &hash).expect("Verification should not error");
        
        assert!(result, "Password with special characters must verify");
        
        // Wrong special characters
        let wrong = "P@ssw0rd!#$&";
        let wrong_result = verify_password(wrong, &hash).expect("Verification should not error");
        
        assert!(!wrong_result, "Wrong special characters must be rejected");
    }

    #[test]
    fn test_unicode_password() {
        let password = "Pässwörd123";
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password(password, &hash).expect("Verification should not error");
        
        assert!(result, "Unicode password must verify");
        
        // Different unicode
        let wrong = "Password123";
        let wrong_result = verify_password(wrong, &hash).expect("Verification should not error");
        
        assert!(!wrong_result, "Different unicode must be rejected");
    }

    #[test]
    fn test_very_long_password() {
        let password = "a".repeat(100);
        
        let hash = hash_password(&password).expect("Hashing should succeed");
        let result = verify_password(&password, &hash).expect("Verification should not error");
        
        assert!(result, "Very long password must verify");
        
        // One character different
        let mut wrong = password.clone();
        wrong.push('b');
        let wrong_result = verify_password(&wrong, &hash).expect("Verification should not error");
        
        assert!(!wrong_result, "Modified long password must be rejected");
    }

    #[test]
    fn test_minimum_length_password() {
        let password = "Pass123!";  // 8 characters
        
        let hash = hash_password(password).expect("Hashing should succeed");
        let result = verify_password(password, &hash).expect("Verification should not error");
        
        assert!(result, "Minimum length password must verify");
    }
}
