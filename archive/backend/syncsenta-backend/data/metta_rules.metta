;; MeTTa Knowledge Base for SyncSenta Education OS
;; Symbolic reasoning rules for translation and educational context

;; ─── Core Translation Rules ───────────────────────────────────────────────────

;; Preserve CBC curriculum terms during translation
(= (preserve-cbc-term $term $source-lang $target-lang)
   (if (cbc-term $term)
       (lookup-translation $term $target-lang)
       $term))

;; Context-aware translation rules
(= (translate-with-context $text $context $source-lang $target-lang)
   (match $context
     (curriculum (apply-curriculum-context $text $source-lang $target-lang))
     (assessment (apply-assessment-context $text $source-lang $target-lang))
     (learning (apply-learning-context $text $source-lang $target-lang))
     (general (apply-general-context $text $source-lang $target-lang))))

;; ─── Educational Context Rules ────────────────────────────────────────────────

;; Curriculum context: Preserve technical terms, formal register
(= (apply-curriculum-context $text $source-lang $target-lang)
   (let* (($preserved-terms (extract-cbc-terms $text))
          ($formal-text (apply-formal-register $text $target-lang)))
     (preserve-terms $formal-text $preserved-terms $target-lang)))

;; Assessment context: Use formal language, clear instructions
(= (apply-assessment-context $text $source-lang $target-lang)
   (let* (($clear-text (clarify-instructions $text $target-lang))
          ($formal-text (apply-formal-register $clear-text $target-lang)))
     $formal-text))

;; Learning context: Simplify language, maintain engagement
(= (apply-learning-context $text $source-lang $target-lang)
   (let* (($simple-text (simplify-language $text $target-lang))
          ($engaging-text (add-engagement-markers $simple-text $target-lang)))
     $engaging-text))

;; ─── CBC Curriculum Knowledge Base ────────────────────────────────────────────

;; Define CBC subjects
(cbc-subject Mathematics)
(cbc-subject English)
(cbc-subject Kiswahili)
(cbc-subject "Science and Technology")
(cbc-subject "Social Studies")
(cbc-subject "Creative Arts")
(cbc-subject "Physical Education")
(cbc-subject "Religious Education")

;; Define CBC grade levels
(cbc-grade PP1)
(cbc-grade PP2)
(cbc-grade Grade1)
(cbc-grade Grade2)
(cbc-grade Grade3)
(cbc-grade Grade4)
(cbc-grade Grade5)
(cbc-grade Grade6)
(cbc-grade JSS1)
(cbc-grade JSS2)
(cbc-grade JSS3)

;; Mathematics strands and sub-strands
(cbc-strand Mathematics Numbers)
(cbc-sub-strand Numbers "Whole Numbers")
(cbc-sub-strand Numbers Fractions)
(cbc-sub-strand Numbers Decimals)
(cbc-sub-strand Numbers Percentages)

(cbc-strand Mathematics Measurement)
(cbc-sub-strand Measurement Length)
(cbc-sub-strand Measurement Mass)
(cbc-sub-strand Measurement Time)
(cbc-sub-strand Measurement Money)

(cbc-strand Mathematics Geometry)
(cbc-sub-strand Geometry Shapes)
(cbc-sub-strand Geometry "Spatial Relationships")

;; Science and Technology strands
(cbc-strand "Science and Technology" "Living Things")
(cbc-sub-strand "Living Things" Plants)
(cbc-sub-strand "Living Things" Animals)
(cbc-sub-strand "Living Things" "Human Body")

(cbc-strand "Science and Technology" "Non-living Things")
(cbc-sub-strand "Non-living Things" Materials)
(cbc-sub-strand "Non-living Things" "Physical Properties")

;; ─── Language-Specific Rules ──────────────────────────────────────────────────

;; Swahili formal register rules
(= (apply-formal-register $text sw)
   (let* (($respectful (add-respectful-forms $text))
          ($complete (use-complete-sentences $respectful)))
     $complete))

;; Kikuyu formal register rules
(= (apply-formal-register $text ki)
   (let* (($honorific (add-honorific-markers $text))
          ($structured (structure-formally $honorific)))
     $structured))

;; Simplification rules for student-facing content
(= (simplify-language $text $target-lang)
   (match $target-lang
     (sw (simplify-swahili $text))
     (ki (simplify-kikuyu $text))
     (luo (simplify-luo $text))
     (luy (simplify-luhya $text))
     (en (simplify-english $text))))

;; ─── Quality Assessment Rules ─────────────────────────────────────────────────

;; Assess translation quality based on context preservation
(= (assess-translation-quality $original $translated $context)
   (let* (($term-preservation (check-term-preservation $original $translated))
          ($context-appropriateness (check-context-appropriateness $translated $context))
          ($fluency (check-fluency $translated))
          ($accuracy (check-accuracy $original $translated)))
     (weighted-average $term-preservation $context-appropriateness $fluency $accuracy)))

;; Check if CBC terms are properly preserved
(= (check-term-preservation $original $translated)
   (let* (($original-terms (extract-cbc-terms $original))
          ($translated-terms (extract-cbc-terms $translated))
          ($preservation-ratio (/ (length $translated-terms) (length $original-terms))))
     (min 1.0 $preservation-ratio)))

;; ─── Reasoning Chain Rules ────────────────────────────────────────────────────

;; Generate explanation for translation decisions
(= (explain-translation $original $translated $context $reasoning-steps)
   (cons "Translation reasoning:"
         (cons (format "Context: ~a" $context)
               (cons (format "Preserved terms: ~a" (extract-cbc-terms $translated))
                     $reasoning-steps))))

;; Step-by-step reasoning for complex translations
(= (reason-translation-step $text $rule $confidence)
   (format "Applied rule '~a' with confidence ~a to: ~a" $rule $confidence $text))

;; ─── Integration with Rust Backend ────────────────────────────────────────────

;; Interface functions for Rust integration
(= (metta-translate $text $source-lang $target-lang $context)
   (let* (($reasoning-chain (build-reasoning-chain $text $context))
          ($translated (translate-with-context $text $context $source-lang $target-lang))
          ($quality (assess-translation-quality $text $translated $context))
          ($explanation (explain-translation $text $translated $context $reasoning-chain)))
     (translation-result $translated $quality $explanation)))

;; Build reasoning chain for transparency
(= (build-reasoning-chain $text $context)
   (let* (($step1 (reason-translation-step $text "context-analysis" 0.9))
          ($step2 (reason-translation-step $text "term-extraction" 0.95))
          ($step3 (reason-translation-step $text "translation-application" 0.8))
          ($step4 (reason-translation-step $text "quality-check" 0.85)))
     (list $step1 $step2 $step3 $step4)))

;; ─── Learning and Adaptation Rules ────────────────────────────────────────────

;; Learn from translation feedback
(= (learn-from-feedback $original $translated $feedback $rating)
   (if (> $rating 0.8)
       (reinforce-translation-pattern $original $translated)
       (adjust-translation-pattern $original $translated $feedback)))

;; Adapt translation patterns based on usage
(= (adapt-pattern $pattern $usage-count $success-rate)
   (if (> $success-rate 0.9)
       (increase-pattern-weight $pattern)
       (decrease-pattern-weight $pattern)))

;; ─── Error Handling and Fallback Rules ────────────────────────────────────────

;; Fallback when MeTTa reasoning fails
(= (fallback-translation $text $source-lang $target-lang)
   (static-dictionary-lookup $text $source-lang $target-lang))

;; Handle unknown terms gracefully
(= (handle-unknown-term $term $context)
   (if (technical-term $term)
       (preserve-original $term)
       (attempt-phonetic-adaptation $term)))

;; ─── Performance Optimization Rules ───────────────────────────────────────────

;; Cache frequently used translations
(= (cache-translation $text $translated $context $expiry)
   (store-in-cache (hash $text $context) $translated $expiry))

;; Batch process similar translations
(= (batch-translate $texts $source-lang $target-lang $context)
   (map (lambda ($text) (metta-translate $text $source-lang $target-lang $context)) $texts))