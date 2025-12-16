'use client';

import { useRouter } from 'next/navigation';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import { updatePassword } from '@/lib/auth/actions';

export default function UpdatePasswordPage() {
  const router = useRouter();

  return (
    <AuthForm
      title="새 비밀번호 설정"
      submitLabel="비밀번호 변경"
      onSubmit={updatePassword}
      successMessage="비밀번호가 성공적으로 변경되었습니다!"
      onSuccess={() => {
        setTimeout(() => router.push('/'), 2000);
      }}
    >
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        새로운 비밀번호를 입력해주세요.
      </p>
      <FormInput
        label="새 비밀번호"
        name="password"
        type="password"
        placeholder="8자 이상, 영문+숫자 포함"
        autoComplete="new-password"
      />
      <FormInput
        label="새 비밀번호 확인"
        name="confirmPassword"
        type="password"
        placeholder="비밀번호를 다시 입력해주세요"
        autoComplete="new-password"
      />
    </AuthForm>
  );
}
