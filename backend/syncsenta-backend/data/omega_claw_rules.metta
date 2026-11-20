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

;; Student tutoring policy.
;; Accuracy comparisons use cross multiplication to avoid division and keep
;; the threshold boundaries explicit.
(= (omega-tutoring-ruleset-version) omega-tutoring-v1)

(= (omega-tutoring-accuracy-below-intensive $questions $correct)
   (if (== $questions 0)
       True
       (< (* $correct 10) (* $questions 3))))

(= (omega-tutoring-accuracy-below-guided $questions $correct)
   (< (* $correct 10) (* $questions 7)))

(= (omega-tutoring-intensive $questions $correct $mastery $hints $wrong)
   (if (>= $wrong 3)
       True
       (if (>= $hints 8)
           True
           (if (and (< $mastery 40) (>= $wrong 2))
               True
               (omega-tutoring-accuracy-below-intensive $questions $correct)))))

(= (omega-tutoring-guided $questions $correct $mastery $hints $wrong)
   (if (< $mastery 80)
       True
       (if (omega-tutoring-accuracy-below-guided $questions $correct)
           True
           (if (>= $hints 3)
               True
               (>= $wrong 1)))))

(= (omega-tutoring-level $questions $correct $mastery $hints $wrong)
   (if (omega-tutoring-intensive $questions $correct $mastery $hints $wrong)
       intensive
       (if (omega-tutoring-guided $questions $correct $mastery $hints $wrong)
           guided
           independent)))

(= (omega-tutoring-evidence $questions $correct $mastery $hints $wrong)
   (if (>= $wrong 3)
       consecutive-wrong
       (if (>= $hints 8)
           high-hint-use
           (if (and (< $mastery 40) (>= $wrong 2))
               low-mastery-repeated-errors
               (if (omega-tutoring-accuracy-below-intensive $questions $correct)
                   low-accuracy
                   (if (< $mastery 80)
                       below-mastery-target
                       (if (omega-tutoring-accuracy-below-guided $questions $correct)
                           below-guided-accuracy
                           (if (>= $hints 3)
                               hint-dependence
                               (if (>= $wrong 1)
                                   repeated-error
                                   independent-progress)))))))))

(= (omega-tutoring-scaffolding intensive) Intensive)
(= (omega-tutoring-scaffolding guided) Guided)
(= (omega-tutoring-scaffolding independent) Independent)
(= (omega-tutoring-next-action-for intensive) conceptual)
(= (omega-tutoring-next-action-for guided) guiding)
(= (omega-tutoring-next-action-for independent) challenge)
(= (omega-tutoring-next-action conceptual) show-conceptual-example)
(= (omega-tutoring-next-action guiding) ask-guiding-question)
(= (omega-tutoring-next-action challenge) present-next-challenge)
(= (omega-tutoring-hint-for intensive) notice)
(= (omega-tutoring-hint-for guided) isolate-step)
(= (omega-tutoring-hint-for independent) worked-example)

;; Safety boundaries for student work.
(omega-claw-blocked-topic crypto-trading)
(omega-claw-blocked-topic investment-advice)
(omega-claw-blocked-topic wallet-custody)
(omega-claw-blocked-topic unsupervised-attack)
(omega-claw-blocked-topic public-deployment)
(omega-claw-blocked-topic unnecessary-personal-data)
