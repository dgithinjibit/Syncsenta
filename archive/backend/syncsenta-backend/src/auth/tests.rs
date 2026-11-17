//! Unit tests for DID authentication module

#[cfg(test)]
mod tests {
    use super::super::*;
    use chrono::Utc;
    use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole};
    use uuid::Uuid;

    fn create_test_user() -> UserProfile {
        UserProfile {
            id: Uuid::new_v4(),
            did: Some("did:key:z6MkTest123".to_string()),
            email: "test@example.com".to_string(),
            phone: None,
            role: UserRole::Teacher,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            school_id: Some(Uuid::new_v4()),
            county_id: None,
            language_preference: SupportedLanguage::En,
            wallet_address: None,
            mfa_enabled: false,
            created_at: Utc::now(),
        }
    }

    #[test]
    fn test_generate_did_key() {
        let user_id = Uuid::new_v4();
        let did = did::generate_did(user_id, did::DIDMethod::Key);
        assert!(did.starts_with("did:key:z"));
    }

    #[test]
    fn test_generate_did_web() {
        let user_id = Uuid::new_v4();
        let did = did::generate_did(user_id, did::DIDMethod::Web);
        assert!(did.starts_with("did:web:syncsenta.education:users:"));
    }

    #[test]
    fn test_resolve_did() {
        let user_id = Uuid::new_v4();
        let did_str = did::generate_did(user_id, did::DIDMethod::Key);
        let doc = did::resolve_did(&did_str);
        assert!(doc.is_ok());
        let doc = doc.unwrap();
        assert_eq!(doc.id, did_str);
        assert!(!doc.verification_method.is_empty());
    }

    #[test]
    fn test_issue_credential() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc_result = vc::issue_credential(&user, issuer_did);
        assert!(vc_result.is_ok());
        
        let vc = vc_result.unwrap();
        assert_eq!(vc.issuer, issuer_did);
        assert_eq!(vc.credential_subject.role, UserRole::Teacher);
    }

    #[test]
    fn test_verify_credential() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = vc::issue_credential(&user, issuer_did).unwrap();
        let result = vc::verify_credential(&vc);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[test]
    fn test_create_presentation() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = vc::issue_credential(&user, issuer_did).unwrap();
        let vp = vc::create_presentation(vec![vc], user.did.as_ref().unwrap());
        
        assert!(vp.is_ok());
        let vp = vp.unwrap();
        assert_eq!(vp.verifiable_credential.len(), 1);
    }

    #[test]
    fn test_verify_presentation() {
        let user = create_test_user();
        let issuer_did = "did:key:z6MkIssuer456";
        
        let vc = vc::issue_credential(&user, issuer_did).unwrap();
        let vp = vc::create_presentation(vec![vc], user.did.as_ref().unwrap()).unwrap();
        
        let result = vc::verify_presentation(&vp);
        assert!(result.is_ok());
    }
}
