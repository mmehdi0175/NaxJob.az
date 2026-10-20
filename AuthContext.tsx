import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function buildAuthUser(supabaseUser: User, _currentSession: Session): Promise<AuthUser> {
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

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return;
      if (initialSession?.user) {
        const authUser = await buildAuthUser(initialSession.user, initialSession);
        if (mounted) {
          setUser(authUser);
          setSession(initialSession);
        }
      }
      if (mounted) setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        if (newSession?.user) {
          const authUser = await buildAuthUser(newSession.user, newSession);
          if (mounted) {
            setUser(authUser);
            setSession(newSession);
          }
        } else {
          if (mounted) {
            setUser(null);
            setSession(null);
          }
        }
        if (mounted) setLoading(false);
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
    const authUser = await buildAuthUser(session.user, session);
    setUser(authUser);
  }

  async function refreshCandidate() {
    if (!session?.user) return;
    const authUser = await buildAuthUser(session.user, session);
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
