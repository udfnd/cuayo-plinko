'use client';

import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import FormInput from '@/components/auth/FormInput';
import { resetPassword } from '@/lib/auth/actions';

export default function ResetPasswordPage() {
  return (
    <AuthForm
      title="비밀번호 재설정"
      submitLabel="재설정 이메일 발송"
      onSubmit={resetPassword}
      successMessage="비밀번호 재설정 링크가 이메일로 발송되었습니다."
      footer={
        <>
          <Link href="/auth/login">로그인으로 돌아가기</Link>
        </>
      }
    >
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        가입 시 사용한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
      </p>
      <FormInput
        label="이메일"
        name="email"
        type="email"
        placeholder="example@email.com"
        autoComplete="email"
      />
    </AuthForm>
  );
}
