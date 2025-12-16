'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateNickname,
} from './validation';

export interface AuthResult {
  success: boolean;
  error?: string;
}

// 회원가입
export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const nickname = formData.get('nickname') as string;

  // 유효성 검사
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }

  const confirmValidation = validatePasswordConfirm(password, confirmPassword);
  if (!confirmValidation.valid) {
    return { success: false, error: confirmValidation.error };
  }

  const nicknameValidation = validateNickname(nickname);
  if (!nicknameValidation.valid) {
    return { success: false, error: nicknameValidation.error };
  }

  const supabase = await createClient();

  // 닉네임 중복 확인
  const { data: nicknameExists, error: nicknameError } = await supabase.rpc(
    'check_nickname_exists',
    { nickname_to_check: nickname }
  );

  if (nicknameError) {
    console.error('Nickname check error:', nicknameError);
    return { success: false, error: '닉네임 확인 중 오류가 발생했습니다.' };
  }

  if (nicknameExists) {
    return { success: false, error: '이미 사용 중인 닉네임입니다.' };
  }

  // Supabase Auth로 회원가입
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { success: false, error: '이미 가입된 이메일입니다.' };
    }
    console.error('Signup error:', error);
    return { success: false, error: '회원가입 중 오류가 발생했습니다.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// 로그인
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  // 유효성 검사
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }

  if (!password) {
    return { success: false, error: '비밀번호를 입력해주세요.' };
  }

  const supabase = await createClient();

  // 로그인 시도 확인
  const { data: attemptData, error: attemptError } = await supabase.rpc(
    'check_login_attempts',
    { user_email: email }
  );

  if (attemptError) {
    console.error('Login attempt check error:', attemptError);
  }

  if (attemptData?.locked && attemptData.locked_until) {
    const lockedUntil = new Date(attemptData.locked_until);
    const remainingMinutes = Math.ceil(
      (lockedUntil.getTime() - Date.now()) / 1000 / 60
    );
    return {
      success: false,
      error: `로그인 시도가 너무 많습니다. ${remainingMinutes}분 후에 다시 시도해주세요.`,
    };
  }

  // 로그인 시도
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 실패 시 시도 기록
    await supabase.rpc('record_login_attempt', {
      user_email: email,
      success: false,
    });

    if (error.message.includes('Invalid login credentials')) {
      return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' };
    }
    console.error('Login error:', error);
    return { success: false, error: '로그인 중 오류가 발생했습니다.' };
  }

  // 성공 시 시도 기록 초기화
  await supabase.rpc('record_login_attempt', {
    user_email: email,
    success: true,
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

// 로그아웃
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

// 비밀번호 재설정 이메일 발송
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  const email = formData.get('email') as string;

  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
  });

  if (error) {
    console.error('Reset password error:', error);
    return { success: false, error: '비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.' };
  }

  return { success: true };
}

// 비밀번호 업데이트
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error };
  }

  const confirmValidation = validatePasswordConfirm(password, confirmPassword);
  if (!confirmValidation.valid) {
    return { success: false, error: confirmValidation.error };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error('Update password error:', error);
    return { success: false, error: '비밀번호 변경 중 오류가 발생했습니다.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// 현재 사용자 정보 조회
export async function getCurrentUser() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
    return null;
  }

  return profile;
}

// 잔고 업데이트
export async function updateBalance(amount: number): Promise<{
  success: boolean;
  balance?: number;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: '로그인이 필요합니다.' };
  }

  const { data: newBalance, error } = await supabase.rpc('update_balance', {
    user_id: user.id,
    amount,
  });

  if (error) {
    console.error('Balance update error:', error);
    return { success: false, error: '잔고 업데이트 중 오류가 발생했습니다.' };
  }

  revalidatePath('/', 'layout');
  return { success: true, balance: newBalance };
}
