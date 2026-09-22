-- Migration: Comprehensive schema for all remaining entities
-- Adds: students, teachers, parents, school_admins, school_heads, county_officers,
-- assessments, assessment_submissions, fee_structures, payment_transactions,
-- marketplace_listings, marketplace_purchases, attendance_log, announcements,
-- discussion_threads, chat_sessions, and Row-Level Security policies

-- ─── Additional Enums ────────────────────────────────────────────────────────

CREATE TYPE file_type AS ENUM ('pdf', 'docx', 'image', 'video', 'audio', 'ebook');

CREATE TYPE announcement_scope AS ENUM ('school', 'class');

CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay');

-- ─── Role-Specific Profile Tables ────────────────────────────────────────────

-- Students
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    grade_level cbc_grade_level NOT NULL,
    class_id UUID REFERENCES classes(id),
    progress_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_class_id ON students(class_id);

-- Teachers
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    subject_areas TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);

-- Parents
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    linked_student_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parents_user_id ON parents(user_id);

-- School Admins
CREATE TABLE school_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_admins_user_id ON school_admins(user_id);
CREATE INDEX idx_school_admins_school_id ON school_admins(school_id);

-- School Heads
CREATE TABLE school_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_school_heads_user_id ON school_heads(user_id);
CREATE INDEX idx_school_heads_school_id ON school_heads(school_id);

-- County Officers
CREATE TABLE county_officers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    county_id UUID NOT NULL REFERENCES counties(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_county_officers_user_id ON county_officers(user_id);
CREATE INDEX idx_county_officers_county_id ON county_officers(county_id);

-- ─── Assessment System ───────────────────────────────────────────────────────

-- Assessments
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    curriculum_ref VARCHAR(255) NOT NULL,
    questions JSONB NOT NULL,
    time_limit_minutes INT,
    total_points INT NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessments_teacher_id ON assessments(teacher_id);
CREATE INDEX idx_assessments_class_id ON assessments(class_id);

-- Assessment Submissions
CREATE TABLE assessment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    answers JSONB NOT NULL,
    score NUMERIC(5,2),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id),
    feedback TEXT,
    UNIQUE(assessment_id, student_id)
);

CREATE INDEX idx_assessment_submissions_assessment_id ON assessment_submissions(assessment_id);
CREATE INDEX idx_assessment_submissions_student_id ON assessment_submissions(student_id);

-- ─── Fee Management ──────────────────────────────────────────────────────────

-- Fee Structures
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    grade_level cbc_grade_level NOT NULL,
    term SMALLINT NOT NULL CHECK (term BETWEEN 1 AND 3),
    academic_year INT NOT NULL,
    amount BIGINT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    categories JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_structures_school_id ON fee_structures(school_id);
CREATE INDEX idx_fee_structures_grade_level ON fee_structures(grade_level);

-- Payment Transactions (enhanced from payments table)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    parent_id UUID NOT NULL REFERENCES users(id),
    amount BIGINT NOT NULL,
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    mpesa_checkout_request_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_transactions_student_id ON payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_parent_id ON payment_transactions(parent_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- ─── Content Marketplace ─────────────────────────────────────────────────────

-- Marketplace Listings
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL UNIQUE REFERENCES content_library(id) ON DELETE CASCADE,
    price BIGINT NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'KES',
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    purchase_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_marketplace_listings_resource_id ON marketplace_listings(resource_id);

-- Marketplace Purchases
CREATE TABLE marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    resource_id UUID NOT NULL REFERENCES content_library(id),
    amount BIGINT NOT NULL,
    transaction_id UUID REFERENCES payment_transactions(id),
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(buyer_id, resource_id)
);

CREATE INDEX idx_marketplace_purchases_buyer_id ON marketplace_purchases(buyer_id);
CREATE INDEX idx_marketplace_purchases_resource_id ON marketplace_purchases(resource_id);

-- ─── Attendance System ───────────────────────────────────────────────────────

-- Attendance Log
CREATE TABLE attendance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    class_id UUID NOT NULL REFERENCES classes(id),
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, class_id, date)
);

CREATE INDEX idx_attendance_log_student_id ON attendance_log(student_id);
CREATE INDEX idx_attendance_log_class_id ON attendance_log(class_id);
CREATE INDEX idx_attendance_log_date ON attendance_log(date);

-- ─── Communication Hub ───────────────────────────────────────────────────────

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID NOT NULL REFERENCES users(id),
    scope announcement_scope NOT NULL,
    scope_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sms_sent BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_scope ON announcements(scope, scope_id);
CREATE INDEX idx_announcements_author_id ON announcements(author_id);

-- Discussion Threads
CREATE TABLE discussion_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    posts JSONB NOT NULL DEFAULT '[]',
    moderator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discussion_threads_class_id ON discussion_threads(class_id);
CREATE INDEX idx_discussion_threads_moderator_id ON discussion_threads(moderator_id);

-- Chat Sessions (for Mwalimu AI)
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id),
    active_language supported_language NOT NULL DEFAULT 'en',
    topic_context VARCHAR(255),
    message_history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_student_id ON chat_sessions(student_id);

-- ─── Content Resources (enhanced) ────────────────────────────────────────────

-- Add missing columns to content_library if needed
ALTER TABLE content_library
    ADD COLUMN IF NOT EXISTS sharing_permissions JSONB DEFAULT '[]';

-- ─── Triggers for updated_at ─────────────────────────────────────────────────

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parents_updated_at BEFORE UPDATE ON parents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_admins_updated_at BEFORE UPDATE ON school_admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_heads_updated_at BEFORE UPDATE ON school_heads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_county_officers_updated_at BEFORE UPDATE ON county_officers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_threads_updated_at BEFORE UPDATE ON discussion_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

