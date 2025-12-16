-- ============================================
-- Cuayo 멀티플레이어 게임 시스템 스키마
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- 1. game_rooms 테이블: 게임 방 (Crash, Holdem)
CREATE TABLE IF NOT EXISTS public.game_rooms (
  id TEXT PRIMARY KEY,                    -- 'crash' 또는 'holdem'
  current_round INTEGER NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'BETTING',
  game_state JSONB NOT NULL DEFAULT '{}', -- 전체 게임 상태
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  leader_connected_at TIMESTAMPTZ,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. game_bets 테이블: 사용자별 베팅
CREATE TABLE IF NOT EXISTS public.game_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  bet_data JSONB NOT NULL,               -- 베팅 상세 정보
  status TEXT NOT NULL DEFAULT 'active', -- active, won, lost, cashed_out
  payout INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- game_bets 인덱스
CREATE INDEX IF NOT EXISTS idx_game_bets_room_round ON public.game_bets(room_id, round_number);
CREATE INDEX IF NOT EXISTS idx_game_bets_user ON public.game_bets(user_id);

-- 초기 게임 방 생성
INSERT INTO public.game_rooms (id, phase, game_state)
VALUES
  ('crash', 'BETTING', '{"roundNumber": 1, "currentMultiplier": 1.00}'),
  ('holdem', 'PRE_DEAL', '{"roundNumber": 1, "phase": "PRE_DEAL"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- RLS 정책
-- ============================================

ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_bets ENABLE ROW LEVEL SECURITY;

-- game_rooms: 모든 인증된 사용자가 조회 가능
CREATE POLICY "Anyone can view game rooms"
  ON public.game_rooms FOR SELECT
  USING (true);

-- game_rooms: 리더만 업데이트 가능 (서비스 역할 또는 리더)
CREATE POLICY "Leader can update game room"
  ON public.game_rooms FOR UPDATE
  USING (auth.uid() = leader_id OR leader_id IS NULL);

-- game_bets: 자신의 베팅만 생성 가능
CREATE POLICY "Users can create own bets"
  ON public.game_bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- game_bets: 같은 방의 모든 베팅 조회 가능
CREATE POLICY "Anyone can view bets in room"
  ON public.game_bets FOR SELECT
  USING (true);

-- game_bets: 자신의 베팅만 업데이트 가능
CREATE POLICY "Users can update own bets"
  ON public.game_bets FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 함수: 리더 등록
-- ============================================

CREATE OR REPLACE FUNCTION public.claim_game_leader(room_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_leader_id UUID;
  current_leader_connected TIMESTAMPTZ;
BEGIN
  -- 현재 리더 확인
  SELECT leader_id, leader_connected_at
  INTO current_leader_id, current_leader_connected
  FROM public.game_rooms
  WHERE id = room_id_param;

  -- 리더가 없거나 30초 이상 비활성이면 새 리더로 등록
  IF current_leader_id IS NULL OR
     current_leader_connected IS NULL OR
     current_leader_connected < NOW() - INTERVAL '30 seconds' THEN

    UPDATE public.game_rooms
    SET leader_id = auth.uid(),
        leader_connected_at = NOW(),
        last_update = NOW()
    WHERE id = room_id_param;

    RETURN TRUE;
  END IF;

  -- 이미 자신이 리더인 경우
  IF current_leader_id = auth.uid() THEN
    UPDATE public.game_rooms
    SET leader_connected_at = NOW(),
        last_update = NOW()
    WHERE id = room_id_param;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- ============================================
-- 함수: 리더 하트비트 (연결 유지)
-- ============================================

CREATE OR REPLACE FUNCTION public.heartbeat_game_leader(room_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.game_rooms
  SET leader_connected_at = NOW(),
      last_update = NOW()
  WHERE id = room_id_param AND leader_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- ============================================
-- 함수: 게임 상태 업데이트 (리더만)
-- ============================================

CREATE OR REPLACE FUNCTION public.update_game_state(
  room_id_param TEXT,
  new_phase TEXT,
  new_round INTEGER,
  new_state JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.game_rooms
  SET phase = new_phase,
      current_round = new_round,
      game_state = new_state,
      last_update = NOW()
  WHERE id = room_id_param AND leader_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- ============================================
-- 함수: 서버 시간 가져오기 (클라이언트 동기화용)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT NOW();
$$;

-- ============================================
-- Realtime 활성화
-- ============================================

-- game_rooms 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_bets;
