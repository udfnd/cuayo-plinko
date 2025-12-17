'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import { useAuthStore } from '@/lib/stores/authStore';
import { signIn } from '@/lib/auth/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshProfile = useAuthStore(state => state.refreshProfile);
  const redirectTo = searchParams.get('from') || '/';

  const handleLoginSuccess = async () => {
    try {
      // 약간의 지연 후 프로필 새로고침
      await new Promise(resolve => setTimeout(resolve, 200));
      await refreshProfile();

      // 리다이렉트
      router.push(redirectTo);
      router.refresh();
    } catch (error) {
      console.error('Login success handler error:', error);
      router.push(redirectTo);
    }
  };

  return (
    <AuthForm
      title="로그인"
      submitLabel="로그인"
      onSubmit={signIn}
      onSuccess={handleLoginSuccess}
      footer={
        <>
          <div style={{ marginBottom: '0.5rem' }}>
            <Link href="/auth/reset-password">비밀번호를 잊으셨나요?</Link>
          </div>
          <span>계정이 없으신가요? </span>
          <Link href="/auth/signup">회원가입</Link>
        </>
      }
    >
      <FormInput
        label="이메일"
        name="email"
        type="email"
        placeholder="example@email.com"
        autoComplete="email"
      />
      <FormInput
        label="비밀번호"
        name="password"
        type="password"
        placeholder="비밀번호를 입력해주세요"
        autoComplete="current-password"
      />
    </AuthForm>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
