use anyhow::{anyhow, Result};
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use syncsenta_common::models::{ApprovalStatus, SupportedLanguage, UserProfile, UserRole};

// ─── JWT Claims ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,       // user id
    pub role: UserRole,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language: SupportedLanguage,
    pub wallet_address: Option<String>,
    pub mfa_verified: bool,
    pub exp: i64,
    pub iat: i64,
}

// ─── Request / Response DTOs ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub phone: Option<String>,
    pub role: UserRole,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: Option<SupportedLanguage>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
    pub totp_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserProfilePublic,
    pub mfa_required: bool,
}

#[derive(Debug, Serialize)]
pub struct UserProfilePublic {
    pub id: Uuid,
    pub email: String,
    pub phone: Option<String>,
    pub role: UserRole,
    pub approval_status: ApprovalStatus,
    pub school_id: Option<Uuid>,
    pub county_id: Option<Uuid>,
    pub language_preference: SupportedLanguage,
    pub mfa_enabled: bool,
}

// ─── Password Hashing ────────────────────────────────────────────────────────

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow!("Password hashing failed: {}", e))?
        .to_string();
    Ok(hash)
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    let parsed = PasswordHash::new(hash).map_err(|e| anyhow!("Invalid hash: {}", e))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

// ─── JWT ─────────────────────────────────────────────────────────────────────

pub fn generate_token(
    user: &UserProfile,
    jwt_secret: &str,
    mfa_verified: bool,
) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub: user.id.to_string(),
        role: user.role.clone(),
        school_id: user.school_id,
        county_id: user.county_id,
        language: user.language_preference.clone(),
        wallet_address: user.wallet_address.clone(),
        mfa_verified,
        iat: now.timestamp(),
        exp: (now + Duration::hours(24)).timestamp(),
    };
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )?;
    Ok(token)
}

pub fn validate_token(token: &str, jwt_secret: &str) -> Result<Claims> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(data.claims)
}

// ─── Registration ─────────────────────────────────────────────────────────────

pub async fn register_user(
    db: &PgPool,
    req: RegisterRequest,
) -> Result<UserProfile> {
    // Check email uniqueness
    let exists: bool = sqlx::query_scalar!(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)",
        req.email
    )
    .fetch_one(db)
    .await?
    .unwrap_or(false);

    if exists {
        return Err(anyhow!("Email already registered"));
    }

    let password_hash = hash_password(&req.password)?;
    let id = Uuid::new_v4();

    // NationalAdmin auto-approved; everyone else starts Pending
    let approval_status = match req.role {
        UserRole::NationalAdmin => ApprovalStatus::Approved,
        _ => ApprovalStatus::Pending,
    };

    let lang = req.language_preference.unwrap_or(SupportedLanguage::En);
    let lang_str = serde_json::to_string(&lang)?.trim_matches('"').to_string();
    let role_str = serde_json::to_string(&req.role)?.trim_matches('"').to_string();
    let status_str = serde_json::to_string(&approval_status)?.trim_matches('"').to_string();

    sqlx::query!(
        r#"
        INSERT INTO users
            (id, email, phone, role, approval_status, school_id, county_id,
             language_preference, password_hash, mfa_enabled, created_at, updated_at)
        VALUES ($1,$2,$3,$4::user_role,$5::approval_status,$6,$7,$8::supported_language,$9,false,NOW(),NOW())
        "#,
        id,
        req.email,
        req.phone,
        role_str as _,
        status_str as _,
        req.school_id,
        req.county_id,
        lang_str as _,
        password_hash,
    )
    .execute(db)
    .await?;

    Ok(UserProfile {
        id,
        did: None,  // Will be set when migrating to DID auth
        email: req.email,
        phone: req.phone,
        role: req.role,
        approval_status,
        approved_by: None,
        school_id: req.school_id,
        county_id: req.county_id,
        language_preference: lang,
        wallet_address: None,
        mfa_enabled: false,
        created_at: Utc::now(),
    })
}

// ─── Login ────────────────────────────────────────────────────────────────────

pub async fn login_user(
    db: &PgPool,
    jwt_secret: &str,
    req: LoginRequest,
) -> Result<AuthResponse> {
    // Fetch user
    let row = sqlx::query!(
        r#"
        SELECT id, email, phone, role as "role: String", approval_status as "approval_status: String",
               approved_by, school_id, county_id, language_preference as "language_preference: String",
               password_hash, mfa_enabled, mfa_secret, wallet_address, created_at
        FROM users WHERE email = $1
        "#,
        req.email
    )
    .fetch_optional(db)
    .await?
    .ok_or_else(|| anyhow!("Invalid credentials"))?;

    // Verify password
    if !verify_password(&req.password, &row.password_hash)? {
        return Err(anyhow!("Invalid credentials"));
    }

    let role: UserRole = serde_json::from_value(serde_json::Value::String(row.role))?;
    let approval_status: ApprovalStatus =
        serde_json::from_value(serde_json::Value::String(row.approval_status))?;
    let language: SupportedLanguage =
        serde_json::from_value(serde_json::Value::String(row.language_preference))?;

    // Block pending/rejected accounts
    if approval_status != ApprovalStatus::Approved {
        return Err(anyhow!("Account not yet approved"));
    }

    // MFA check for privileged roles
    let mfa_required = row.mfa_enabled
        && matches!(
            role,
            UserRole::SchoolAdmin
                | UserRole::SchoolHead
                | UserRole::CountyOfficer
                | UserRole::NationalAdmin
        );

    let mut mfa_verified = false;
    if mfa_required {
        let code = req
            .totp_code
            .ok_or_else(|| anyhow!("MFA code required"))?;
        let secret = row
            .mfa_secret
            .ok_or_else(|| anyhow!("MFA not configured"))?;
        if !verify_totp(&secret, &code)? {
            return Err(anyhow!("Invalid MFA code"));
        }
        mfa_verified = true;
    }

    let profile = UserProfile {
        id: row.id,
        did: None,  // Will be set when migrating to DID auth
        email: row.email.clone(),
        phone: row.phone.clone(),
        role: role.clone(),
        approval_status: approval_status.clone(),
        approved_by: row.approved_by,
        school_id: row.school_id,
        county_id: row.county_id,
        language_preference: language.clone(),
        wallet_address: row.wallet_address.clone(),
        mfa_enabled: row.mfa_enabled,
        created_at: row.created_at,
    };

    let token = generate_token(&profile, jwt_secret, mfa_verified)?;

    Ok(AuthResponse {
        token,
        mfa_required: mfa_required && !mfa_verified,
        user: UserProfilePublic {
            id: profile.id,
            email: profile.email,
            phone: profile.phone,
            role,
            approval_status,
            school_id: profile.school_id,
            county_id: profile.county_id,
            language_preference: language,
            mfa_enabled: profile.mfa_enabled,
        },
    })
}

// ─── TOTP / MFA ───────────────────────────────────────────────────────────────

pub fn generate_totp_secret() -> String {
    use totp_rs::Secret;
    Secret::generate_secret().to_string()
}

pub fn get_totp_qr_url(secret: &str, email: &str) -> Result<String> {
    use totp_rs::{Algorithm, TOTP};
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret.as_bytes().to_vec(),
        Some("SyncSenta".to_string()),
        email.to_string(),
    )
    .map_err(|e| anyhow!("TOTP setup error: {:?}", e))?;
    Ok(totp.get_url())
}

pub fn verify_totp(secret: &str, code: &str) -> Result<bool> {
    use totp_rs::{Algorithm, TOTP};
    let totp = TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret.as_bytes().to_vec(),
        Some("SyncSenta".to_string()),
        String::new(),
    )
    .map_err(|e| anyhow!("TOTP error: {:?}", e))?;
    Ok(totp.check_current(code).unwrap_or(false))
}

pub async fn enable_mfa(db: &PgPool, user_id: Uuid, secret: &str) -> Result<()> {
    sqlx::query!(
        "UPDATE users SET mfa_secret = $1, mfa_enabled = true, updated_at = NOW() WHERE id = $2",
        secret,
        user_id
    )
    .execute(db)
    .await?;
    Ok(())
}
