import * as React from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';

export type AppRole = 'admin' | 'director' | 'member';

export interface RoleRecord {
  role: AppRole;
  email: string;
  memberId?: string; // FK -> Member.id, only for 'member' role
}

export interface AuthState {
  /** Firebase user, null when signed out, undefined while loading. */
  user: User | null | undefined;
  /** Resolved role from Firestore. null = no role assigned yet. */
  role: AppRole | null;
  /** Loading auth or role data. */
  loading: boolean;
  /** True if the user has admin or director role (can edit all content). */
  canEdit: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** The memberId linked to this user (only for 'member' role). */
  linkedMemberId: string | undefined;
}

const ADMIN_EMAIL = 'yiluo.li.astrophysics@gmail.com';

export function useAuth(): AuthState {
  const [user, setUser] = React.useState<User | null | undefined>(undefined);
  const [role, setRole] = React.useState<AppRole | null>(null);
  const [linkedMemberId, setLinkedMemberId] = React.useState<string | undefined>(undefined);
  const [roleLoading, setRoleLoading] = React.useState(true);

  // Listen to Firebase Auth state.
  React.useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRole(null);
        setLinkedMemberId(undefined);
        setRoleLoading(false);
      }
    });
  }, []);

  // When user is known, subscribe to their role document.
  React.useEffect(() => {
    if (!user) return;
    setRoleLoading(true);

    const ref = doc(db, 'roles', user.uid);
    let unsub: Unsubscribe | undefined;

    // Bootstrap: if this is the admin email, ensure admin role exists.
    const init = async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const isAdmin = user.email === ADMIN_EMAIL;
        const record: RoleRecord = {
          role: isAdmin ? 'admin' : 'member',
          email: user.email ?? '',
        };
        await setDoc(ref, record);
      }

      // Subscribe to real-time role updates (admin might change it).
      unsub = onSnapshot(ref, (s) => {
        const data = s.data() as RoleRecord | undefined;
        setRole(data?.role ?? null);
        setLinkedMemberId(data?.memberId);
        setRoleLoading(false);
      });
    };

    init().catch((e) => {
      console.error('Failed to init role:', e);
      setRoleLoading(false);
    });

    return () => unsub?.();
  }, [user]);

  const signInWithGoogle = React.useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error('Sign-in failed:', e);
    }
  }, []);

  const handleEmailSignIn = React.useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { error: '邮箱或密码错误' };
      }
      if (code === 'auth/too-many-requests') {
        return { error: '登录尝试过多，请稍后再试' };
      }
      return { error: '登录失败' };
    }
  }, []);

  const handleEmailSignUp = React.useCallback(async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/email-already-in-use') {
        return { error: '该邮箱已注册' };
      }
      if (code === 'auth/weak-password') {
        return { error: '密码至少6位' };
      }
      if (code === 'auth/invalid-email') {
        return { error: '邮箱格式不正确' };
      }
      return { error: '注册失败' };
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Sign-out failed:', e);
    }
  }, []);

  return {
    user,
    role,
    loading: user === undefined || roleLoading,
    canEdit: role === 'admin' || role === 'director',
    signInWithGoogle,
    signInWithEmail: handleEmailSignIn,
    signUpWithEmail: handleEmailSignUp,
    signOut,
    linkedMemberId,
  };
}
