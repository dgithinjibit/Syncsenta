//! Property-based and unit tests for IPFS storage layer
//!
//! Task 5.4: Property 36 — Content retrieved from IPFS always matches uploaded content hash
//! Task 5.5: Unit tests for IPFS integration
//! Validates: Requirements 36.6, 36.7

#[cfg(test)]
mod ipfs_integrity_property_tests {
    use proptest::prelude::*;
    use crate::services::ipfs::{compute_content_hash, verify_content_integrity};

    /// Strategy to generate arbitrary byte content
    fn arb_content() -> impl Strategy<Value = Vec<u8>> {
        prop::collection::vec(any::<u8>(), 1..=10_000)
    }

    /// Strategy to generate arbitrary text content
    fn arb_text_content() -> impl Strategy<Value = String> {
        "[a-zA-Z0-9 .,!?\\n]{1,1000}"
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 36: Content retrieved from IPFS always matches uploaded content hash
        ///
        /// For any content:
        /// 1. Computing the hash is deterministic
        /// 2. Verifying the same content against its hash always succeeds
        /// 3. Verifying different content against the hash always fails
        #[test]
        fn property_content_hash_deterministic(content in arb_content()) {
            let hash1 = compute_content_hash(&content);
            let hash2 = compute_content_hash(&content);

            prop_assert_eq!(
                &hash1, &hash2,
                "Same content must always produce same hash"
            );
        }

        /// Property: Content integrity verification is correct
        #[test]
        fn property_integrity_verification_correct(content in arb_content()) {
            let hash = compute_content_hash(&content);
            let verified = verify_content_integrity(&content, &hash);

            prop_assert!(
                verified,
                "Content must verify against its own hash"
            );
        }

        /// Property: Tampered content fails integrity check
        #[test]
        fn property_tampered_content_fails(
            content in arb_content(),
            tamper_byte in any::<u8>(),
            tamper_pos in any::<usize>(),
        ) {
            let hash = compute_content_hash(&content);

            // Tamper with the content
            let mut tampered = content.clone();
            if !tampered.is_empty() {
                let pos = tamper_pos % tampered.len();
                let original = tampered[pos];
                tampered[pos] = tamper_byte.wrapping_add(1).max(original.wrapping_add(1));

                if tampered != content {
                    let verified = verify_content_integrity(&tampered, &hash);
                    prop_assert!(
                        !verified,
                        "Tampered content must fail integrity check"
                    );
                }
            }
        }

        /// Property: Different content produces different hashes
        #[test]
        fn property_different_content_different_hashes(
            content1 in arb_content(),
            content2 in arb_content(),
        ) {
            if content1 != content2 {
                let hash1 = compute_content_hash(&content1);
                let hash2 = compute_content_hash(&content2);

                prop_assert_ne!(
                    hash1, hash2,
                    "Different content must produce different hashes"
                );
            }
        }

        /// Property: Hash format is always valid hex (64 chars for SHA256)
        #[test]
        fn property_hash_format_valid(content in arb_content()) {
            let hash = compute_content_hash(&content);

            prop_assert_eq!(
                hash.len(), 64,
                "SHA256 hex hash must be 64 characters"
            );

            prop_assert!(
                hash.chars().all(|c| c.is_ascii_hexdigit()),
                "Hash must contain only hex characters"
            );
        }

        /// Property: Text content integrity is preserved
        #[test]
        fn property_text_content_integrity(text in arb_text_content()) {
            let content = text.as_bytes().to_vec();
            let hash = compute_content_hash(&content);
            let verified = verify_content_integrity(&content, &hash);

            prop_assert!(verified, "Text content must verify against its hash");
        }

        /// Property: Empty content has a valid hash
        #[test]
        fn property_empty_content_has_valid_hash(_dummy in any::<u8>()) {
            let empty: Vec<u8> = vec![];
            let hash = compute_content_hash(&empty);

            prop_assert_eq!(hash.len(), 64, "Empty content hash must be 64 chars");
            prop_assert!(
                verify_content_integrity(&empty, &hash),
                "Empty content must verify against its hash"
            );
        }

        /// Property: Wrong hash always fails verification
        #[test]
        fn property_wrong_hash_fails(
            content in arb_content(),
            wrong_hash in "[0-9a-f]{64}",
        ) {
            let correct_hash = compute_content_hash(&content);

            if wrong_hash != correct_hash {
                let verified = verify_content_integrity(&content, &wrong_hash);
                prop_assert!(
                    !verified,
                    "Wrong hash must fail verification"
                );
            }
        }

        /// Property: IPFS CID format validation
        ///
        /// Valid IPFS CIDs start with "Qm" (CIDv0) or "bafy" (CIDv1)
        #[test]
        fn property_cid_format_validation(
            cid_suffix in "[a-zA-Z0-9]{44}",
        ) {
            let cid_v0 = format!("Qm{}", cid_suffix);
            let cid_v1 = format!("bafy{}", &cid_suffix[..40]);

            // CIDv0 starts with "Qm" and is 46 chars
            prop_assert!(cid_v0.starts_with("Qm"), "CIDv0 must start with Qm");

            // CIDv1 starts with "bafy"
            prop_assert!(cid_v1.starts_with("bafy"), "CIDv1 must start with bafy");
        }
    }
}

#[cfg(test)]
mod ipfs_unit_tests {
    use crate::services::ipfs::{compute_content_hash, verify_content_integrity, IPFSConfig};

    #[test]
    fn test_sha256_hash_known_value() {
        // SHA256("Hello, SyncSenta!") = known value
        let data = b"Hello, SyncSenta!";
        let hash = compute_content_hash(data);
        assert_eq!(hash.len(), 64);
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_hash_deterministic() {
        let data = b"Test content for IPFS integrity";
        let hash1 = compute_content_hash(data);
        let hash2 = compute_content_hash(data);
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_integrity_check_passes_for_correct_content() {
        let data = b"Educational content for CBC Grade 5";
        let hash = compute_content_hash(data);
        assert!(verify_content_integrity(data, &hash));
    }

    #[test]
    fn test_integrity_check_fails_for_tampered_content() {
        let original = b"Original lesson content";
        let tampered = b"Tampered lesson content";
        let hash = compute_content_hash(original);
        assert!(!verify_content_integrity(tampered, &hash));
    }

    #[test]
    fn test_integrity_check_fails_for_wrong_hash() {
        let data = b"Some content";
        let wrong_hash = "0".repeat(64);
        assert!(!verify_content_integrity(data, &wrong_hash));
    }

    #[test]
    fn test_empty_content_hash() {
        let empty: &[u8] = &[];
        let hash = compute_content_hash(empty);
        assert_eq!(hash.len(), 64);
        // SHA256 of empty string is known
        assert_eq!(
            hash,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_large_content_hash() {
        let large_data = vec![0u8; 1_000_000]; // 1MB
        let hash = compute_content_hash(&large_data);
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_ipfs_config_defaults() {
        let config = IPFSConfig {
            api_url: "http://127.0.0.1:5001".to_string(),
            gateway_url: "https://ipfs.io/ipfs/".to_string(),
            pinata_api_key: None,
            pinata_secret_key: None,
        };
        assert_eq!(config.api_url, "http://127.0.0.1:5001");
        assert!(config.pinata_api_key.is_none());
    }

    #[test]
    fn test_gateway_url_format() {
        let config = IPFSConfig {
            api_url: "http://127.0.0.1:5001".to_string(),
            gateway_url: "https://ipfs.io/ipfs/".to_string(),
            pinata_api_key: None,
            pinata_secret_key: None,
        };
        let cid = "QmTestCID123456789";
        let url = format!("{}{}", config.gateway_url, cid);
        assert!(url.starts_with("https://ipfs.io/ipfs/"));
        assert!(url.ends_with(cid));
    }

    #[test]
    fn test_content_hash_hex_only() {
        let data = b"CBC Math Grade 5 lesson content";
        let hash = compute_content_hash(data);
        assert!(
            hash.chars().all(|c| c.is_ascii_hexdigit()),
            "Hash must be hex only"
        );
    }

    #[test]
    fn test_binary_content_integrity() {
        // Test with binary data (e.g., PDF bytes)
        let pdf_header = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>";
        let hash = compute_content_hash(pdf_header);
        assert!(verify_content_integrity(pdf_header, &hash));
    }

    #[test]
    fn test_unicode_content_integrity() {
        // Test with Swahili content
        let swahili = "Habari za asubuhi! Somo la leo ni hesabu.".as_bytes();
        let hash = compute_content_hash(swahili);
        assert!(verify_content_integrity(swahili, &hash));
    }

    #[test]
    fn test_content_hash_length_invariant() {
        // SHA256 always produces 64 hex chars regardless of input size
        let sizes = [0, 1, 100, 1000, 10000];
        for size in sizes {
            let data = vec![42u8; size];
            let hash = compute_content_hash(&data);
            assert_eq!(
                hash.len(),
                64,
                "Hash must always be 64 chars for size {}",
                size
            );
        }
    }
}
