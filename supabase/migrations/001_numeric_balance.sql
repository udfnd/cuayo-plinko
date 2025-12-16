-- ============================================
-- Cuayo 잔고 시스템 마이그레이션
-- INTEGER → NUMERIC(10,2) 변경 및 음수 잔고 방지
--
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 1. 기존 INTEGER 버전 함수 삭제 (300 Multiple Choices 오류 방지)
DROP FUNCTION IF EXISTS public.update_balance(UUID, INTEGER);

-- 2. balance 컬럼 타입 변경 (INTEGER → NUMERIC)
ALTER TABLE public.profiles
ALTER COLUMN balance TYPE NUMERIC(10, 2);

-- 3. update_balance 함수 업데이트 (소수점 지원 + 음수 잔고 방지)
CREATE OR REPLACE FUNCTION public.update_balance(user_id UUID, amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  -- 현재 잔고 조회
  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = user_id;

  -- 사용자가 존재하지 않는 경우
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- 새 잔고 계산
  new_balance := current_balance + amount;

  -- 음수 잔고 방지
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', current_balance, amount;
  END IF;

  -- 잔고 업데이트
  UPDATE public.profiles
  SET balance = new_balance,
      updated_at = NOW()
  WHERE id = user_id;

  RETURN new_balance;
END;
$$;

-- 확인용 쿼리 (선택사항)
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'balance';
