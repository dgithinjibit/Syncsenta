-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
    'student',
    'parent',
    'teacher',
    'school_admin',
    'school_head',
    'county_officer',
    'national_admin'
);

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE supported_language AS ENUM ('en', 'sw', 'ki', 'luo', 'luy');

CREATE TYPE cbc_grade_level AS ENUM (
    'PP1', 'PP2',
    'Grade1', 'Grade2', 'Grade3', 'Grade4', 'Grade5', 'Grade6',
    'JSS1', 'JSS2', 'JSS3',
    'SSS1', 'SSS2', 'SSS3'
);

CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'failed');

CREATE TYPE payment_method AS ENUM ('mpesa', 'bank_transfer');

CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'conflict');

CREATE TYPE classroom_status AS ENUM ('scheduled', 'live', 'ended');

-- ─── Core Tables ─────────────────────────────────────────────────────────────

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    approval_status approval_status NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    school_id UUID,
    county_id UUID,
    language_preference supported_language NOT NULL DEFAULT 'en',
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_approval_status ON users(approval_status);
CREATE INDEX idx_users_school_id ON users(school_id);

-- User relationships (parent-student links)
CREATE TABLE user_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_id, student_id)
);

-- Approval requests
CREATE TABLE approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approver_role user_role NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    metadata JSONB,
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_approver_role ON approval_requests(approver_role);

-- Schools
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    county VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    curriculum_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Counties
CREATE TABLE counties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Classes
CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id),
    grade_level cbc_grade_level NOT NULL,
    subject VARCHAR(100) NOT NULL,
    academic_year INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    objectives TEXT[],
    curriculum_ref VARCHAR(255) NOT NULL,
    duration_minutes INT,
    content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id),
    title VARCHAR(255) NOT NULL,
    instructions TEXT NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    points INT NOT NULL DEFAULT 100,
    curriculum_ref VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id),
    content JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_late BOOLEAN NOT NULL DEFAULT false,
    score INT,
    feedback TEXT,
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id)
);

-- Schemes
CREATE TABLE schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    curriculum_ref VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    grade_level cbc_grade_level NOT NULL,
    language supported_language NOT NULL DEFAULT 'en',
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Content library
CREATE TABLE content_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    storage_url TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    tags TEXT[],
    curriculum_refs TEXT[],
    grade_level cbc_grade_level,
    subject VARCHAR(100),
    language supported_language NOT NULL DEFAULT 'en',
    transcript TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT false,
    price BIGINT DEFAULT 0,
    full_text_index TSVECTOR,
    embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_full_text ON content_library USING GIN(full_text_index);
CREATE INDEX idx_content_embedding ON content_library USING ivfflat(embedding vector_cosine_ops);

-- Virtual classrooms
CREATE TABLE virtual_classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES users(id),
    class_id UUID NOT NULL REFERENCES classes(id),
    title VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    jitsi_room_name VARCHAR(255) NOT NULL,
    jitsi_jwt TEXT,
    max_participants INT NOT NULL DEFAULT 100,
    recording_enabled BOOLEAN NOT NULL DEFAULT false,
    recording_url TEXT,
    status classroom_status NOT NULL DEFAULT 'scheduled',
    attendance_log JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    student_id UUID REFERENCES users(id),
    amount BIGINT NOT NULL,
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    mpesa_checkout_request_id VARCHAR(255),
    mpesa_receipt_number VARCHAR(255),
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Learning paths
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    steps JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    based_on_assessments UUID[]
);

-- AI interactions
CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    session_id VARCHAR(255) NOT NULL,
    input_type VARCHAR(50) NOT NULL,
    input_content TEXT NOT NULL,
    response_content TEXT NOT NULL,
    model_used VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sync queue
CREATE TABLE sync_queue_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_offline_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    status sync_status NOT NULL DEFAULT 'pending'
);

CREATE INDEX idx_sync_queue_user_status ON sync_queue_entries(user_id, status);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    ip_address INET,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs(occurred_at);

-- SMS logs
CREATE TABLE sms_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipients TEXT[] NOT NULL,
    message TEXT NOT NULL,
    sms_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_status VARCHAR(50)
);

-- Direct messages
CREATE TABLE direct_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON direct_messages(sender_id);
CREATE INDEX idx_messages_recipient ON direct_messages(recipient_id);

-- ─── Functions & Triggers ────────────────────────────────────────────────────

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update full-text search index
CREATE OR REPLACE FUNCTION update_content_full_text_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_text_index := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.transcript, '') || ' ' || 
        COALESCE(array_to_string(NEW.tags, ' '), '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_full_text BEFORE INSERT OR UPDATE ON content_library
    FOR EACH ROW EXECUTE FUNCTION update_content_full_text_index();
