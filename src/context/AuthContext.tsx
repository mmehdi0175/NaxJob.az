import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Company, Candidate, UserRole, AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  refreshCandidate: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshCompany: async () => {},
  refreshCandidate: async () => {},
});

async function buildAuthUser(supabaseUser: User): Promise<AuthUser> {
  const role: UserRole = (supabaseUser.app_metadata?.user_role as UserRole) || 'employer';
  let company: Company | null = null;
  let candidate: Candidate | null = null;

  if (role === 'employer') {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();
    company = data as Company | null;
  } else if (role === 'candidate') {
    const { data } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', supabaseUser.id)
      .maybeSingle();
    candidate = data as Candidate | null;
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    role,
    company,
    candidate,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false);
  const pendingSessionRef = useRef<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    async function processSession(sess: Session | null) {
      if (sess?.user) {
        const authUser = await buildAuthUser(sess.user);
        if (mounted) {
          setUser(authUser);
          setSession(sess);
        }
      } else {
        if (mounted) {
          setUser(null);
          setSession(null);
        }
      }
      if (mounted) setLoading(false);
    }

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      await processSession(initialSession || null);
    });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      if (processingRef.current) {
        pendingSessionRef.current = newSession;
        return;
      }

      processingRef.current = true;
      (async () => {
        await processSession(newSession);
        while (pendingSessionRef.current !== undefined && mounted) {
          const pending = pendingSessionRef.current;
          pendingSessionRef.current = undefined;
          await processSession(pending);
        }
        processingRef.current = false;
      })();
    });

    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  async function refreshCompany() {
    if (!session?.user) return;
    const authUser = await buildAuthUser(session.user);
    setUser(authUser);
  }

  async function refreshCandidate() {
    if (!session?.user) return;
    const authUser = await buildAuthUser(session.user);
    setUser(authUser);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshCompany, refreshCandidate }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
