/**
 * Authentication Hook
 * 
 * Provides authentication state and methods for the entire app.
 * Uses Supabase Auth for user management.
 */

'use client';

import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  /** True while the profile row is being fetched from Supabase.
   *  Stays true after `loading` is false when a session exists.
   *  Use this in route guards to avoid redirecting before the profile
   *  fetch completes. */
  profileLoading: boolean;
  error: Error | null;
}

/**
 * There is deliberately no `signUp()` here.
 *
 * Self-serve account creation was retired on 2026-09-29: the product's entry is
 * the four provisioned role workspaces at `/signup`, and real accounts (county
 * officers, a school's own learners) are created by whoever provisions them, so
 * the school controls placement instead of a stranger picking a role in a form.
 * `/api/auth/complete-profile` stays — `app/auth/onboarding` uses it to create
 * the profile row for an account that already exists.
 */
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<Profile | null>;
  signInWithGoogle: (options?: { next?: string; flow?: 'signup' | 'signin' }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Separate from `loading` — tracks the async profile row fetch.
  // Starts true, only becomes false once fetchProfile resolves (or no session).
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user profile from database
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err as Error);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // fetchProfile sets profileLoading=false in its finally block.
        // Do NOT set loading=false until after fetchProfile so that the
        // very first render never sees loading=false + profile=null.
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        // No session — both loading states settle immediately.
        setProfileLoading(false);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<Profile | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) {
        return await fetchProfile(data.user.id);
      }
      return null;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async (options?: { next?: string; flow?: 'signup' | 'signin' }) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: (() => {
            const callback = new URL('/auth/callback', window.location.origin);
            if (options?.next) callback.searchParams.set('next', options.next);
            if (options?.flow) callback.searchParams.set('flow', options.flow);
            return callback.toString();
          })(),
        },
      });

      if (error) throw error;
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh profile
      await fetchProfile(user.id);
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (!user) return;
    await fetchProfile(user.id);
  };

  return {
    user,
    profile,
    session,
    loading,
    profileLoading,
    error,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshProfile,
  };
}
