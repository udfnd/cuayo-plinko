// 유효성 검사 유틸리티

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 이메일 형식 검사
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { valid: false, error: '이메일을 입력해주세요.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: '올바른 이메일 형식이 아닙니다.' };
  }

  return { valid: true };
}

// 비밀번호 강도 검사
export function validatePassword(password: string): ValidationResult {
  if (!password || password.length === 0) {
    return { valid: false, error: '비밀번호를 입력해주세요.' };
  }

  if (password.length < 8) {
    return { valid: false, error: '비밀번호는 8자 이상이어야 합니다.' };
  }

  if (password.length > 72) {
    return { valid: false, error: '비밀번호는 72자 이하여야 합니다.' };
  }

  // 최소 하나의 숫자 포함
  if (!/\d/.test(password)) {
    return { valid: false, error: '비밀번호에 숫자가 포함되어야 합니다.' };
  }

  // 최소 하나의 영문자 포함
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: '비밀번호에 영문자가 포함되어야 합니다.' };
  }

  return { valid: true };
}

// 비밀번호 확인 일치 검사
export function validatePasswordConfirm(
  password: string,
  confirmPassword: string
): ValidationResult {
  if (password !== confirmPassword) {
    return { valid: false, error: '비밀번호가 일치하지 않습니다.' };
  }

  return { valid: true };
}

// 닉네임 검사
export function validateNickname(nickname: string): ValidationResult {
  if (!nickname || nickname.trim() === '') {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  if (nickname.length < 2) {
    return { valid: false, error: '닉네임은 2자 이상이어야 합니다.' };
  }

  if (nickname.length > 20) {
    return { valid: false, error: '닉네임은 20자 이하여야 합니다.' };
  }

  // 특수문자 제한 (한글, 영문, 숫자, 언더스코어만 허용)
  if (!/^[가-힣a-zA-Z0-9_]+$/.test(nickname)) {
    return { valid: false, error: '닉네임은 한글, 영문, 숫자, 언더스코어(_)만 사용 가능합니다.' };
  }

  return { valid: true };
}
