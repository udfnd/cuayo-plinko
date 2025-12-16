'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type GameType = 'crash' | 'holdem';

export interface PlayerInfo {
  id: string;
  nickname: string;
  onlineAt: string;
}

export interface GameSyncState {
  serverTime: number;        // 서버 시간 (ms)
  roundNumber: number;       // 현재 라운드 번호
  phaseIndex: number;        // 현재 페이즈 인덱스
  phaseStartTime: number;    // 현재 페이즈 시작 시간
  timeInPhase: number;       // 페이즈 내 경과 시간
  timeLeftInPhase: number;   // 페이즈 내 남은 시간
  seed: string;              // 현재 라운드 시드
}

export interface PhaseConfig {
  name: string;
  duration: number;  // ms
}

export interface UseServerSyncResult {
  syncState: GameSyncState;
  isConnected: boolean;
  players: PlayerInfo[];
  playerCount: number;
}

// 게임 시작 기준 시간 (에포크) - 2024년 1월 1일 00:00:00 UTC
const GAME_EPOCH = new Date('2024-01-01T00:00:00Z').getTime();

// 시드 생성 (라운드 번호 기반)
function generateSeed(roundNumber: number, gameType: GameType): string {
  return `${gameType}-round-${roundNumber}-v1`;
}

// 서버 시간 기준 게임 상태 계산
function calculateGameState(
  serverTime: number,
  phases: PhaseConfig[],
  gameType: GameType
): GameSyncState {
  const totalPhaseDuration = phases.reduce((sum, p) => sum + p.duration, 0);

  // 에포크부터 경과 시간
  const elapsed = serverTime - GAME_EPOCH;

  // 현재 라운드 번호 (1부터 시작)
  const roundNumber = Math.floor(elapsed / totalPhaseDuration) + 1;

  // 현재 라운드 내 경과 시간
  const timeInRound = elapsed % totalPhaseDuration;

  // 현재 페이즈 찾기
  let accumulatedTime = 0;
  let phaseIndex = 0;
  let phaseStartTime = 0;

  for (let i = 0; i < phases.length; i++) {
    if (timeInRound < accumulatedTime + phases[i].duration) {
      phaseIndex = i;
      phaseStartTime = accumulatedTime;
      break;
    }
    accumulatedTime += phases[i].duration;
  }

  const timeInPhase = timeInRound - phaseStartTime;
  const timeLeftInPhase = phases[phaseIndex].duration - timeInPhase;

  return {
    serverTime,
    roundNumber,
    phaseIndex,
    phaseStartTime: serverTime - timeInPhase,
    timeInPhase,
    timeLeftInPhase,
    seed: generateSeed(roundNumber, gameType),
  };
}

export function useServerSync(
  gameType: GameType,
  phases: PhaseConfig[]
): UseServerSyncResult {
  const { profile } = useAuth();
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  // 초기 상태를 즉시 계산 (null 방지)
  const [syncState, setSyncState] = useState<GameSyncState>(() =>
    calculateGameState(Date.now(), phases, gameType)
  );

  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const isMountedRef = useRef(true);

  // Supabase 클라이언트 초기화
  useEffect(() => {
    isMountedRef.current = true;

    if (isSupabaseConfigured()) {
      try {
        supabaseRef.current = createClient();
      } catch (e) {
        console.error('Failed to create Supabase client:', e);
        supabaseRef.current = null;
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 서버 시간 동기화
  const syncServerTime = useCallback(async () => {
    if (!supabaseRef.current) return;

    try {
      const clientBefore = Date.now();
      const { data, error } = await supabaseRef.current.rpc('get_server_time');

      if (!isMountedRef.current) return;

      if (error) {
        console.warn('Server time sync failed, using local time:', error.message);
        return;
      }

      const clientAfter = Date.now();
      const roundTrip = clientAfter - clientBefore;
      const serverTime = new Date(data).getTime();

      // 네트워크 지연을 고려한 서버 시간 보정
      const estimatedServerTime = serverTime + Math.floor(roundTrip / 2);
      const offset = estimatedServerTime - clientAfter;

      if (isMountedRef.current) {
        setServerOffset(offset);
      }
    } catch (e) {
      console.warn('Server time sync error, using local time:', e);
    }
  }, []);

  // 게임 상태 업데이트
  const updateGameState = useCallback(() => {
    if (!isMountedRef.current) return;

    const currentServerTime = Date.now() + serverOffset;
    const newState = calculateGameState(currentServerTime, phases, gameType);
    setSyncState(newState);
  }, [serverOffset, phases, gameType]);

  // 초기 연결 및 시간 동기화
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    // 약간 지연 후 서버 시간 동기화 (Supabase 클라이언트 초기화 대기)
    const initTimeout = setTimeout(() => {
      syncServerTime();
    }, 100);

    // 1분마다 시간 재동기화
    const syncInterval = setInterval(syncServerTime, 60000);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(syncInterval);
    };
  }, [syncServerTime]);

  // 게임 상태 틱 (100ms 간격)
  useEffect(() => {
    // 즉시 업데이트
    updateGameState();

    // 주기적 업데이트
    timerRef.current = setInterval(updateGameState, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [updateGameState]);

  // Presence 채널 (플레이어 목록용)
  useEffect(() => {
    if (!supabaseRef.current || !profile) return;

    const supabase = supabaseRef.current;
    const channelName = `game:${gameType}:presence`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      if (!isMountedRef.current) return;

      const presenceState = channel.presenceState();
      const playerList: PlayerInfo[] = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as unknown as PlayerInfo[]).forEach((p) => {
          playerList.push(p);
        });
      });

      setPlayers(playerList);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && isMountedRef.current) {
        setIsConnected(true);

        await channel.track({
          id: profile.id,
          nickname: profile.nickname,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gameType, profile]);

  return {
    syncState,
    isConnected,
    players,
    playerCount: players.length,
  };
}
