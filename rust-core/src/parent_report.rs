//! Structured parent/guardian performance reports.
//!
//! Reports contain only authorized, bounded learning summaries. Raw prompts,
//! learner chat, private teacher notes, and sensitive wellbeing details are
//! deliberately excluded from this contract.

const MAX_SUBJECT_BYTES: usize = 96;
const MAX_SUMMARY_BYTES: usize = 320;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ParentReportBand {
    NeedsSupport,
    Developing,
    OnTrack,
    Strong,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ParentPerformanceReport {
    pub child_reference: String,
    pub school_name: String,
    pub subject: String,
    pub mastery_percent: u8,
    pub band: ParentReportBand,
    pub teacher_feedback_summary: Option<String>,
    pub next_step: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ParentReportError {
    MissingRelationship,
    InvalidMastery,
    FieldTooLong,
    SensitiveSummary,
}

impl ParentPerformanceReport {
    pub fn validate_for_delivery(
        &self,
        linked_child: bool,
        consent_granted: bool,
    ) -> Result<(), ParentReportError> {
        if !linked_child || !consent_granted {
            return Err(ParentReportError::MissingRelationship);
        }
        if self.mastery_percent > 100 {
            return Err(ParentReportError::InvalidMastery);
        }
        if self.subject.trim().is_empty()
            || self.next_step.trim().is_empty()
            || self.subject.len() > MAX_SUBJECT_BYTES
            || self.next_step.len() > MAX_SUMMARY_BYTES
            || self
                .teacher_feedback_summary
                .as_deref()
                .is_some_and(|v| v.len() > MAX_SUMMARY_BYTES)
        {
            return Err(ParentReportError::FieldTooLong);
        }
        let combined = format!(
            "{} {}",
            self.teacher_feedback_summary.as_deref().unwrap_or_default(),
            self.next_step
        )
        .to_ascii_lowercase();
        if [
            "prompt",
            "chat",
            "password",
            "token",
            "student_id",
            "diagnosis",
        ]
        .iter()
        .any(|term| combined.contains(term))
        {
            return Err(ParentReportError::SensitiveSummary);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn report() -> ParentPerformanceReport {
        ParentPerformanceReport {
            child_reference: "child-ref-01".into(),
            school_name: "Turkana North School".into(),
            subject: "Mathematics".into(),
            mastery_percent: 50,
            band: ParentReportBand::Developing,
            teacher_feedback_summary: Some("Use a clearer visual example next time.".into()),
            next_step: "Practise one fraction example with a diagram.".into(),
        }
    }

    #[test]
    fn linked_consented_parent_report_is_valid() {
        assert_eq!(report().validate_for_delivery(true, true), Ok(()));
    }

    #[test]
    fn missing_link_or_consent_fails_closed() {
        assert_eq!(
            report().validate_for_delivery(false, true),
            Err(ParentReportError::MissingRelationship)
        );
        assert_eq!(
            report().validate_for_delivery(true, false),
            Err(ParentReportError::MissingRelationship)
        );
    }

    #[test]
    fn raw_chat_or_identifier_content_is_rejected() {
        let mut value = report();
        value.next_step = "Review student_id from the chat prompt".into();
        assert_eq!(
            value.validate_for_delivery(true, true),
            Err(ParentReportError::SensitiveSummary)
        );
    }

    #[test]
    fn mastery_is_bounded() {
        let mut value = report();
        value.mastery_percent = 101;
        assert_eq!(
            value.validate_for_delivery(true, true),
            Err(ParentReportError::InvalidMastery)
        );
    }
}
