'use server';

import type { User, UserRole } from './types';
import { cookies } from 'next/headers';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { app } from './firebase';

/**
 * A Server Action to set the user's role and name in cookies and Firestore.
 */
export async function signupUser(role: UserRole, formData: FormData): Promise<string> {
  const fullName = formData.get('fullName') as string;
  const email = formData.get('email') as string;
  const uid = formData.get('uid') as string;

  if (!role || !fullName || !email || !uid) {
    throw new Error("Missing required signup information.");
  }
  
  const db = getFirestore(app);
  await setDoc(doc(db, "users", uid), {
    uid: uid,
    email: email,
    name: fullName,
    role: role,
    createdAt: new Date().toISOString(),
  });
  
  const cookieStore = cookies();
  cookieStore.set('userRole', role, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  cookieStore.set('userName', fullName, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
  cookieStore.set('userEmail', email, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

  return role === 'student' ? '/student' : '/dashboard';
}

/**
 * Fetches the authenticated user's details, prioritizing Firestore for the role.
 */
export async function getServerUser(): Promise<Partial<User> | null> {
    const cookieStore = cookies();
    const userEmail = cookieStore.get('userEmail')?.value;
    const userRole = cookieStore.get('userRole')?.value as UserRole | undefined;
    const userName = cookieStore.get('userName')?.value;

    if (!userEmail) return null;

    return {
        name: userName,
        email: userEmail,
        role: userRole,
    };
}
