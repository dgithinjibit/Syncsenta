'use server';

import type { User, UserRole } from './types';
import { cookies } from 'next/headers';
import { getRoleHome } from './auth/role-home';
// import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore'; // LEGACY
// import { app } from './firebase'; // LEGACY

/**
 * A Server Action to set the user's role and name in cookies and Firestore.
 * NOTE: Firebase integration disabled - only using cookies for now
 */
export async function signupUser(role: UserRole, formData: FormData): Promise<string> {
  try {
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const uid = formData.get('uid') as string;

    if (!role || !fullName || !email || !uid) {
      throw new Error("Missing required signup information.");
    }
    
    // LEGACY: Firebase integration disabled
    // const db = getFirestore(app);
    // await setDoc(doc(db, "users", uid), {
    //   uid: uid,
    //   email: email,
    //   name: fullName,
    //   role: role,
    //   createdAt: new Date().toISOString(),
    // });
    
    const cookieStore = await cookies();
    cookieStore.set('userRole', role, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('userName', fullName, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    cookieStore.set('userEmail', email, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    return getRoleHome(role);
  } catch (error) {
    console.error('=== SIGNUP USER ERROR ===');
    console.error('Error name:', (error as Error)?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);
    console.error('========================');
    throw error;
  }
}

/**
 * Fetches the authenticated user's details, prioritizing Firestore for the role.
 */
export async function getServerUser(): Promise<Partial<User> | null> {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('userEmail')?.value;
    const userRole = cookieStore.get('userRole')?.value as UserRole | undefined;
    const userName = cookieStore.get('userName')?.value;

    if (!userEmail) return null;

    return {
        name: userName,
        email: userEmail,
        role: userRole,
    };
  } catch (error) {
    console.error('=== GET SERVER USER ERROR ===');
    console.error('Error name:', (error as Error)?.name);
    console.error('Error message:', (error as Error)?.message);
    console.error('Error stack:', (error as Error)?.stack);
    console.error('============================');
    return null;
  }
}
