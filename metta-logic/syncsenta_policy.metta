; Syncsenta policy contract
; The Rust main agent renders one structured query and accepts only the atoms
; Approved, (Review <reason>), or (Rejected <reason>).
; Keep policy facts/rules here so they can be audited and changed without
; changing routing code. Raw learner messages are deliberately not passed in.

; Kenya Vision 2030-aligned product goals.
(vision2030-goal inclusive-learning)
(vision2030-goal digital-skills)
(vision2030-goal skills-and-employment)
(vision2030-goal quality-of-life)

; Capability and delivery constraints.
(delivery-mode online)
(delivery-mode metered)
(delivery-mode offline)
(accessibility-mode default)
(accessibility-mode required)

; The shared expert is always grounded in policy and curriculum evidence.
(= (shared-experts) (list safety grounding))

; Child-centred protection: a child request without known consent is held.
(= (child-consent-ok? primary granted) True)
(= (child-consent-ok? secondary granted) True)
(= (child-consent-ok? early-years granted) True)
(= (child-consent-ok? adult $consent) True)
(= (child-consent-ok? unknown $consent) True)

(= (child-consent-ok? $age unknown) False)
(= (child-consent-ok? $age guardian-required) False)
(= (child-consent-ok? $age denied) False)

; Safety and privacy signals fail closed before content experts run.
(= (safety-ok? clear) True)
(= (safety-ok? flagged) False)

; Structured boundary called by the Rust main agent.
(= (syncsenta-policy $role $age $intent $goal $connectivity $consent $safety $accessibility)
   (if (not (safety-ok? $safety))
       (Review safety)
       (if (not (child-consent-ok? $age $consent))
           (Review consent)
           (if (and (== $connectivity offline) (== $intent assessment))
               (Review offline-assessment)
               Approved))))

; Explicit expert intent mapping for a future MeTTa-native dispatcher.
(= (intent-expert socratic-tutor) socratic-tutor)
(= (intent-expert curriculum) curriculum)
(= (intent-expert lesson-plan) lesson-architect)
(= (intent-expert assessment) assessment)
(= (intent-expert localization) localization)
(= (intent-expert inclusion) inclusion)
(= (intent-expert mastery) mastery)
(= (intent-expert career-pathways) career-pathways)
(= (intent-expert real-world-problem) real-world-problem-solver)

; Vision 2030 goals can add a specialist without replacing safety/grounding.
(= (goal-expert inclusive-learning) inclusion)
(= (goal-expert digital-skills) real-world-problem-solver)
(= (goal-expert skills-and-employment) career-pathways)
(= (goal-expert quality-of-life) socratic-tutor)


; M2 — CBC evidence and safeguarding policy extensions.
; These atoms are declarative inputs for the future MeTTa-native dispatcher;
; Rust remains the enforcement authority at the runtime boundary.
(policy-version "cbc-safeguarding-2026-08")

; Every learning record must retain curriculum evidence, not only a score.
(cbc-evidence-field grade)
(cbc-evidence-field subject)
(cbc-evidence-field strand)
(cbc-evidence-field sub-strand)
(cbc-evidence-field learning-outcome)
(cbc-evidence-field competency)
(cbc-evidence-field value)
(cbc-evidence-field rubric)
(cbc-evidence-field provenance)

; Evidence may be captured by the student, teacher, Rust runtime, or offline sync.
(evidence-source student)
(evidence-source teacher)
(evidence-source rust-runtime)
(evidence-source offline-sync)

; Explicit human-review categories keep safeguarding separate from pedagogy.
(review-route learning-support)
(review-route safeguarding)
(review-route wellbeing)
(review-route content-correction)
(review-route privacy)

(= (safeguarding-route clear) Approved)
(= (safeguarding-route wellbeing) (Review wellbeing))
(= (safeguarding-route abuse-or-exploitation) (Review safeguarding))
(= (safeguarding-route self-harm) (Review safeguarding))
(= (safeguarding-route dangerous-activity) (Review safeguarding))
(= (safeguarding-route sexual-content) (Review safeguarding))
(= (safeguarding-route privacy-request) (Review privacy))

; Missing curriculum evidence is held for enrichment before publication.
(= (cbc-evidence-route complete) Approved)
(= (cbc-evidence-route incomplete) (Review curriculum-evidence))
(= (cbc-evidence-route unknown) (Review curriculum-evidence))

; Offline assessment results require later synchronization before finalization.
(= (assessment-finalization-route offline-pending-sync) (Review offline-assessment))
(= (assessment-finalization-route synced) Approved)

; Provider calls must not bypass policy or expose raw learner content to experts.
(= (expert-input raw-learner-content) (Review privacy))
(= (expert-input policy-summary) Approved)

; Attendance POC: policy approval is required before a persistence action.
; The Rust validator supplies these typed atoms after checking the signed token.
(= (attendance-token-route valid) Approved)
(= (attendance-token-route missing) (Review attendance-token))
(= (attendance-token-route expired) (Review attendance-token))
(= (attendance-token-route revoked) (Review attendance-token))
(= (attendance-token-route replayed) (Review attendance-replay))
(= (attendance-token-route wrong-class) (Review attendance-scope))
(= (attendance-token-route invalid) (Review attendance-token))

(= (attendance-consent-route granted) Approved)
(= (attendance-consent-route unknown) (Review consent))
(= (attendance-consent-route guardian-required) (Review consent))
(= (attendance-consent-route denied) (Review consent))

(= (attendance-action-route valid granted) Approved)
(= (attendance-action-route $token $consent)
   (if (not (== $token valid))
    (attendance-token-route $token)
    (if (not (== $consent granted))
           (Review consent)
           Approved)))
