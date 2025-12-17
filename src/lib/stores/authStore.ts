import { create } from 'zustand';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  // State
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  isConfigured: boolean;

  // Actions
  initialize: (initialProfile?: Profile | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  refreshProfile: () => Promise<void>;
  updateBalance: (amount: number) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
  signOut: () => Promise<void>;
  reset: () => void;
}

// 프로필 balance를 숫자로 정규화
const normalizeProfile = (profile: Profile | null): Profile | null => {
  if (!profile) return null;
  return {
    ...profile,
    balance: typeof profile.balance === 'string'
      ? parseFloat(profile.balance)
      : profile.balance,
  };
};

// Supabase 클라이언트 싱글톤
let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  isInitialized: false,
  isConfigured: isSupabaseConfigured(),

  // Initialize store with optional server-side profile
  initialize: (initialProfile) => {
    const normalized = normalizeProfile(initialProfile ?? null);
    set({
      profile: normalized,
      isInitialized: true,
      isLoading: false,
    });

    // Supabase auth state listener 설정
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthStore] Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        // 이미 같은 사용자의 프로필이 있으면 스킵
        const currentProfile = get().profile;
        if (currentProfile?.id === session.user.id) return;

        await get().refreshProfile();
      } else if (event === 'SIGNED_OUT') {
        set({ profile: null });
      } else if (event === 'TOKEN_REFRESHED') {
        // 토큰 갱신 시 조용히 프로필 새로고침
        await get().refreshProfile();
      }
    });
  },

  setProfile: (profile) => {
    set({ profile: normalizeProfile(profile) });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  // 프로필 새로고침
  refreshProfile: async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ profile: null });
        return;
      }

      // 프로필 조회 (최대 3번 재시도 - 회원가입 직후 트리거 지연 대응)
      let retryCount = 0;
      let profile: Profile | null = null;

      while (retryCount < 3) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          profile = data;
          break;
        }

        retryCount++;
        if (retryCount < 3) {
          console.log(`[AuthStore] Profile not found, retrying... (${retryCount}/3)`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      set({ profile: normalizeProfile(profile) });
    } catch (error) {
      console.error('[AuthStore] Error refreshing profile:', error);
    }
  },

  // 잔고 업데이트
  updateBalance: async (amount) => {
    const { profile } = get();
    const supabase = getSupabase();

    if (!profile || !supabase) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const roundedAmount = Math.round(amount * 100) / 100;

      const { data: newBalance, error } = await supabase.rpc('update_balance', {
        user_id: profile.id,
        amount: roundedAmount,
      });

      if (error) {
        console.error('[AuthStore] Balance update error:', error);
        if (error.message?.includes('Insufficient balance')) {
          return { success: false, error: 'insufficient_balance' };
        }
        return { success: false, error: error.message };
      }

      const numericBalance = typeof newBalance === 'string'
        ? parseFloat(newBalance)
        : newBalance;

      // 로컬 상태 업데이트
      set(state => ({
        profile: state.profile
          ? { ...state.profile, balance: numericBalance }
          : null
      }));

      return { success: true, newBalance: numericBalance };
    } catch (error) {
      console.error('[AuthStore] Balance update exception:', error);
      return { success: false, error: 'Unknown error' };
    }
  },

  // 로그아웃
  signOut: async () => {
    const supabase = getSupabase();

    // 먼저 로컬 상태 초기화
    set({ profile: null });

    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('[AuthStore] Sign out error:', error);
      }
    }
  },

  // 상태 초기화 (테스트용)
  reset: () => {
    set({
      profile: null,
      isLoading: false,
      isInitialized: false,
    });
  },
}));

// 편의를 위한 선택자들
export const useProfile = () => useAuthStore(state => state.profile);
export const useIsAuthenticated = () => useAuthStore(state => !!state.profile);
export const useBalance = () => useAuthStore(state => state.profile?.balance ?? 0);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthInitialized = () => useAuthStore(state => state.isInitialized);
