-- Syncsenta International School demo tenancy.
-- Idempotent seed for the four real Supabase demo accounts.
-- Demo auth users are created in Supabase Auth; this migration links them to
-- the application profile, school, student, consent, assignment, and feedback
-- records used by the role dashboards.

begin;

insert into public.schools (id, name, county, code, status)
values (
  '11111111-1111-4111-8111-111111111111',
  'Syncsenta International School',
  'Nairobi',
  'SYNC-INTL-001',
  'active'
)
on conflict (code) do update set
  name = excluded.name,
  county = excluded.county,
  status = excluded.status,
  updated_at = now();

insert into public.profiles (
  id, email, full_name, role, grade, school_name, student_id,
  subjects, classes, children_ids, language_preference, region,
  subscription_tier, subscription_status
)
select
  u.id,
  u.email,
  v.full_name,
  v.role,
  v.grade,
  'Syncsenta International School',
  v.student_id,
  v.subjects,
  v.classes,
  v.children_ids,
  'mixed',
  'Nairobi',
  'school',
  'active'
from auth.users u
join (values
  ('student01@syncsenta.dev', 'Demo Student', 'student', 'Grade 4', 'SIS-STU-001', array['Mathematics','English','Kiswahili']::text[], array['Grade 4A']::text[], '{}'::uuid[]),
  ('teacher01@syncsenta.dev', 'Demo Teacher', 'teacher', null, null, array['Mathematics','English']::text[], array['Grade 4A']::text[], '{}'::uuid[]),
  ('parent01@syncsenta.dev', 'Demo Parent', 'parent', null, null, '{}'::text[], '{}'::text[], array['22222222-2222-4222-8222-222222222222']::uuid[]),
  ('head01@syncsenta.dev', 'Demo Head of School', 'admin', null, null, '{}'::text[], '{}'::text[], '{}'::uuid[])
) as v(email, full_name, role, grade, student_id, subjects, classes, children_ids)
  on v.email = u.email
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  grade = excluded.grade,
  school_name = excluded.school_name,
  student_id = excluded.student_id,
  subjects = excluded.subjects,
  classes = excluded.classes,
  children_ids = excluded.children_ids,
  region = excluded.region,
  subscription_tier = excluded.subscription_tier,
  subscription_status = excluded.subscription_status,
  updated_at = now();

insert into public.students (
  id, user_id, student_name, student_id, grade, class_name, school_name,
  preferred_language, learning_style, interests, parent_name, parent_email
)
select
  '22222222-2222-4222-8222-222222222222',
  u.id,
  'Demo Student',
  'SIS-STU-001',
  'Grade 4',
  'Grade 4A',
  'Syncsenta International School',
  'mixed',
  'guided',
  array['storytelling','problem solving'],
  'Demo Parent',
  'parent01@syncsenta.dev'
from auth.users u
where u.email = 'student01@syncsenta.dev'
on conflict (id) do update set
  user_id = excluded.user_id,
  student_name = excluded.student_name,
  student_id = excluded.student_id,
  grade = excluded.grade,
  class_name = excluded.class_name,
  school_name = excluded.school_name,
  preferred_language = excluded.preferred_language,
  learning_style = excluded.learning_style,
  interests = excluded.interests,
  parent_name = excluded.parent_name,
  parent_email = excluded.parent_email,
  updated_at = now();

insert into public.teacher_student_assignments (
  teacher_id, student_id, subject, class_name, academic_year, term, status
)
select
  teacher.id,
  '22222222-2222-4222-8222-222222222222',
  subjects.subject,
  'Grade 4A',
  '2026',
  'Term 3',
  'active'
from auth.users teacher
cross join (values ('Mathematics'), ('English')) as subjects(subject)
where teacher.email = 'teacher01@syncsenta.dev'
on conflict (teacher_id, student_id, class_name, subject) do update set
  academic_year = excluded.academic_year,
  term = excluded.term,
  status = excluded.status;

insert into public.learner_consents (
  subject_id, granted_by, purpose, policy_version, status, scope
)
select
  student.id,
  parent.id,
  'core_learning',
  'demo-school-v1',
  'granted',
  '{"progress":true,"teacher_feedback":true,"wellbeing":true}'::jsonb
from public.profiles student
join public.profiles parent on parent.email = 'parent01@syncsenta.dev'
where student.email = 'student01@syncsenta.dev'
on conflict (subject_id, purpose, policy_version) where status = 'granted' do update set
  granted_by = excluded.granted_by,
  scope = excluded.scope,
  updated_at = now();

insert into public.learning_evidence (
  student_profile_id, activity_id, curriculum_design_version, grade, subject,
  strand, learning_outcome, competency, value, evidence_type, rubric, evidence,
  source, reviewed_by, reviewed_at
)
select
  student.id,
  'demo-math-foundations-001',
  'cbc-demo-v1',
  'Grade 4',
  'Mathematics',
  'Numbers',
  'Explain a multiplication strategy in your own words',
  'Communication and collaboration',
  '72',
  'teacher_review',
  '{"mastery":72,"band":"Developing"}'::jsonb,
  '{"attempts":3,"latest_score":72}'::jsonb,
  'demo-seed',
  teacher.id,
  now()
from public.profiles student
join public.profiles teacher on teacher.email = 'teacher01@syncsenta.dev'
where student.email = 'student01@syncsenta.dev'
on conflict (event_id) do nothing;

insert into public.parent_performance_reports (
  parent_id, child_profile_id, school_name, subject, mastery_percentage,
  performance_band, teacher_feedback_summary, next_step, consent_id, report_payload
)
select
  parent.id,
  student.id,
  'Syncsenta International School',
  'Mathematics',
  72,
  'Developing',
  'The learner is explaining multiplication strategies with growing confidence and benefits from guided practice.',
  'Complete two short multiplication practice activities and explain the chosen strategy aloud.',
  consent.id,
  '{"source":"demo-seed","teacher":"Demo Teacher","term":"Term 3"}'::jsonb
from public.profiles parent
join public.profiles student on student.email = 'student01@syncsenta.dev'
join public.learner_consents consent on consent.subject_id = student.id and consent.granted_by = parent.id and consent.purpose = 'core_learning' and consent.status = 'granted'
where parent.email = 'parent01@syncsenta.dev';

delete from public.head_progress_notifications
where recipient_id = (select id from public.profiles where email = 'head01@syncsenta.dev')
  and school_name = 'Syncsenta International School'
  and metric = 'demo_seed_mastery';

insert into public.head_progress_notifications (
  recipient_id, school_name, learner_count, progress_band, metric, aggregate_payload
)
select
  head.id,
  'Syncsenta International School',
  1,
  'Developing',
  'demo_seed_mastery',
  '{"subject":"Mathematics","mastery_percentage":72,"term":"Term 3","source":"demo-seed"}'::jsonb
from public.profiles head
where head.email = 'head01@syncsenta.dev';

commit;
