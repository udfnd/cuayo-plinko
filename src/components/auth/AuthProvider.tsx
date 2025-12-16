'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  refreshProfile: (silent?: boolean) => Promise<void>;
  updateBalance: (amount: number) => Promise<{ success: boolean; newBalance?: number }>;
  signOut: () => Promise<void>;
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
      signOut: async () => {},
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

  // 초기 프로필이 있었는지 추적 (서버에서 이미 인증된 상태로 시작)
  const hadInitialProfileRef = useRef(initialProfile !== null);
  // 초기 세션 처리 완료 여부
  const initialSessionHandledRef = useRef(false);

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
      console.error('updateBalance: profile or supabase not available');
      return { success: false };
    }

    try {
      // 소수점 2자리까지 반올림 (NUMERIC(10,2) 호환)
      const roundedAmount = Math.round(amount * 100) / 100;

      const { data: newBalance, error } = await supabase.rpc('update_balance', {
        user_id: profile.id,
        amount: roundedAmount,
      });

      if (error) {
        console.error('Balance update error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        // 잔고 부족 에러인 경우 더 친절한 메시지
        if (error.message?.includes('Insufficient balance')) {
          return { success: false, error: 'insufficient_balance' };
        }
        return { success: false, error: error.message };
      }

      // 로컬 상태 업데이트
      const numericBalance = typeof newBalance === 'string' ? parseFloat(newBalance) : newBalance;
      setProfile((prev) => prev ? { ...prev, balance: numericBalance } : null);

      return { success: true, newBalance: numericBalance };
    } catch (error) {
      console.error('Balance update exception:', error);
      return { success: false };
    }
  }, [profile, supabase]);

  // 로그아웃 함수
  const signOut = useCallback(async () => {
    if (!supabase) return;

    try {
      // 먼저 로컬 상태를 즉시 초기화
      setProfile(null);
      hadInitialProfileRef.current = false;

      // 그 다음 Supabase 로그아웃
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [supabase]);

  // 인증 상태 변화 감지
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION: 페이지 로드 시 세션 복원
        if (event === 'INITIAL_SESSION') {
          initialSessionHandledRef.current = true;
          // 서버에서 이미 프로필을 가져왔으면 다시 가져올 필요 없음
          if (!hadInitialProfileRef.current && session) {
            await refreshProfile(true); // 조용히 새로고침
          }
          return;
        }

        // SIGNED_IN 이벤트 처리
        if (event === 'SIGNED_IN') {
          // 서버에서 이미 프로필을 받았거나, 초기 세션 복원 직후라면 조용히 새로고침
          if (hadInitialProfileRef.current) {
            await refreshProfile(true);
          } else {
            // 진짜 새 로그인일 때만 로딩 표시
            await refreshProfile(false);
          }
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          // 토큰 새로고침 시에는 항상 조용히 백그라운드에서 업데이트
          await refreshProfile(true);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          // 로그아웃 후에는 초기 프로필 플래그 리셋
          hadInitialProfileRef.current = false;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, refreshProfile]);

  return (
    <AuthContext.Provider value={{ profile, isLoading, isConfigured, refreshProfile, updateBalance, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
