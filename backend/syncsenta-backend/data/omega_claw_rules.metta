;; SyncSenta Omega Claw student-learning rules
;; Activity-first, bounded, scaffolded, transfer-oriented progression.

;; Grade scope: Grade 6 is introductory; Senior School is deeper; lower grades are blocked.
(= (omega-claw-scope-for grade6) introductory)
(= (omega-claw-scope-for grade10) senior-deep)
(= (omega-claw-scope-for grade11) senior-deep)
(= (omega-claw-scope-for grade12) senior-deep)
(= (omega-claw-scope-for senior-school) senior-deep)
(= (omega-claw-scope-for $lower-grade) blocked)

;; Approved activity families for the student-side interaction runner.
(omega-claw-activity grade6 ai-input-output)
(omega-claw-activity grade6 blockchain-shared-record)
(omega-claw-activity grade6 responsible-digital-citizenship)
(omega-claw-activity senior-school ai-data-literacy)
(omega-claw-activity senior-school ai-evaluation-and-bias)
(omega-claw-activity senior-school blockchain-consensus)
(omega-claw-activity senior-school blockchain-governance)

;; The same activities are available by explicit Senior School grade.
(omega-claw-activity grade10 ai-data-literacy)
(omega-claw-activity grade11 ai-data-literacy)
(omega-claw-activity grade12 ai-data-literacy)
(omega-claw-activity grade10 blockchain-consensus)
(omega-claw-activity grade11 blockchain-consensus)
(omega-claw-activity grade12 blockchain-consensus)

;; Progression outcomes map to a single next action.
(= (omega-claw-next-action incorrect) scaffold-retry)
(= (omega-claw-next-action correct) celebrate-transfer)
(= (omega-claw-next-action explained) mastery-review)
(= (omega-claw-next-action mastered) unlock-next-node)

;; Progressive hint ladder: notice, isolate, represent, model.
(= (omega-claw-hint 1) notice)
(= (omega-claw-hint 2) isolate-step)
(= (omega-claw-hint 3) representation)
(= (omega-claw-hint 4) worked-example)

;; Transfer is required before the next node can be unlocked.
(= (omega-claw-can-unlock-transfer true true) yes)
(= (omega-claw-can-unlock-transfer $correct $explained) no)

;; Safety boundaries for student work.
(omega-claw-blocked-topic crypto-trading)
(omega-claw-blocked-topic investment-advice)
(omega-claw-blocked-topic wallet-custody)
(omega-claw-blocked-topic unsupervised-attack)
(omega-claw-blocked-topic public-deployment)
(omega-claw-blocked-topic unnecessary-personal-data)
