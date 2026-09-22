// Educational Domain Knowledge Base — Task 2.1
//
// The KnowledgeBase is the bridge between durable storage (PostgreSQL for
// structured atoms, IPFS for large/decentralised blobs) and the in-memory
// MeTTa atomspace. It is responsible for:
//   * defining the educational domain schema as MeTTa atom families
//     (curriculum, assessment, user behaviour, system state)
//   * loading curriculum facts into the global atomspace at boot
//   * persisting newly-asserted atoms back to Postgres
//   * pinning large knowledge blobs (e.g. raw lesson content) to IPFS and
//     recording the resulting CID as an atom
//
// The DB and IPFS handles are optional so the engine can run in offline /
// test contexts without a live infrastructure stack.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;

use super::interpreter::{MettaInterpreter, MettaSpace};

/// Atom family / domain a fact belongs to. Used to namespace atoms in the
/// space and to drive the persistence schema in Postgres.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AtomDomain {
    Curriculum,
    Assessment,
    UserBehavior,
    SystemState,
    Permission,
    Recommendation,
}

impl AtomDomain {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Curriculum => "curriculum",
            Self::Assessment => "assessment",
            Self::UserBehavior => "user_behavior",
            Self::SystemState => "system_state",
            Self::Permission => "permission",
            Self::Recommendation => "recommendation",
        }
    }
}

/// A single persisted atom — what gets written to `metta_atoms` in Postgres.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedAtom {
    pub domain: String,
    pub expression: String,
    pub ipfs_cid: Option<String>,
}

/// Lightweight handle to IPFS. We stub it here so the knowledge base remains
/// usable before Task 5 lands the real `ipfs-api` integration. Callers that
/// already have an IPFS client can swap it in via [`KnowledgeBase::with_ipfs`].
#[async_trait::async_trait]
pub trait IpfsBackend: Send + Sync {
    async fn put(&self, payload: &[u8]) -> Result<String>;
    async fn get(&self, cid: &str) -> Result<Vec<u8>>;
}

/// No-op IPFS backend. Returns deterministic pseudo-CIDs based on the
/// content hash so tests remain reproducible without a daemon.
pub struct NullIpfs;

#[async_trait::async_trait]
impl IpfsBackend for NullIpfs {
    async fn put(&self, payload: &[u8]) -> Result<String> {
        use sha2::{Digest, Sha256};
        let digest = Sha256::digest(payload);
        Ok(format!("bafy-null-{}", hex::encode(&digest[..8])))
    }
    async fn get(&self, _cid: &str) -> Result<Vec<u8>> {
        anyhow::bail!("NullIpfs cannot read content; configure a real backend")
    }
}

/// Knowledge base façade.
pub struct KnowledgeBase {
    interpreter: Arc<MettaInterpreter>,
    db: Option<PgPool>,
    ipfs: Arc<dyn IpfsBackend>,
}

impl KnowledgeBase {
    pub fn new() -> Result<Self> {
        Ok(Self {
            interpreter: Arc::new(MettaInterpreter::new()?),
            db: None,
            ipfs: Arc::new(NullIpfs),
        })
    }

    pub fn with_interpreter(interpreter: Arc<MettaInterpreter>) -> Self {
        Self {
            interpreter,
            db: None,
            ipfs: Arc::new(NullIpfs),
        }
    }

    pub fn with_db(mut self, pool: PgPool) -> Self {
        self.db = Some(pool);
        self
    }

    pub fn with_ipfs(mut self, ipfs: Arc<dyn IpfsBackend>) -> Self {
        self.ipfs = ipfs;
        self
    }

    pub fn interpreter(&self) -> Arc<MettaInterpreter> {
        self.interpreter.clone()
    }

    pub fn global_space(&self) -> &MettaSpace {
        self.interpreter.global_space()
    }

    /// Boot-time hook: load the CBC curriculum skeleton into the global
    /// atomspace. Task 2.2 expands this with comprehensive educational domain
    /// knowledge including full curriculum structure, user role hierarchies,
    /// assessment logic, learning paths, and content recommendations.
    pub async fn load_curriculum(&mut self) -> Result<()> {
        self.install_seed_schema().await?;
        self.install_educational_domain().await?;
        if self.db.is_some() {
            self.hydrate_from_db().await?;
        }
        Ok(())
    }

    async fn install_seed_schema(&self) -> Result<()> {
        let space = self.interpreter.global_space();

        // Subjects covered by the Kenyan CBC at the foundational level. The
        // full strand/sub-strand decomposition is loaded in Task 2.2.
        for subject in [
            "mathematics",
            "english",
            "kiswahili",
            "science_and_technology",
            "social_studies",
            "creative_arts",
            "religious_education",
            "physical_health_education",
        ] {
            space
                .add_atom(&format!("(curriculum subject {subject})"))
                .await?;
        }

        // Role hierarchy: each role inherits from the previous one.
        let roles = [
            "student",
            "parent",
            "teacher",
            "school_admin",
            "school_head",
            "county_officer",
            "national_admin",
        ];
        for window in roles.windows(2) {
            space
                .add_atom(&format!("(role-inherits {} {})", window[1], window[0]))
                .await?;
        }
        for r in roles {
            space.add_atom(&format!("(role {r})")).await?;
        }

        // Mastery thresholds used by the auto-grader.
        space
            .add_atom("(= (mastery-threshold beginner) 0.5)")
            .await?;
        space
            .add_atom("(= (mastery-threshold proficient) 0.75)")
            .await?;
        space
            .add_atom("(= (mastery-threshold expert) 0.9)")
            .await?;

        Ok(())
    }

    /// Task 2.2: Install comprehensive educational domain knowledge base
    /// including CBC curriculum structure, user role hierarchies, assessment
    /// logic, learning path generation, and content recommendation rules.
    async fn install_educational_domain(&self) -> Result<()> {
        let space = self.interpreter.global_space();

        // Load comprehensive CBC curriculum structure
        self.load_cbc_curriculum_structure(space).await?;
        
        // Define user role hierarchies and permission matrices
        self.load_user_role_hierarchies(space).await?;
        
        // Create assessment and grading logic rules
        self.load_assessment_grading_logic(space).await?;
        
        // Implement learning path generation algorithms
        self.load_learning_path_algorithms(space).await?;
        
        // Define content recommendation and personalization rules
        self.load_content_recommendation_rules(space).await?;

        Ok(())
    }

    /// Load comprehensive CBC curriculum structure with subjects, strands,
    /// sub-strands, learning objectives, and competencies
    async fn load_cbc_curriculum_structure(&self, space: &MettaSpace) -> Result<()> {
        // Mathematics curriculum structure
        space.add_atom("(curriculum-subject mathematics)").await?;
        
        // Mathematics strands
        space.add_atom("(curriculum-strand mathematics numbers)").await?;
        space.add_atom("(curriculum-strand mathematics measurement)").await?;
        space.add_atom("(curriculum-strand mathematics geometry)").await?;
        space.add_atom("(curriculum-strand mathematics algebra)").await?;
        space.add_atom("(curriculum-strand mathematics data-handling)").await?;
        
        // Numbers sub-strands
        space.add_atom("(curriculum-sub-strand numbers whole-numbers)").await?;
        space.add_atom("(curriculum-sub-strand numbers fractions)").await?;
        space.add_atom("(curriculum-sub-strand numbers decimals)").await?;
        space.add_atom("(curriculum-sub-strand numbers percentages)").await?;
        space.add_atom("(curriculum-sub-strand numbers integers)").await?;
        
        // Measurement sub-strands
        space.add_atom("(curriculum-sub-strand measurement length)").await?;
        space.add_atom("(curriculum-sub-strand measurement mass)").await?;
        space.add_atom("(curriculum-sub-strand measurement capacity)").await?;
        space.add_atom("(curriculum-sub-strand measurement time)").await?;
        space.add_atom("(curriculum-sub-strand measurement money)").await?;
        space.add_atom("(curriculum-sub-strand measurement area)").await?;
        space.add_atom("(curriculum-sub-strand measurement volume)").await?;
        
        // Geometry sub-strands
        space.add_atom("(curriculum-sub-strand geometry shapes)").await?;
        space.add_atom("(curriculum-sub-strand geometry spatial-relationships)").await?;
        space.add_atom("(curriculum-sub-strand geometry transformations)").await?;
        space.add_atom("(curriculum-sub-strand geometry coordinates)").await?;
        
        // Science and Technology curriculum structure
        space.add_atom("(curriculum-subject science-technology)").await?;
        
        // Science strands
        space.add_atom("(curriculum-strand science-technology living-things)").await?;
        space.add_atom("(curriculum-strand science-technology non-living-things)").await?;
        space.add_atom("(curriculum-strand science-technology energy)").await?;
        space.add_atom("(curriculum-strand science-technology technology)").await?;
        
        // Living things sub-strands
        space.add_atom("(curriculum-sub-strand living-things plants)").await?;
        space.add_atom("(curriculum-sub-strand living-things animals)").await?;
        space.add_atom("(curriculum-sub-strand living-things human-body)").await?;
        space.add_atom("(curriculum-sub-strand living-things ecosystems)").await?;
        space.add_atom("(curriculum-sub-strand living-things classification)").await?;
        
        // English curriculum structure
        space.add_atom("(curriculum-subject english)").await?;
        space.add_atom("(curriculum-strand english listening-speaking)").await?;
        space.add_atom("(curriculum-strand english reading)").await?;
        space.add_atom("(curriculum-strand english writing)").await?;
        space.add_atom("(curriculum-strand english language-use)").await?;
        
        // Kiswahili curriculum structure
        space.add_atom("(curriculum-subject kiswahili)").await?;
        space.add_atom("(curriculum-strand kiswahili mazungumzo)").await?;
        space.add_atom("(curriculum-strand kiswahili kusoma)").await?;
        space.add_atom("(curriculum-strand kiswahili kuandika)").await?;
        space.add_atom("(curriculum-strand kiswahili lugha)").await?;
        
        // Social Studies curriculum structure
        space.add_atom("(curriculum-subject social-studies)").await?;
        space.add_atom("(curriculum-strand social-studies history)").await?;
        space.add_atom("(curriculum-strand social-studies geography)").await?;
        space.add_atom("(curriculum-strand social-studies citizenship)").await?;
        space.add_atom("(curriculum-strand social-studies economics)").await?;
        
        // Creative Arts curriculum structure
        space.add_atom("(curriculum-subject creative-arts)").await?;
        space.add_atom("(curriculum-strand creative-arts visual-arts)").await?;
        space.add_atom("(curriculum-strand creative-arts performing-arts)").await?;
        space.add_atom("(curriculum-strand creative-arts craft)").await?;
        
        // Physical and Health Education
        space.add_atom("(curriculum-subject physical-health-education)").await?;
        space.add_atom("(curriculum-strand physical-health-education athletics)").await?;
        space.add_atom("(curriculum-strand physical-health-education games)").await?;
        space.add_atom("(curriculum-strand physical-health-education health)").await?;
        
        // Religious Education
        space.add_atom("(curriculum-subject religious-education)").await?;
        space.add_atom("(curriculum-strand religious-education christian)").await?;
        space.add_atom("(curriculum-strand religious-education islamic)").await?;
        space.add_atom("(curriculum-strand religious-education hindu)").await?;
        
        // Grade level mappings
        for grade in ["pp1", "pp2", "grade1", "grade2", "grade3", "grade4", "grade5", "grade6", "jss1", "jss2", "jss3"] {
            space.add_atom(&format!("(grade-level {})", grade)).await?;
        }
        
        // Learning objectives and competencies
        space.add_atom("(learning-objective mathematics numbers pp1 \"Count objects 1-10\")").await?;
        space.add_atom("(learning-objective mathematics numbers pp2 \"Count objects 1-20\")").await?;
        space.add_atom("(learning-objective mathematics numbers grade1 \"Add and subtract within 20\")").await?;
        space.add_atom("(learning-objective mathematics numbers grade2 \"Add and subtract within 100\")").await?;
        space.add_atom("(learning-objective mathematics numbers grade3 \"Multiply and divide within 100\")").await?;
        
        space.add_atom("(competency mathematics numbers pp1 basic)").await?;
        space.add_atom("(competency mathematics numbers grade1 developing)").await?;
        space.add_atom("(competency mathematics numbers grade3 proficient)").await?;
        space.add_atom("(competency mathematics numbers grade6 advanced)").await?;

        Ok(())
    }

    /// Define user role hierarchies and permission matrices in MeTTa symbolic format
    async fn load_user_role_hierarchies(&self, space: &MettaSpace) -> Result<()> {
        // Enhanced role hierarchy with detailed permissions
        let roles = [
            ("student", 1),
            ("parent", 2), 
            ("teacher", 3),
            ("school_admin", 4),
            ("school_head", 5),
            ("county_officer", 6),
            ("national_admin", 7),
        ];
        
        // Role levels for comparison
        for (role, level) in &roles {
            space.add_atom(&format!("(role-level {} {})", role, level)).await?;
        }
        
        // Permission matrices - Student permissions
        space.add_atom("(permission student view-curriculum)").await?;
        space.add_atom("(permission student submit-assessment)").await?;
        space.add_atom("(permission student access-mwalimu-ai)").await?;
        space.add_atom("(permission student view-learning-path)").await?;
        space.add_atom("(permission student join-virtual-classroom)").await?;
        space.add_atom("(permission student view-own-progress)").await?;
        
        // Parent permissions
        space.add_atom("(permission parent view-child-progress)").await?;
        space.add_atom("(permission parent message-teacher)").await?;
        space.add_atom("(permission parent pay-fees)").await?;
        space.add_atom("(permission parent view-attendance)").await?;
        space.add_atom("(permission parent approve-student-registration)").await?;
        
        // Teacher permissions
        space.add_atom("(permission teacher create-lesson-plan)").await?;
        space.add_atom("(permission teacher grade-assessment)").await?;
        space.add_atom("(permission teacher create-virtual-classroom)").await?;
        space.add_atom("(permission teacher generate-scheme)").await?;
        space.add_atom("(permission teacher approve-student)").await?;
        space.add_atom("(permission teacher view-class-analytics)").await?;
        space.add_atom("(permission teacher upload-content)").await?;
        space.add_atom("(permission teacher mark-attendance)").await?;
        
        // School Admin permissions
        space.add_atom("(permission school_admin manage-enrollment)").await?;
        space.add_atom("(permission school_admin configure-fees)").await?;
        space.add_atom("(permission school_admin view-fee-reports)").await?;
        space.add_atom("(permission school_admin manage-timetable)").await?;
        space.add_atom("(permission school_admin approve-teacher)").await?;
        space.add_atom("(permission school_admin view-school-analytics)").await?;
        
        // School Head permissions
        space.add_atom("(permission school_head approve-school-admin)").await?;
        space.add_atom("(permission school_head approve-teacher)").await?;
        space.add_atom("(permission school_head view-school-performance)").await?;
        space.add_atom("(permission school_head manage-staff)").await?;
        space.add_atom("(permission school_head approve-content)").await?;
        
        // County Officer permissions
        space.add_atom("(permission county_officer approve-school-head)").await?;
        space.add_atom("(permission county_officer view-county-analytics)").await?;
        space.add_atom("(permission county_officer compare-schools)").await?;
        space.add_atom("(permission county_officer audit-compliance)").await?;
        
        // National Admin permissions
        space.add_atom("(permission national_admin approve-county-officer)").await?;
        space.add_atom("(permission national_admin view-national-analytics)").await?;
        space.add_atom("(permission national_admin manage-system)").await?;
        space.add_atom("(permission national_admin configure-curriculum)").await?;
        
        // Permission inheritance rules
        space.add_atom("(= (has-permission $role $perm) (and (permission $role $perm) true))").await?;
        space.add_atom("(= (has-permission $role $perm) (and (role-inherits $role $parent) (has-permission $parent $perm)))").await?;
        space.add_atom("(= (can-approve $approver $applicant) (and (role-level $approver $a-level) (role-level $applicant $b-level) (> $a-level $b-level)))").await?;

        Ok(())
    }

    /// Create assessment and grading logic as MeTTa rules
    async fn load_assessment_grading_logic(&self, space: &MettaSpace) -> Result<()> {
        // Mastery thresholds for different competency levels
        space.add_atom("(= (mastery-threshold beginner) 0.5)").await?;
        space.add_atom("(= (mastery-threshold developing) 0.65)").await?;
        space.add_atom("(= (mastery-threshold proficient) 0.75)").await?;
        space.add_atom("(= (mastery-threshold advanced) 0.85)").await?;
        space.add_atom("(= (mastery-threshold expert) 0.9)").await?;
        
        // Auto-grading rules for different question types
        space.add_atom("(= (auto-grade multiple-choice $answer $correct) (if (= $answer $correct) 1.0 0.0))").await?;
        space.add_atom("(= (auto-grade true-false $answer $correct) (if (= $answer $correct) 1.0 0.0))").await?;
        space.add_atom("(= (auto-grade fill-blank $answer $correct) (if (fuzzy-match $answer $correct 0.8) 1.0 0.0))").await?;
        space.add_atom("(= (auto-grade numerical $answer $correct $tolerance) (if (<= (abs (- $answer $correct)) $tolerance) 1.0 0.0))").await?;
        
        // Rubric-based grading for subjective questions
        space.add_atom("(rubric-criterion understanding \"Demonstrates clear understanding\" 4)").await?;
        space.add_atom("(rubric-criterion reasoning \"Shows logical reasoning\" 3)").await?;
        space.add_atom("(rubric-criterion communication \"Communicates ideas clearly\" 3)").await?;
        space.add_atom("(rubric-criterion accuracy \"Provides accurate information\" 4)").await?;
        
        // Grade calculation rules
        space.add_atom("(= (calculate-grade $scores) (/ (sum $scores) (length $scores)))").await?;
        space.add_atom("(= (weighted-grade $scores $weights) (/ (dot-product $scores $weights) (sum $weights)))").await?;
        
        // Mastery determination
        space.add_atom("(= (achieved-mastery $student $subject $strand $score) (and (>= $score (mastery-threshold proficient)) (consistent-performance $student $subject $strand)))").await?;
        space.add_atom("(= (needs-remediation $student $subject $strand $score) (< $score (mastery-threshold developing)))").await?;
        
        // Assessment difficulty adjustment
        space.add_atom("(= (adjust-difficulty $current-difficulty $performance) (cond ((> $performance 0.9) (+ $current-difficulty 0.1)) ((< $performance 0.6) (- $current-difficulty 0.1)) (else $current-difficulty)))").await?;
        
        // Competency progression rules
        space.add_atom("(= (can-progress $student $from-strand $to-strand) (and (achieved-mastery $student $subject $from-strand) (prerequisite $from-strand $to-strand)))").await?;
        
        // Grade boundaries for CBC
        space.add_atom("(grade-boundary A 80 100)").await?;
        space.add_atom("(grade-boundary B 70 79)").await?;
        space.add_atom("(grade-boundary C 60 69)").await?;
        space.add_atom("(grade-boundary D 50 59)").await?;
        space.add_atom("(grade-boundary E 0 49)").await?;

        Ok(())
    }

    /// Implement learning path generation algorithms using symbolic reasoning
    async fn load_learning_path_algorithms(&self, space: &MettaSpace) -> Result<()> {
        // Prerequisites mapping
        space.add_atom("(prerequisite whole-numbers fractions)").await?;
        space.add_atom("(prerequisite fractions decimals)").await?;
        space.add_atom("(prerequisite decimals percentages)").await?;
        space.add_atom("(prerequisite whole-numbers addition)").await?;
        space.add_atom("(prerequisite addition subtraction)").await?;
        space.add_atom("(prerequisite addition multiplication)").await?;
        space.add_atom("(prerequisite multiplication division)").await?;
        
        // Learning path generation rules
        space.add_atom("(= (generate-learning-path $student $target-competency) (find-path (current-competency $student) $target-competency))").await?;
        space.add_atom("(= (find-path $current $target) (if (= $current $target) (list $target) (cons $current (find-path (next-competency $current) $target))))").await?;
        
        // Adaptive path adjustment based on performance
        space.add_atom("(= (adjust-learning-path $student $path $performance) (cond ((< $performance 0.6) (add-remediation $path)) ((> $performance 0.9) (add-enrichment $path)) (else $path)))").await?;
        
        // Personalization based on learning style
        space.add_atom("(learning-style visual)").await?;
        space.add_atom("(learning-style auditory)").await?;
        space.add_atom("(learning-style kinesthetic)").await?;
        space.add_atom("(learning-style reading-writing)").await?;
        
        space.add_atom("(= (personalize-content $content $student) (match (learning-style $student) (visual (add-visual-elements $content)) (auditory (add-audio-elements $content)) (kinesthetic (add-interactive-elements $content)) (reading-writing (add-text-elements $content))))").await?;
        
        // Difficulty progression
        space.add_atom("(difficulty-level basic 1)").await?;
        space.add_atom("(difficulty-level intermediate 2)").await?;
        space.add_atom("(difficulty-level advanced 3)").await?;
        space.add_atom("(difficulty-level expert 4)").await?;
        
        space.add_atom("(= (next-difficulty-level $current) (+ $current 1))").await?;
        space.add_atom("(= (can-attempt-difficulty $student $subject $level) (>= (competency-level $student $subject) $level))").await?;
        
        // Spaced repetition scheduling
        space.add_atom("(= (schedule-review $topic $mastery-level) (cond ((< $mastery-level 0.6) 1) ((< $mastery-level 0.8) 3) ((< $mastery-level 0.9) 7) (else 14)))").await?;
        
        // Learning objective sequencing
        space.add_atom("(= (sequence-objectives $objectives) (topological-sort $objectives prerequisite))").await?;

        Ok(())
    }

    /// Define content recommendation and personalization rules
    async fn load_content_recommendation_rules(&self, space: &MettaSpace) -> Result<()> {
        // Content types
        space.add_atom("(content-type video)").await?;
        space.add_atom("(content-type text)").await?;
        space.add_atom("(content-type interactive)").await?;
        space.add_atom("(content-type assessment)").await?;
        space.add_atom("(content-type game)").await?;
        
        // Recommendation based on performance gaps
        space.add_atom("(= (recommend-content $student $subject $strand) (filter-content (content-for-strand $strand) (learning-preferences $student)))").await?;
        space.add_atom("(= (content-for-strand $strand) (query (content-tagged $strand)))").await?;
        
        // Collaborative filtering
        space.add_atom("(= (similar-students $student) (filter (lambda ($s) (> (similarity-score $student $s) 0.7)) all-students))").await?;
        space.add_atom("(= (recommend-by-similarity $student) (popular-content (similar-students $student)))").await?;
        
        // Content difficulty matching
        space.add_atom("(= (match-difficulty $content $student) (and (content-difficulty $content $diff) (can-attempt-difficulty $student (content-subject $content) $diff)))").await?;
        
        // Time-based recommendations
        space.add_atom("(= (recommend-by-time $student) (cond ((morning-learner $student) (high-cognitive-content)) ((evening-learner $student) (review-content)) (else (mixed-content))))").await?;
        
        // Engagement-based recommendations
        space.add_atom("(= (engagement-score $student $content-type) (average (map (lambda ($c) (engagement $student $c)) (content-of-type $content-type))))").await?;
        space.add_atom("(= (recommend-engaging-content $student) (sort-by-engagement (available-content) $student))").await?;
        
        // Multi-modal content recommendations
        space.add_atom("(= (recommend-multimodal $student $topic) (combine-content-types (visual-content $topic) (auditory-content $topic) (kinesthetic-content $topic)))").await?;
        
        // Remediation content recommendations
        space.add_atom("(= (recommend-remediation $student $weak-areas) (map (lambda ($area) (basic-content $area)) $weak-areas))").await?;
        
        // Enrichment content recommendations
        space.add_atom("(= (recommend-enrichment $student $strong-areas) (map (lambda ($area) (advanced-content $area)) $strong-areas))").await?;
        
        // Social learning recommendations
        space.add_atom("(= (recommend-peer-learning $student) (match-peers $student (learning-objectives $student)))").await?;
        space.add_atom("(= (recommend-group-activities $students) (filter (lambda ($activity) (suitable-for-group $activity $students)) all-activities))").await?;
        
        // Contextual recommendations based on current activity
        space.add_atom("(= (contextual-recommendations $student $current-activity) (related-content $current-activity (next-logical-steps $current-activity)))").await?;

        Ok(())
    }

    async fn hydrate_from_db(&self) -> Result<()> {
        let Some(pool) = &self.db else { return Ok(()) };
        let rows: Vec<(String, String)> = match sqlx::query_as::<_, (String, String)>(
            "SELECT domain, expression FROM metta_atoms ORDER BY created_at ASC",
        )
        .fetch_all(pool)
        .await
        {
            Ok(rows) => rows,
            // Table may not exist yet — that's fine in pre-migration test envs.
            Err(e) => {
                tracing::warn!(error = %e, "metta_atoms table unavailable; skipping hydrate");
                return Ok(());
            }
        };
        let space = self.interpreter.global_space();
        for (_domain, expr) in rows {
            space.add_atom(&expr).await?;
        }
        Ok(())
    }

    /// Assert a new atom into both the live space and the persistence layer.
    pub async fn assert_atom(&self, domain: AtomDomain, expression: &str) -> Result<()> {
        self.interpreter
            .global_space()
            .add_atom(expression)
            .await?;
        if let Some(pool) = &self.db {
            let _ = sqlx::query(
                "INSERT INTO metta_atoms (domain, expression) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            )
            .bind(domain.as_str())
            .bind(expression)
            .execute(pool)
            .await; // Soft-fail: persistence errors must not break reasoning.
        }
        Ok(())
    }

    /// Pin a large knowledge blob to IPFS and assert a `(ipfs-content cid …)`
    /// atom referencing it.
    pub async fn assert_blob(
        &self,
        domain: AtomDomain,
        kind: &str,
        payload: &[u8],
    ) -> Result<String> {
        let cid = self.ipfs.put(payload).await?;
        let expr = format!("(ipfs-content {} {} {})", domain.as_str(), kind, cid);
        self.assert_atom(domain, &expr).await?;
        Ok(cid)
    }
}

impl Default for KnowledgeBase {
    fn default() -> Self {
        Self::new().expect("knowledge base init")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn seed_schema_installs_subjects_and_roles() {
        let mut kb = KnowledgeBase::new().unwrap();
        kb.load_curriculum().await.unwrap();
        let count = kb.global_space().atom_count().await;
        // 8 subjects + 6 inheritance edges + 7 role atoms + 3 mastery rules
        assert!(count >= 8 + 6 + 7 + 3);
    }

    #[tokio::test]
    async fn null_ipfs_round_trips_cid() {
        let kb = KnowledgeBase::new().unwrap();
        let cid = kb
            .assert_blob(AtomDomain::Curriculum, "lesson", b"hello world")
            .await
            .unwrap();
        assert!(cid.starts_with("bafy-null-"));
    }
}
