'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthProviderProps {
  children: React.ReactNode;
  initialProfile: Profile | null;
}

export default function AuthProvider({ children, initialProfile }: AuthProviderProps) {
  const initialize = useAuthStore(state => state.initialize);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const initializedRef = useRef(false);

  useEffect(() => {
    // 한 번만 초기화
    if (!initializedRef.current) {
      initializedRef.current = true;
      initialize(initialProfile);
    }
  }, [initialize, initialProfile]);

  // 초기화 전에도 children을 렌더링 (서버 사이드 렌더링 호환)
  return <>{children}</>;
}

// 기존 useAuth 훅과의 호환성을 위한 래퍼
export function useAuth() {
  const profile = useAuthStore(state => state.profile);
  const isLoading = useAuthStore(state => state.isLoading);
  const isConfigured = useAuthStore(state => state.isConfigured);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const updateBalance = useAuthStore(state => state.updateBalance);
  const signOut = useAuthStore(state => state.signOut);

  return {
    profile,
    isLoading,
    isConfigured,
    isInitialized,
    // 기존 API 호환성을 위해 refreshSession 제거 (필요 없음)
    refreshProfile: async () => {
      await refreshProfile();
    },
    updateBalance,
    signOut,
  };
}
