/**
 * Sign Up Form — no Card wrapper, tight spacing, demo accounts first
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getRoleHome } from '@/lib/auth/role-home';

const DEMO_ACCOUNTS = [
  { role: 'student',  label: '🎒 Join as Student',  email: 'student01@syncsenta.dev',  password: 'Demo@Student01',  redirect: '/student' },
  { role: 'teacher',  label: '📚 Join as Teacher',  email: 'teacher01@syncsenta.dev',  password: 'Demo@Teacher01',  redirect: '/teacher' },
  { role: 'parent',   label: '👨‍👩‍👧 Join as Parent',   email: 'parent01@syncsenta.dev',   password: 'Demo@Parent01',   redirect: '/parent' },
  { role: 'head',     label: '🏫 Join as Head',      email: 'head01@syncsenta.dev',      password: 'Demo@Head01',      redirect: '/head' },
] as const;

function deriveLevelFromGrade(grade: string): string | null {
  if (grade === 'PP1' || grade === 'PP2') return 'pre-primary';
  const n = parseInt(grade.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return null;
  if (n >= 1 && n <= 3) return 'lower-primary';
  if (n >= 4 && n <= 6) return 'upper-primary';
  if (n >= 7 && n <= 9) return 'junior-secondary';
  if (n >= 10 && n <= 12) return 'senior-secondary';
  return null;
}

type SignupRole = 'student' | 'teacher' | 'parent' | 'admin';
type SchoolOption = { id: string; name: string; county: string | null };
type ClassOption = { id: string; name: string; grade: string };

function roleFromQuery(value: string | null): SignupRole {
  if (value === 'teacher' || value === 'parent') return value;
  if (value === 'head') return 'admin';
  return 'student';
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signIn } = useAuth();
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: roleFromQuery(searchParams.get('role')) as SignupRole,
    grade: '',
    schoolId: '',
    schoolName: '',
    homeLearning: false,
    classroomId: '',
    className: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const role = roleFromQuery(searchParams.get('role'));
    setFormData((f) => ({ ...f, role }));
  }, [searchParams]);

  // Load school directory
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from('schools').select('id,name,county').eq('status', 'active').order('name').limit(200);
      if (!cancelled) setSchools((data ?? []) as SchoolOption[]);
    })();
    return () => { cancelled = true; };
  }, []);

  // Load classes when school changes
  useEffect(() => {
    let cancelled = false;
    if (!formData.schoolId) { setClasses([]); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from('school_classes').select('id,name,grade')
        .eq('school_id', formData.schoolId).eq('status', 'active')
        .order('grade').order('name').limit(100);
      if (!cancelled) setClasses((data ?? []) as ClassOption[]);
    })();
    return () => { cancelled = true; };
  }, [formData.schoolId]);

  const set = (key: string, val: any) => setFormData((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
    if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        role: formData.role,
        grade: formData.role === 'student' ? formData.grade : null,
        school_id: formData.schoolId || null,
        classroom_id: formData.classroomId || null,
        school_name: formData.schoolName || null,
        studentPlacement: formData.role === 'student' && formData.schoolId && formData.classroomId ? {
          schoolId: formData.schoolId,
          schoolName: formData.schoolName,
          classroomId: formData.classroomId,
          className: formData.className,
        } : undefined,
        language_preference: 'mixed',
        subscription_tier: 'free',
        subscription_status: 'active',
      });
      if (formData.role === 'student' && formData.grade && typeof window !== 'undefined') {
        const level = deriveLevelFromGrade(formData.grade);
        window.sessionStorage.setItem('learningJourney.grade', formData.grade);
        window.localStorage.setItem('learningJourney.grade', formData.grade);
        if (level) {
          window.sessionStorage.setItem('learningJourney.level', level);
          window.localStorage.setItem('learningJourney.level', level);
        }
      }
      router.push(getRoleHome(formData.role));
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (account: typeof DEMO_ACCOUNTS[number]) => {
    setDemoLoading(account.role);
    setError(null);
    try {
      await signIn(account.email, account.password);
      router.push(account.redirect);
    } catch (err: any) {
      setError(`Demo login failed: ${err.message || 'Please try again'}`);
      setDemoLoading(null);
    }
  };

  const isAnyLoading = loading || demoLoading !== null;

  return (
    <div className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Demo accounts — try the app instantly */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
        <p className="text-xs font-semibold text-blue-800">🚀 Try a demo account — no sign-up needed</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.role}
              type="button"
              variant="outline"
              className="h-10 text-xs font-medium border-blue-200 bg-white hover:bg-blue-50"
              onClick={() => handleDemoLogin(account)}
              disabled={isAnyLoading}
            >
              {demoLoading === account.role
                ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                : null}
              {account.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-3 text-muted-foreground">or sign up with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selector — first so context is set early */}
        <div className="space-y-1.5">
          <Label htmlFor="role">I am a…</Label>
          <Select value={formData.role} onValueChange={(v: any) => set('role', v)} disabled={isAnyLoading}>
            <SelectTrigger id="role" className="h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="parent">Parent or Guardian</SelectItem>
              <SelectItem value="admin">Head of School</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" type="text" placeholder="Jane Wanjiru" value={formData.fullName}
            onChange={(e) => set('fullName', e.target.value)} required disabled={isAnyLoading} className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" value={formData.email}
            onChange={(e) => set('email', e.target.value)} required disabled={isAnyLoading} autoComplete="email" className="h-11" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
              value={formData.password} onChange={(e) => set('password', e.target.value)}
              required disabled={isAnyLoading} minLength={8} autoComplete="new-password" className="h-11 pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password"
              value={formData.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
              required disabled={isAnyLoading} className="h-11 pr-10" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Student-specific fields */}
        {formData.role === 'student' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="grade">Grade</Label>
              <Select value={formData.grade} onValueChange={(v) => set('grade', v)} disabled={isAnyLoading}>
                <SelectTrigger id="grade" className="h-11"><SelectValue placeholder="Select your grade" /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7,8,9].map((g) => (
                    <SelectItem key={g} value={`Grade ${g}`}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="school">School <span className="text-muted-foreground text-xs">(optional)</span></Label>
              {schools.length > 0 ? (
                <Select value={formData.homeLearning ? 'home-learning' : formData.schoolId}
                  onValueChange={(v) => {
                    if (v === 'home-learning') { set('schoolId', ''); set('schoolName', ''); set('homeLearning', true); set('classroomId', ''); set('className', ''); return; }
                    const s = schools.find((x) => x.id === v);
                    setFormData((f) => ({ ...f, schoolId: v, schoolName: s?.name ?? '', homeLearning: false, classroomId: '', className: '' }));
                  }} disabled={isAnyLoading}>
                  <SelectTrigger id="school" className="h-11"><SelectValue placeholder="Choose school or home learning" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home-learning">I learn at home</SelectItem>
                    {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.county ? ` — ${s.county}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id="school" type="text" placeholder="Your school name (optional)" value={formData.schoolName}
                  onChange={(e) => setFormData((f) => ({ ...f, schoolName: e.target.value, schoolId: '', homeLearning: false }))}
                  disabled={isAnyLoading} className="h-11" />
              )}
            </div>

            {formData.schoolId && (
              <div className="space-y-1.5">
                <Label htmlFor="classroom">Class <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select value={formData.classroomId}
                  onValueChange={(v) => { const c = classes.find((x) => x.id === v); setFormData((f) => ({ ...f, classroomId: v, className: c?.name ?? '' })); }}
                  disabled={isAnyLoading || !formData.grade}>
                  <SelectTrigger id="classroom" className="h-11"><SelectValue placeholder="Select your class" /></SelectTrigger>
                  <SelectContent>
                    {classes.filter((c) => !formData.grade || c.grade === formData.grade).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* Admin — school picker or free text */}
        {formData.role === 'admin' && (
          <div className="space-y-1.5">
            <Label htmlFor="school">School <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {schools.length > 0 ? (
              <Select value={formData.schoolId} onValueChange={(v) => { const s = schools.find((x) => x.id === v); setFormData((f) => ({ ...f, schoolId: v, schoolName: s?.name ?? '' })); }} disabled={isAnyLoading}>
                <SelectTrigger id="school" className="h-11"><SelectValue placeholder="Select your school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.county ? ` — ${s.county}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input id="school" type="text" placeholder="Your school name (optional)" value={formData.schoolName}
                onChange={(e) => setFormData((f) => ({ ...f, schoolName: e.target.value, schoolId: '' }))}
                disabled={isAnyLoading} className="h-11" />
            )}
          </div>
        )}

        {/* Teacher / parent — free text school */}
        {(formData.role === 'teacher' || formData.role === 'parent') && (
          <div className="space-y-1.5">
            <Label htmlFor="schoolName">School Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input id="schoolName" type="text" placeholder="Your school name" value={formData.schoolName}
              onChange={(e) => set('schoolName', e.target.value)} disabled={isAnyLoading} className="h-11" />
          </div>
        )}

        <Button type="submit" className="w-full h-11" disabled={isAnyLoading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : 'Create Account'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/auth/signin" className="font-medium text-primary hover:underline">Sign in</a>
      </p>
    </div>
  );
}

