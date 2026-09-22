//! Notification service for SMS and email
//! Integrates with Africa's Talking SMS API and SMTP for email

use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use lettre::{
    Message, SmtpTransport, Transport,
    transport::smtp::authentication::Credentials,
};

use crate::config::AppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NotificationType {
    ApprovalApproved,
    ApprovalRejected,
    ApprovalPending,
}

/// Send SMS notification via Africa's Talking
pub async fn send_sms(
    config: &AppConfig,
    phone: &str,
    message: &str,
) -> Result<()> {
    if config.africas_talking_api_key.is_empty() {
        tracing::warn!("Africa's Talking API key not configured, skipping SMS");
        return Ok(());
    }

    let client = Client::new();
    let response = client
        .post("https://api.africastalking.com/version1/messaging")
        .header("apiKey", &config.africas_talking_api_key)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&[
            ("username", config.africas_talking_username.as_str()),
            ("to", phone),
            ("message", message),
        ])
        .send()
        .await?;

    if response.status().is_success() {
        tracing::info!("SMS sent successfully to {}", phone);
        Ok(())
    } else {
        let error = response.text().await?;
        tracing::error!("Failed to send SMS: {}", error);
        Err(anyhow::anyhow!("Failed to send SMS: {}", error))
    }
}

/// Send email notification via SMTP
pub async fn send_email(
    config: &AppConfig,
    to: &str,
    subject: &str,
    body: &str,
) -> Result<()> {
    if config.smtp_host.is_empty() {
        tracing::warn!("SMTP not configured, skipping email");
        return Ok(());
    }

    let email = Message::builder()
        .from(config.smtp_user.parse()?)
        .to(to.parse()?)
        .subject(subject)
        .body(body.to_string())?;

    let creds = Credentials::new(
        config.smtp_user.clone(),
        config.smtp_password.clone(),
    );

    let mailer = SmtpTransport::relay(&config.smtp_host)?
        .credentials(creds)
        .build();

    match mailer.send(&email) {
        Ok(_) => {
            tracing::info!("Email sent successfully to {}", to);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to send email: {}", e);
            Err(anyhow::anyhow!("Failed to send email: {}", e))
        }
    }
}

/// Send approval notification (SMS + Email)
pub async fn send_approval_notification(
    config: &AppConfig,
    email: &str,
    phone: Option<&str>,
    notification_type: NotificationType,
    role: &str,
) -> Result<()> {
    let (subject, message) = match notification_type {
        NotificationType::ApprovalApproved => (
            "SyncSenta Account Approved",
            format!(
                "Congratulations! Your SyncSenta {} account has been approved. You can now log in and access the platform.",
                role
            ),
        ),
        NotificationType::ApprovalRejected => (
            "SyncSenta Account Decision",
            format!(
                "Your SyncSenta {} account registration has been reviewed. Please contact your administrator for more information.",
                role
            ),
        ),
        NotificationType::ApprovalPending => (
            "SyncSenta Account Pending",
            format!(
                "Your SyncSenta {} account is pending approval. You will be notified once it has been reviewed.",
                role
            ),
        ),
    };

    // Send email
    if let Err(e) = send_email(config, email, subject, &message).await {
        tracing::error!("Failed to send email notification: {}", e);
    }

    // Send SMS if phone number is provided
    if let Some(phone_number) = phone {
        if let Err(e) = send_sms(config, phone_number, &message).await {
            tracing::error!("Failed to send SMS notification: {}", e);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_type_serialization() {
        let nt = NotificationType::ApprovalApproved;
        let json = serde_json::to_string(&nt).unwrap();
        assert!(json.contains("ApprovalApproved"));
    }
}
