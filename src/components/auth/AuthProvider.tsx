'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  refreshProfile: (silent?: boolean) => Promise<void>;
  updateBalance: (amount: number) => Promise<{ success: boolean; newBalance?: number }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // AuthProvider 외부에서 사용되면 기본값 반환 (Supabase 미설정 상태)
    return {
      profile: null,
      isLoading: false,
      isConfigured: false,
      refreshProfile: async () => {},
      updateBalance: async () => ({ success: false }),
    };
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialProfile: Profile | null;
}

export default function AuthProvider({ children, initialProfile }: AuthProviderProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const supabase = useMemo(() => {
    if (!isConfigured) return null;
    try {
      return createClient();
    } catch {
      return null;
    }
  }, [isConfigured]);

  // silent: true이면 로딩 상태를 표시하지 않음 (백그라운드 새로고침)
  const refreshProfile = useCallback(async (silent = false) => {
    if (!supabase) return;

    // 이미 프로필이 있으면 로딩 표시 안함 (백그라운드 새로고침)
    if (!silent) {
      setIsLoading(true);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, [supabase]);

  const updateBalance = useCallback(async (amount: number) => {
    if (!profile || !supabase) {
      return { success: false };
    }

    try {
      const { data: newBalance, error } = await supabase.rpc('update_balance', {
        user_id: profile.id,
        amount,
      });

      if (error) {
        console.error('Balance update error:', error);
        return { success: false };
      }

      // 로컬 상태 업데이트
      setProfile((prev) => prev ? { ...prev, balance: newBalance } : null);

      return { success: true, newBalance };
    } catch (error) {
      console.error('Balance update error:', error);
      return { success: false };
    }
  }, [profile, supabase]);

  // 인증 상태 변화 감지
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // 새로 로그인할 때는 로딩 상태 표시
          await refreshProfile(false);
        } else if (event === 'TOKEN_REFRESHED') {
          // 토큰 새로고침 시에는 조용히 백그라운드에서 업데이트
          await refreshProfile(true);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refreshProfile]);

  return (
    <AuthContext.Provider value={{ profile, isLoading, isConfigured, refreshProfile, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
