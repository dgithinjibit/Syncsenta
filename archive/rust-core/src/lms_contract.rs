//! Stable, side-effect-free LMS delivery contracts.
//!
//! This is intentionally narrower than an LMS database model. It defines the
//! policy boundary for starting a lesson session so adapters can use the same
//! rules for virtual one-to-one lessons, coding clubs, and community cohorts.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DeliveryMode {
    OneToOne,
    CodingClub,
    CommunityCohort,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SessionKind {
    Trial,
    Lesson,
    Project,
    Review,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct LmsSessionPolicy {
    pub delivery_mode: DeliveryMode,
    pub session_kind: SessionKind,
    pub min_participants: u8,
    pub max_participants: u8,
    pub mentor_required: bool,
    pub consent_required: bool,
    pub offline_capable: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SessionStartError {
    InvalidParticipantCount,
    ConsentRequired,
    MentorRequired,
}

impl DeliveryMode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::OneToOne => "one_to_one",
            Self::CodingClub => "coding_club",
            Self::CommunityCohort => "community_cohort",
        }
    }
}

impl SessionKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Trial => "trial",
            Self::Lesson => "lesson",
            Self::Project => "project",
            Self::Review => "review",
        }
    }
}

pub const fn session_policy(mode: DeliveryMode, kind: SessionKind) -> LmsSessionPolicy {
    let (min_participants, max_participants) = match mode {
        DeliveryMode::OneToOne => (1, 1),
        DeliveryMode::CodingClub => (2, 24),
        DeliveryMode::CommunityCohort => (2, 40),
    };

    LmsSessionPolicy {
        delivery_mode: mode,
        session_kind: kind,
        min_participants,
        max_participants,
        mentor_required: true,
        consent_required: true,
        offline_capable: true,
    }
}

pub fn validate_session_start(
    policy: LmsSessionPolicy,
    participant_count: u8,
    consented: bool,
    mentor_assigned: bool,
) -> Result<(), SessionStartError> {
    if participant_count < policy.min_participants || participant_count > policy.max_participants {
        return Err(SessionStartError::InvalidParticipantCount);
    }
    if policy.consent_required && !consented {
        return Err(SessionStartError::ConsentRequired);
    }
    if policy.mentor_required && !mentor_assigned {
        return Err(SessionStartError::MentorRequired);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codeyetu_delivery_modes_have_bounded_groups() {
        let one_to_one = session_policy(DeliveryMode::OneToOne, SessionKind::Trial);
        let club = session_policy(DeliveryMode::CodingClub, SessionKind::Lesson);
        let cohort = session_policy(DeliveryMode::CommunityCohort, SessionKind::Project);

        assert_eq!(one_to_one.max_participants, 1);
        assert_eq!(club.max_participants, 24);
        assert_eq!(cohort.max_participants, 40);
        assert!(club.offline_capable);
    }

    #[test]
    fn sessions_fail_closed_without_consent_or_mentor() {
        let policy = session_policy(DeliveryMode::OneToOne, SessionKind::Lesson);

        assert_eq!(
            validate_session_start(policy, 1, false, true),
            Err(SessionStartError::ConsentRequired)
        );
        assert_eq!(
            validate_session_start(policy, 1, true, false),
            Err(SessionStartError::MentorRequired)
        );
    }

    #[test]
    fn session_participants_are_bounded() {
        let policy = session_policy(DeliveryMode::CodingClub, SessionKind::Lesson);

        assert!(validate_session_start(policy, 2, true, true).is_ok());
        assert_eq!(
            validate_session_start(policy, 1, true, true),
            Err(SessionStartError::InvalidParticipantCount)
        );
        assert_eq!(
            validate_session_start(policy, 25, true, true),
            Err(SessionStartError::InvalidParticipantCount)
        );
    }
}
