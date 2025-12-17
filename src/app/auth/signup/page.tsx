'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import { useAuthStore } from '@/lib/stores/authStore';
import { signUp } from '@/lib/auth/actions';

export default function SignUpPage() {
  const router = useRouter();
  const refreshProfile = useAuthStore(state => state.refreshProfile);

  const handleSignUpSuccess = async () => {
    try {
      // 회원가입 후 프로필 생성 대기 (트리거 지연 고려)
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshProfile();

      // 홈으로 이동
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Signup success handler error:', error);
      router.push('/');
    }
  };

  return (
    <AuthForm
      title="회원가입"
      submitLabel="가입하기"
      onSubmit={signUp}
      successMessage="회원가입이 완료되었습니다! 홈으로 이동합니다."
      onSuccess={handleSignUpSuccess}
      footer={
        <>
          <span>이미 계정이 있으신가요? </span>
          <Link href="/auth/login">로그인</Link>
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
        label="닉네임"
        name="nickname"
        placeholder="2-20자, 한글/영문/숫자/_"
        autoComplete="username"
      />
      <FormInput
        label="비밀번호"
        name="password"
        type="password"
        placeholder="8자 이상, 영문+숫자 포함"
        autoComplete="new-password"
      />
      <FormInput
        label="비밀번호 확인"
        name="confirmPassword"
        type="password"
        placeholder="비밀번호를 다시 입력해주세요"
        autoComplete="new-password"
      />
    </AuthForm>
  );
}
