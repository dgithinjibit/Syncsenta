-- Migration: Row-Level Security policies and CBC curriculum seed data
-- Implements RLS for all seven roles and seeds KICD reference data

-- ─── Enable RLS on all tables ────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- ─── Helper function: get current user's role ─────────────────────────────────

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = current_setting('app.current_user_id', true)::uuid
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid AS $$
    SELECT current_setting('app.current_user_id', true)::uuid
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_school_id()
RETURNS uuid AS $$
    SELECT school_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_county_id()
RETURNS uuid AS $$
    SELECT county_id FROM users WHERE id = current_setting('app.current_user_id', true)::uuid
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── RLS Policies: users table ───────────────────────────────────────────────

-- Users can see their own profile; admins can see all
CREATE POLICY users_self_read ON users
    FOR SELECT USING (
        id = current_user_id()
        OR current_user_role() IN ('national_admin', 'county_officer', 'school_head', 'school_admin')
    );

-- Only admins can update other users
CREATE POLICY users_self_update ON users
    FOR UPDATE USING (
        id = current_user_id()
        OR current_user_role() IN ('national_admin', 'school_head')
    );

-- ─── RLS Policies: classes table ─────────────────────────────────────────────

-- Teachers see their own classes; students see classes they're enrolled in; admins see all
CREATE POLICY classes_read ON classes
    FOR SELECT USING (
        teacher_id = current_user_id()
        OR school_id = current_user_school_id()
        OR current_user_role() IN ('national_admin', 'county_officer')
    );

-- ─── RLS Policies: lessons table ─────────────────────────────────────────────

CREATE POLICY lessons_read ON lessons
    FOR SELECT USING (
        teacher_id = current_user_id()
        OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = lessons.class_id
            AND c.school_id = current_user_school_id()
        )
        OR current_user_role() IN ('national_admin', 'county_officer')
    );

CREATE POLICY lessons_write ON lessons
    FOR ALL USING (
        teacher_id = current_user_id()
        OR current_user_role() IN ('national_admin', 'school_head', 'school_admin')
    );

-- ─── RLS Policies: content_library table ─────────────────────────────────────

-- Content is readable by all approved users in the same school; marketplace content is public
CREATE POLICY content_read ON content_library
    FOR SELECT USING (
        uploader_id = current_user_id()
        OR is_paid = false
        OR EXISTS (
            SELECT 1 FROM marketplace_purchases mp
            WHERE mp.resource_id = content_library.id
            AND mp.buyer_id = current_user_id()
        )
        OR current_user_role() IN ('national_admin', 'county_officer', 'school_head', 'school_admin')
    );

CREATE POLICY content_write ON content_library
    FOR ALL USING (
        uploader_id = current_user_id()
        OR current_user_role() IN ('national_admin', 'school_admin')
    );

-- ─── RLS Policies: assessments table ─────────────────────────────────────────

CREATE POLICY assessments_read ON assessments
    FOR SELECT USING (
        teacher_id = current_user_id()
        OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = assessments.class_id
            AND c.school_id = current_user_school_id()
        )
        OR current_user_role() IN ('national_admin', 'county_officer', 'school_head')
    );

-- ─── RLS Policies: assessment_submissions table ───────────────────────────────

CREATE POLICY submissions_read ON assessment_submissions
    FOR SELECT USING (
        student_id = current_user_id()
        OR EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = assessment_submissions.assessment_id
            AND a.teacher_id = current_user_id()
        )
        OR current_user_role() IN ('national_admin', 'school_head', 'school_admin')
    );

-- ─── RLS Policies: attendance_log table ──────────────────────────────────────

CREATE POLICY attendance_read ON attendance_log
    FOR SELECT USING (
        student_id = current_user_id()
        OR marked_by = current_user_id()
        OR EXISTS (
            SELECT 1 FROM classes c
            WHERE c.id = attendance_log.class_id
            AND c.school_id = current_user_school_id()
        )
        OR current_user_role() IN ('national_admin', 'county_officer', 'school_head')
    );

-- ─── RLS Policies: direct_messages table ─────────────────────────────────────

CREATE POLICY messages_read ON direct_messages
    FOR SELECT USING (
        sender_id = current_user_id()
        OR recipient_id = current_user_id()
    );

CREATE POLICY messages_write ON direct_messages
    FOR INSERT WITH CHECK (sender_id = current_user_id());

-- ─── RLS Policies: payment_transactions table ────────────────────────────────

CREATE POLICY payments_read ON payment_transactions
    FOR SELECT USING (
        student_id = current_user_id()
        OR parent_id = current_user_id()
        OR current_user_role() IN ('national_admin', 'school_admin', 'school_head')
    );

-- ─── CBC Curriculum Reference Data (KICD Standards) ─────────────────────────

CREATE TABLE IF NOT EXISTS kicd_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_level cbc_grade_level NOT NULL,
    subject VARCHAR(100) NOT NULL,
    strand VARCHAR(255) NOT NULL,
    sub_strand VARCHAR(255) NOT NULL,
    specific_learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
    key_inquiry_questions TEXT[] NOT NULL DEFAULT '{}',
    core_competencies TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kicd_grade_subject ON kicd_curriculum(grade_level, subject);
CREATE INDEX idx_kicd_strand ON kicd_curriculum(strand);

-- Seed CBC curriculum reference data (sample KICD standards)
INSERT INTO kicd_curriculum (grade_level, subject, strand, sub_strand, specific_learning_outcomes, key_inquiry_questions, core_competencies)
VALUES
    ('Grade5', 'Mathematics', 'Numbers', 'Whole Numbers', 
     ARRAY['Read and write numbers up to 1,000,000', 'Round off numbers to the nearest 10, 100, 1000'],
     ARRAY['How do we use large numbers in real life?', 'Why do we round off numbers?'],
     ARRAY['Critical thinking', 'Communication', 'Numeracy']),
    
    ('Grade5', 'Mathematics', 'Measurement', 'Length',
     ARRAY['Measure length using standard units', 'Convert between km, m, cm, mm'],
     ARRAY['How do we measure distances?', 'When do we use different units?'],
     ARRAY['Critical thinking', 'Numeracy', 'Learning to learn']),
    
    ('Grade5', 'English', 'Listening and Speaking', 'Oral Narratives',
     ARRAY['Listen to and retell oral narratives', 'Use appropriate vocabulary in narratives'],
     ARRAY['What makes a good story?', 'How do we communicate effectively?'],
     ARRAY['Communication', 'Creativity', 'Cultural identity']),
    
    ('Grade5', 'Kiswahili', 'Kusikiliza na Kuzungumza', 'Mazungumzo',
     ARRAY['Kuzungumza kwa ufasaha', 'Kutumia lugha sahihi katika mazungumzo'],
     ARRAY['Tunazungumzaje vizuri?', 'Lugha inasaidiaje mawasiliano?'],
     ARRAY['Mawasiliano', 'Ubunifu', 'Utambulisho wa kitamaduni']),
    
    ('Grade6', 'Science and Technology', 'Living Things', 'Plants',
     ARRAY['Identify parts of a plant and their functions', 'Describe photosynthesis'],
     ARRAY['How do plants make food?', 'Why are plants important?'],
     ARRAY['Critical thinking', 'Creativity', 'Learning to learn']),
    
    ('JSS1', 'Mathematics', 'Algebra', 'Linear Equations',
     ARRAY['Solve linear equations in one variable', 'Apply linear equations to real-life problems'],
     ARRAY['How do equations help solve problems?', 'Where do we use algebra in daily life?'],
     ARRAY['Critical thinking', 'Numeracy', 'Problem solving']),
    
    ('PP1', 'Language Activities', 'Listening and Speaking', 'Oral Communication',
     ARRAY['Listen attentively to stories', 'Respond to simple questions'],
     ARRAY['How do we listen carefully?', 'How do we share our ideas?'],
     ARRAY['Communication', 'Self-efficacy', 'Social skills']),
    
    ('Grade1', 'Mathematics', 'Numbers', 'Counting',
     ARRAY['Count objects up to 99', 'Read and write numbers 1-99'],
     ARRAY['How do we count things around us?', 'Why do we need numbers?'],
     ARRAY['Numeracy', 'Critical thinking', 'Communication'])
ON CONFLICT DO NOTHING;

-- ─── Sample Fee Structures ────────────────────────────────────────────────────

-- Note: These are sample structures; actual schools will configure their own
-- Fee structures are seeded per school via the admin interface

-- ─── Timetable table (if not exists) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id),
    subject VARCHAR(100) NOT NULL,
    room VARCHAR(100),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon, 5=Fri
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    academic_year INT NOT NULL,
    term SMALLINT NOT NULL CHECK (term BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_teacher_conflict UNIQUE (teacher_id, day_of_week, start_time, academic_year, term),
    CONSTRAINT no_room_conflict UNIQUE (room, school_id, day_of_week, start_time, academic_year, term)
);

CREATE INDEX idx_timetables_school ON timetables(school_id);
CREATE INDEX idx_timetables_class ON timetables(class_id);
CREATE INDEX idx_timetables_teacher ON timetables(teacher_id);

-- ─── Report Cards table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id),
    term SMALLINT NOT NULL CHECK (term BETWEEN 1 AND 3),
    academic_year INT NOT NULL,
    subject_scores JSONB NOT NULL DEFAULT '{}',
    attendance_summary JSONB,
    teacher_comments TEXT,
    overall_grade VARCHAR(10),
    class_rank INT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    generated_by UUID REFERENCES users(id),
    UNIQUE(student_id, class_id, term, academic_year)
);

CREATE INDEX idx_report_cards_student ON report_cards(student_id);
CREATE INDEX idx_report_cards_class ON report_cards(class_id, term, academic_year);

-- ─── Student Progress Metrics table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_progress_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    assessment_scores JSONB NOT NULL DEFAULT '[]',
    completion_rate NUMERIC(5,2) DEFAULT 0,
    strength_topics TEXT[] DEFAULT '{}',
    weakness_topics TEXT[] DEFAULT '{}',
    below_benchmark BOOLEAN DEFAULT FALSE,
    at_risk_score NUMERIC(4,3) DEFAULT 0, -- 0.0-1.0
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, subject)
);

CREATE INDEX idx_progress_student ON student_progress_metrics(student_id);
CREATE INDEX idx_progress_at_risk ON student_progress_metrics(at_risk_score DESC);

-- Trigger to update last_updated
CREATE TRIGGER update_progress_metrics_updated_at
    BEFORE UPDATE ON student_progress_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
