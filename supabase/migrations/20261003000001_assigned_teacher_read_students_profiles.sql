-- Spoon 15: make the teacher roster visible to the roster route.
--
-- Applied directly to production Supabase (project tumikgwhrbvirpjswlzh) on
-- 2026-10-03 via the dashboard SQL runner, recorded here for clone fidelity.
--
-- Context: /api/teacher/roster reads teacher_student_assignments (allowed by
-- the pre-existing syncsenta_assignment_teacher_select), then students, then
-- profiles.last_seen_at. `students` had no teacher-facing SELECT policy, so
-- PostgREST + RLS filtered the learner rows to zero and the roster rendered
-- "No students assigned yet" for a teacher with four active assignment rows.
-- Verified at the time: teacher01 (3cf1c6e1-8176-4048-a985-15ce34859bb5) held
-- 4 active rows; policy set on students was service-role + student-self only.
--
-- Scope of each policy: an authenticated teacher may read exactly the learner
-- rows (students, and the profiles of their user_ids) reachable through their
-- OWN active assignments. Nothing widens reads for students or anonymous
-- callers; RLS stays the second line of defense behind the explicit
-- .eq('teacher_id', user.id) filter in the route.

create policy syncsenta_assigned_teacher_read_students
  on public.students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.teacher_student_assignments a
      where a.student_id = students.id
        and a.teacher_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy syncsenta_assigned_teacher_read_profiles
  on public.profiles
  for select
  to authenticated
  using (
    auth.uid() = id
    or exists (
      select 1
      from public.students s
      join public.teacher_student_assignments a on a.student_id = s.id
      where s.user_id = profiles.id
        and a.teacher_id = auth.uid()
        and a.status = 'active'
    )
  );
