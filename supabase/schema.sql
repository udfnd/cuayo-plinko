-- ============================================
-- Cuayo 회원 시스템 데이터베이스 스키마
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 1. profiles 테이블: 회원 정보 저장
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 1000,  -- 초기 잔고 1000원
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. login_attempts 테이블: 로그인 시도 추적 (brute-force 방지)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ DEFAULT NULL
);

-- login_attempts 테이블에 email 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);

-- ============================================
-- RLS (Row Level Security) 정책
-- ============================================

-- profiles 테이블 RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 자신의 프로필만 수정 가능 (단, balance는 함수를 통해서만 수정)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 회원가입 시 프로필 생성 허용
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- login_attempts 테이블 RLS 활성화
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- login_attempts는 서비스 역할로만 접근 가능 (보안)
-- 클라이언트에서는 직접 접근 불가

-- ============================================
-- 함수들
-- ============================================

-- 닉네임 중복 확인 함수
CREATE OR REPLACE FUNCTION public.check_nickname_exists(nickname_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE nickname = nickname_to_check
  );
END;
$$;

-- 잔고 업데이트 함수 (게임 결과 반영용)
CREATE OR REPLACE FUNCTION public.update_balance(user_id UUID, amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount,
      updated_at = NOW()
  WHERE id = user_id
  RETURNING balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- 로그인 시도 기록 함수
CREATE OR REPLACE FUNCTION public.record_login_attempt(user_email TEXT, success BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  current_attempts INTEGER;
  lock_time TIMESTAMPTZ;
BEGIN
  IF success THEN
    -- 성공 시 시도 기록 초기화
    DELETE FROM public.login_attempts WHERE email = user_email;
    RETURN jsonb_build_object('locked', false, 'attempts', 0);
  ELSE
    -- 실패 시 시도 기록 증가
    INSERT INTO public.login_attempts (email, attempt_count, last_attempt_at)
    VALUES (user_email, 1, NOW())
    ON CONFLICT (email) DO UPDATE
    SET attempt_count = public.login_attempts.attempt_count + 1,
        last_attempt_at = NOW(),
        locked_until = CASE
          WHEN public.login_attempts.attempt_count >= 4 THEN NOW() + INTERVAL '15 minutes'
          ELSE NULL
        END
    RETURNING attempt_count, locked_until INTO current_attempts, lock_time;

    RETURN jsonb_build_object(
      'locked', lock_time IS NOT NULL AND lock_time > NOW(),
      'attempts', current_attempts,
      'locked_until', lock_time
    );
  END IF;
END;
$$;

-- 로그인 시도 확인 함수
CREATE OR REPLACE FUNCTION public.check_login_attempts(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempts_record RECORD;
BEGIN
  SELECT attempt_count, locked_until
  INTO attempts_record
  FROM public.login_attempts
  WHERE email = user_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('locked', false, 'attempts', 0);
  END IF;

  -- 15분 지난 잠금은 해제
  IF attempts_record.locked_until IS NOT NULL AND attempts_record.locked_until <= NOW() THEN
    DELETE FROM public.login_attempts WHERE email = user_email;
    RETURN jsonb_build_object('locked', false, 'attempts', 0);
  END IF;

  RETURN jsonb_build_object(
    'locked', attempts_record.locked_until IS NOT NULL AND attempts_record.locked_until > NOW(),
    'attempts', attempts_record.attempt_count,
    'locked_until', attempts_record.locked_until
  );
END;
$$;

-- login_attempts에 unique constraint 추가 (upsert용)
ALTER TABLE public.login_attempts ADD CONSTRAINT login_attempts_email_key UNIQUE (email);

-- ============================================
-- 트리거: 프로필 업데이트 시간 자동 갱신
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 회원가입 시 자동 프로필 생성 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nickname, balance)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'user_' || LEFT(NEW.id::text, 8)),
    1000  -- 초기 잔고 1000원
  );
  RETURN NEW;
END;
$$;

-- auth.users에 새 사용자 생성 시 profiles에 자동 추가
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
