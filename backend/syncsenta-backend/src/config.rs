use anyhow::Result;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub port: u16,
    pub openai_api_key: String,
    pub gemini_api_key: String,
    pub elevenlabs_api_key: String,
    pub mpesa_consumer_key: String,
    pub mpesa_consumer_secret: String,
    pub mpesa_shortcode: String,
    pub mpesa_passkey: String,
    pub mpesa_callback_url: String,
    pub africas_talking_api_key: String,
    pub africas_talking_username: String,
    pub jitsi_secret: String,
    pub jitsi_domain: String,
    pub storage_bucket: String,
    pub smtp_host: String,
    pub smtp_user: String,
    pub smtp_password: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            database_url: String::new(),
            redis_url: "redis://127.0.0.1:6379".into(),
            jwt_secret: String::new(),
            port: 8080,
            openai_api_key: String::new(),
            gemini_api_key: String::new(),
            elevenlabs_api_key: String::new(),
            mpesa_consumer_key: String::new(),
            mpesa_consumer_secret: String::new(),
            mpesa_shortcode: String::new(),
            mpesa_passkey: String::new(),
            mpesa_callback_url: String::new(),
            africas_talking_api_key: String::new(),
            africas_talking_username: String::new(),
            jitsi_secret: String::new(),
            jitsi_domain: "meet.jit.si".into(),
            storage_bucket: String::new(),
            smtp_host: String::new(),
            smtp_user: String::new(),
            smtp_password: String::new(),
        }
    }
}

impl AppConfig {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            database_url: std::env::var("DATABASE_URL")?,
            redis_url: std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            jwt_secret: std::env::var("JWT_SECRET")?,
            port: std::env::var("PORT").unwrap_or_else(|_| "8080".into()).parse()?,
            openai_api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
            gemini_api_key: std::env::var("GEMINI_API_KEY").unwrap_or_default(),
            elevenlabs_api_key: std::env::var("ELEVENLABS_API_KEY").unwrap_or_default(),
            mpesa_consumer_key: std::env::var("MPESA_CONSUMER_KEY").unwrap_or_default(),
            mpesa_consumer_secret: std::env::var("MPESA_CONSUMER_SECRET").unwrap_or_default(),
            mpesa_shortcode: std::env::var("MPESA_SHORTCODE").unwrap_or_default(),
            mpesa_passkey: std::env::var("MPESA_PASSKEY").unwrap_or_default(),
            mpesa_callback_url: std::env::var("MPESA_CALLBACK_URL").unwrap_or_default(),
            africas_talking_api_key: std::env::var("AT_API_KEY").unwrap_or_default(),
            africas_talking_username: std::env::var("AT_USERNAME").unwrap_or_default(),
            jitsi_secret: std::env::var("JITSI_SECRET").unwrap_or_default(),
            jitsi_domain: std::env::var("JITSI_DOMAIN").unwrap_or_else(|_| "meet.jit.si".into()),
            storage_bucket: std::env::var("STORAGE_BUCKET").unwrap_or_default(),
            smtp_host: std::env::var("SMTP_HOST").unwrap_or_default(),
            smtp_user: std::env::var("SMTP_USER").unwrap_or_default(),
            smtp_password: std::env::var("SMTP_PASSWORD").unwrap_or_default(),
        })
    }
}
