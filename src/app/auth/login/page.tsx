'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import { useAuth } from '@/components/auth';
import { signIn } from '@/lib/auth/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const redirectTo = searchParams.get('from') || '/';

  return (
    <AuthForm
      title="로그인"
      submitLabel="로그인"
      onSubmit={signIn}
      onSuccess={async () => {
        await refreshProfile();
        router.push(redirectTo);
        router.refresh();
      }}
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
