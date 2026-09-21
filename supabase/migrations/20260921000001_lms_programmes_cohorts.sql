-- ============================================================================
-- LMS PROGRAMMES, ORGANISATIONS, COHORTS, AND ENROLLMENTS
-- Additive shared-schema foundation for CodeYetu-compatible delivery.
--
-- This migration does not alter existing student, teacher, or chat tables.
-- Student-facing access is limited to a learner's own enrollment records.
-- Programme and cohort management requires an organisation membership or the
-- existing school-admin/head/admin role. Service role remains the trusted
-- provisioning path for initial organisation membership.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lms_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  organisation_type TEXT NOT NULL DEFAULT 'community_programme'
    CHECK (organisation_type IN ('school', 'community_programme', 'nonprofit', 'partner')),
  country_code TEXT NOT NULL DEFAULT 'KE' CHECK (char_length(country_code) = 2),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.lms_organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'mentor', 'coordinator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.lms_programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.lms_organisations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  supported_age_min SMALLINT NOT NULL DEFAULT 6 CHECK (supported_age_min >= 0),
  supported_age_max SMALLINT NOT NULL DEFAULT 16 CHECK (supported_age_max >= supported_age_min),
  default_session_minutes SMALLINT NOT NULL DEFAULT 60
    CHECK (default_session_minutes BETWEEN 15 AND 180),
  trial_session_minutes SMALLINT NOT NULL DEFAULT 40
    CHECK (trial_session_minutes BETWEEN 15 AND 120),
  mentor_required BOOLEAN NOT NULL DEFAULT true,
  consent_required BOOLEAN NOT NULL DEFAULT true,
  offline_first BOOLEAN NOT NULL DEFAULT true,
  curriculum_version TEXT NOT NULL DEFAULT '2026-09-v1',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, slug)
);

CREATE TABLE IF NOT EXISTS public.lms_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES public.lms_programmes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_mode TEXT NOT NULL
    CHECK (delivery_mode IN ('one_to_one', 'coding_club', 'community_cohort')),
  mentor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location_name TEXT,
  connectivity_profile TEXT NOT NULL DEFAULT 'offline_first'
    CHECK (connectivity_profile IN ('online', 'low_bandwidth', 'offline_first')),
  participant_capacity SMALLINT NOT NULL DEFAULT 24
    CHECK (participant_capacity BETWEEN 1 AND 40),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (programme_id, name),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (
    (delivery_mode = 'one_to_one' AND participant_capacity = 1)
    OR (delivery_mode <> 'one_to_one' AND participant_capacity >= 2)
  )
);

CREATE TABLE IF NOT EXISTS public.lms_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES public.lms_cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'paused', 'completed', 'withdrawn')),
  consent_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (consent_status IN ('pending', 'granted', 'declined', 'revoked')),
  enrolled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lms_members_organisation
  ON public.lms_organisation_members(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_members_user
  ON public.lms_organisation_members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_programmes_organisation
  ON public.lms_programmes(organisation_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_cohorts_programme
  ON public.lms_cohorts(programme_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_cohorts_mentor
  ON public.lms_cohorts(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_cohort
  ON public.lms_enrollments(cohort_id, status);
CREATE INDEX IF NOT EXISTS idx_lms_enrollments_student
  ON public.lms_enrollments(student_id, status);

COMMENT ON TABLE public.lms_organisations IS
  'Tenant boundary for CodeYetu-style programmes, schools, and community partners.';
COMMENT ON TABLE public.lms_programmes IS
  'Versioned delivery programme configuration; curriculum content remains separately versioned.';
COMMENT ON TABLE public.lms_cohorts IS
  'Bounded one-to-one, coding-club, or community-cohort delivery group.';
COMMENT ON TABLE public.lms_enrollments IS
  'Consent-aware learner membership in a delivery cohort; no raw chat or learner text.';

CREATE OR REPLACE FUNCTION public.syncsenta_lms_is_org_member(
  p_organisation_id UUID,
  p_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'mentor', 'coordinator', 'viewer']::TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lms_organisation_members member
    WHERE member.organisation_id = p_organisation_id
      AND member.user_id = auth.uid()
      AND member.status = 'active'
      AND member.role = ANY (p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.syncsenta_lms_can_manage_org(p_organisation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lms_organisation_members member
    WHERE member.organisation_id = p_organisation_id
      AND member.user_id = auth.uid()
      AND member.status = 'active'
      AND member.role IN ('owner', 'admin', 'coordinator')
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role IN ('admin', 'head', 'school_admin', 'school_head')
  );
$$;

CREATE OR REPLACE FUNCTION public.syncsenta_lms_can_manage_cohort(p_cohort_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lms_cohorts cohort
    JOIN public.lms_programmes programme ON programme.id = cohort.programme_id
    WHERE cohort.id = p_cohort_id
      AND (
        cohort.mentor_id = auth.uid()
        OR public.syncsenta_lms_can_manage_org(programme.organisation_id)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.syncsenta_lms_is_org_member(UUID, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.syncsenta_lms_can_manage_org(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.syncsenta_lms_can_manage_cohort(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.syncsenta_lms_is_org_member(UUID, TEXT[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.syncsenta_lms_can_manage_org(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.syncsenta_lms_can_manage_cohort(UUID) TO authenticated, service_role;

ALTER TABLE public.lms_organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS syncsenta_lms_service_role_organisations ON public.lms_organisations;
CREATE POLICY syncsenta_lms_service_role_organisations ON public.lms_organisations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS syncsenta_lms_service_role_members ON public.lms_organisation_members;
CREATE POLICY syncsenta_lms_service_role_members ON public.lms_organisation_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS syncsenta_lms_service_role_programmes ON public.lms_programmes;
CREATE POLICY syncsenta_lms_service_role_programmes ON public.lms_programmes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS syncsenta_lms_service_role_cohorts ON public.lms_cohorts;
CREATE POLICY syncsenta_lms_service_role_cohorts ON public.lms_cohorts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS syncsenta_lms_service_role_enrollments ON public.lms_enrollments;
CREATE POLICY syncsenta_lms_service_role_enrollments ON public.lms_enrollments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS syncsenta_lms_org_member_select ON public.lms_organisations;
CREATE POLICY syncsenta_lms_org_member_select ON public.lms_organisations
  FOR SELECT TO authenticated
  USING (public.syncsenta_lms_is_org_member(id));
DROP POLICY IF EXISTS syncsenta_lms_org_admin_insert ON public.lms_organisations;
CREATE POLICY syncsenta_lms_org_admin_insert ON public.lms_organisations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = auth.uid()
        AND profile.role IN ('admin', 'head', 'school_admin', 'school_head')
    )
  );
DROP POLICY IF EXISTS syncsenta_lms_org_admin_update ON public.lms_organisations;
CREATE POLICY syncsenta_lms_org_admin_update ON public.lms_organisations
  FOR UPDATE TO authenticated
  USING (public.syncsenta_lms_can_manage_org(id))
  WITH CHECK (public.syncsenta_lms_can_manage_org(id));

DROP POLICY IF EXISTS syncsenta_lms_member_self_select ON public.lms_organisation_members;
CREATE POLICY syncsenta_lms_member_self_select ON public.lms_organisation_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.syncsenta_lms_can_manage_org(organisation_id));
DROP POLICY IF EXISTS syncsenta_lms_admin_manage_members ON public.lms_organisation_members;
CREATE POLICY syncsenta_lms_admin_manage_members ON public.lms_organisation_members
  FOR ALL TO authenticated
  USING (public.syncsenta_lms_can_manage_org(organisation_id))
  WITH CHECK (public.syncsenta_lms_can_manage_org(organisation_id));

DROP POLICY IF EXISTS syncsenta_lms_programme_member_select ON public.lms_programmes;
CREATE POLICY syncsenta_lms_programme_member_select ON public.lms_programmes
  FOR SELECT TO authenticated
  USING (
    public.syncsenta_lms_is_org_member(organisation_id)
    OR EXISTS (
      SELECT 1
      FROM public.lms_cohorts cohort
      JOIN public.lms_enrollments enrollment ON enrollment.cohort_id = cohort.id
      JOIN public.students student ON student.id = enrollment.student_id
      WHERE cohort.programme_id = lms_programmes.id
        AND student.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS syncsenta_lms_programme_admin_manage ON public.lms_programmes;
CREATE POLICY syncsenta_lms_programme_admin_manage ON public.lms_programmes
  FOR ALL TO authenticated
  USING (public.syncsenta_lms_can_manage_org(organisation_id))
  WITH CHECK (public.syncsenta_lms_can_manage_org(organisation_id));

DROP POLICY IF EXISTS syncsenta_lms_cohort_participant_select ON public.lms_cohorts;
CREATE POLICY syncsenta_lms_cohort_participant_select ON public.lms_cohorts
  FOR SELECT TO authenticated
  USING (
    public.syncsenta_lms_is_org_member(
      (SELECT programme.organisation_id
       FROM public.lms_programmes programme
       WHERE programme.id = lms_cohorts.programme_id)
    )
    OR mentor_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.lms_enrollments enrollment
      JOIN public.students student ON student.id = enrollment.student_id
      WHERE enrollment.cohort_id = lms_cohorts.id
        AND student.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS syncsenta_lms_cohort_admin_manage ON public.lms_cohorts;
CREATE POLICY syncsenta_lms_cohort_admin_manage ON public.lms_cohorts
  FOR ALL TO authenticated
  USING (public.syncsenta_lms_can_manage_org(
    (SELECT programme.organisation_id
     FROM public.lms_programmes programme
     WHERE programme.id = lms_cohorts.programme_id)
  ))
  WITH CHECK (public.syncsenta_lms_can_manage_org(
    (SELECT programme.organisation_id
     FROM public.lms_programmes programme
     WHERE programme.id = lms_cohorts.programme_id)
  ));

DROP POLICY IF EXISTS syncsenta_lms_enrollment_participant_select ON public.lms_enrollments;
CREATE POLICY syncsenta_lms_enrollment_participant_select ON public.lms_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students student
      WHERE student.id = lms_enrollments.student_id
        AND student.user_id = auth.uid()
    )
    OR public.syncsenta_lms_can_manage_cohort(cohort_id)
    OR EXISTS (
      SELECT 1
      FROM public.lms_cohorts cohort
      WHERE cohort.id = lms_enrollments.cohort_id
        AND cohort.mentor_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS syncsenta_lms_enrollment_mentor_manage ON public.lms_enrollments;
CREATE POLICY syncsenta_lms_enrollment_mentor_manage ON public.lms_enrollments
  FOR ALL TO authenticated
  USING (public.syncsenta_lms_can_manage_cohort(cohort_id))
  WITH CHECK (public.syncsenta_lms_can_manage_cohort(cohort_id));

GRANT SELECT ON public.lms_organisations TO authenticated;
GRANT SELECT ON public.lms_organisation_members TO authenticated;
GRANT SELECT ON public.lms_programmes TO authenticated;
GRANT SELECT ON public.lms_cohorts TO authenticated;
GRANT SELECT ON public.lms_enrollments TO authenticated;
GRANT INSERT, UPDATE ON public.lms_organisations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_organisation_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_programmes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_cohorts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lms_enrollments TO authenticated;
