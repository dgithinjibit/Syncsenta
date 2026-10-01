;; scheme_check.metta — what the scheme-of-work checker is allowed to insist on.
;;
;; Two packs, two kinds of authority, and the difference is the whole design:
;;   studio/public/omega/ai_g8_design.metta is GENERATED from the curriculum and states FACTS — which
;;     sub-strands exist, how many lessons each carries, what the key-inquiry question says.
;;   this file is written by hand and states POLICY — which empty column blocks a scheme, which mismatch is
;;     merely worth a note, and what sentence the teacher reads when the agent disagrees with her.
;;
;; Policy lives here rather than in TypeScript so that a verdict can be argued with at its source. When the
;; reconciler says "blocking", the transcript names the line that decided it, and the teacher's override is
;; a response to that line, not to a number in somebody's code.
;;
;; Nothing here is derived from the Grade 8 design. It is the checker's own stance, and it is deliberately
;; narrow: no gap kind is listed that the reconciler cannot actually detect, and no field is called
;; mandatory that the scheme-of-work form does not have a column for.

(= (scheme-check-version g8) "2026-09-30.first-cut")
(= (scheme-check-stance g8) "A scheme is checked against the design, never against a model's opinion of a good lesson.")

;; Which columns a Grade 8 row may not leave empty. `optional` is a row, not a silence: the reason below is
;; the argument for why an empty cell here is not a gap before the lesson has been taught.
(= (scheme-field-obligation g8 week) mandatory)
(= (scheme-field-obligation-why g8 week) "Without a week the row cannot be placed in the term, so nothing downstream can order it.")
(= (scheme-field-obligation g8 lesson) mandatory)
(= (scheme-field-obligation-why g8 lesson) "The number of the lesson in the week is what the timetable and the scheme agree on.")
(= (scheme-field-obligation g8 strand) mandatory)
(= (scheme-field-obligation-why g8 strand) "The strand is how the design organises progression, and a row outside it cannot be audited.")
(= (scheme-field-obligation g8 subStrand) mandatory)
(= (scheme-field-obligation-why g8 subStrand) "The sub-strand is the unit the design pack actually names, so it is the row the checker can verify.")
(= (scheme-field-obligation g8 specificLearningOutcome) mandatory)
(= (scheme-field-obligation-why g8 specificLearningOutcome) "CBC assesses the learner against an outcome, so a lesson written without one has nothing to assess.")
(= (scheme-field-obligation g8 keyInquiryQuestion) mandatory)
(= (scheme-field-obligation-why g8 keyInquiryQuestion) "The inquiry question is what the learner is being asked to work out, and the design states one for every sub-strand.")
(= (scheme-field-obligation g8 learningExperiences) mandatory)
(= (scheme-field-obligation-why g8 learningExperiences) "Competency is built by doing, so a row with no described activity has no competency in it.")
(= (scheme-field-obligation g8 learningResources) mandatory)
(= (scheme-field-obligation-why g8 learningResources) "A lesson whose resources are unknown cannot be prepared, and in this context unknown means it will not happen.")
(= (scheme-field-obligation g8 assessmentMethods) mandatory)
(= (scheme-field-obligation-why g8 assessmentMethods) "Evidence of competency is the competency, so a scheme with no assessment method cannot be signed off.")
(= (scheme-field-obligation g8 reflection) optional)
(= (scheme-field-obligation-why g8 reflection) "The reflection is written after the lesson has been taught, so an empty cell on Monday morning is not a gap.")

;; The gap kinds the reconciler can raise. A gap with no row here is a bug in the reconciler, and asking for
;; one throws rather than defaulting to advisory, because a silent default is how a checker starts passing
;; work it never looked at.
(= (scheme-gap-severity g8 mandatory-field-empty) blocking)
(= (scheme-gap-reason g8 mandatory-field-empty) "A column the design cannot do without is empty, so this row is not yet a lesson plan.")
(= (scheme-gap-severity g8 sub-strand-not-in-design) blocking)
(= (scheme-gap-reason g8 sub-strand-not-in-design) "This sub-strand is not in the Grade 8 design, so the scheme plans teaching that the curriculum does not contain.")
(= (scheme-gap-severity g8 strand-mismatch) blocking)
(= (scheme-gap-reason g8 strand-mismatch) "The strand written here is not the strand the design files this sub-strand under, so progression is recorded in the wrong place.")
(= (scheme-gap-severity g8 lesson-count-mismatch) advisory)
(= (scheme-gap-reason g8 lesson-count-mismatch) "The design carries a different number of lessons for this sub-strand, which may be a deliberate split across weeks or may be an oversight.")
(= (scheme-gap-severity g8 key-inquiry-question-drifted) advisory)
(= (scheme-gap-reason g8 key-inquiry-question-drifted) "The inquiry question differs from the design's wording, which is allowed, but the difference is worth reading once more.")

;; The one gap kind that is about the checker's stance rather than about the curriculum: she has said a
;; mandatory column does not apply to her scheme. It is advisory and never silent — an overridden rule must
;; still show up in every later run, cited, so that a reader three months on can see the column is empty, that
;; the pack says waived, and that the waiver was recorded by a named person on a dated line of the ledger.
;; Nothing in this file is edited by that override: the override rewrites a line in the copy a run is handed,
;; and the record of who did it lives in the ledger, not here.
(= (scheme-gap-severity g8 field-obligation-waived-by-teacher) advisory)
(= (scheme-gap-reason g8 field-obligation-waived-by-teacher) "You recorded that this column does not apply to your scheme, so it no longer blocks certification, and this run still says so out loud: the column is empty, and the reason it is allowed to stay empty is your waiver rather than the checker's opinion.")

;; The gate between a checked scheme and everything that consumes it. The threshold is stated here and the
;; count is compared by the caller, because this parser reads one statement per line and does no arithmetic
;; — the rule is the pack's, the arithmetic is honest bookkeeping.
(= (scheme-certification-threshold g8) blocking-must-be-zero)
(= (scheme-certification-reason g8) "A scheme is certified for classroom use only when no blocking gap survives, and a certified scheme is what the lesson-plan generator is allowed to read.")
