'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from '@/types/supabase';

export type GameType = 'crash' | 'holdem';

export interface PlayerInfo {
  id: string;
  nickname: string;
  onlineAt: string;
}

export interface GameRoomState<T = unknown> {
  roomId: GameType;
  phase: string;
  roundNumber: number;
  gameState: T;
  isLeader: boolean;
  players: PlayerInfo[];
  playerCount: number;
}

export interface UseGameRoomResult<T> {
  state: GameRoomState<T> | null;
  isConnected: boolean;
  isLeader: boolean;
  broadcast: (event: string, payload: unknown) => void;
  updateGameState: (phase: string, roundNumber: number, gameState: T) => Promise<boolean>;
}

export function useGameRoom<T = unknown>(roomId: GameType): UseGameRoomResult<T> {
  const { profile, isConfigured } = useAuth();
  const [state, setState] = useState<GameRoomState<T> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  // Supabase 클라이언트 초기화
  useEffect(() => {
    if (isConfigured) {
      try {
        supabaseRef.current = createClient();
      } catch {
        supabaseRef.current = null;
      }
    }
  }, [isConfigured]);

  // 리더 등록 시도
  const tryClaimLeader = useCallback(async () => {
    if (!supabaseRef.current || !profile) return false;

    const { data, error } = await supabaseRef.current.rpc('claim_game_leader', {
      room_id_param: roomId,
    });

    if (error) {
      console.error('Failed to claim leader:', error);
      return false;
    }

    return data as boolean;
  }, [roomId, profile]);

  // 리더 하트비트
  const sendHeartbeat = useCallback(async () => {
    if (!supabaseRef.current || !isLeader) return;

    await supabaseRef.current.rpc('heartbeat_game_leader', {
      room_id_param: roomId,
    });
  }, [roomId, isLeader]);

  // 게임 상태 업데이트 (리더만)
  const updateGameState = useCallback(async (
    phase: string,
    roundNumber: number,
    gameState: T
  ): Promise<boolean> => {
    if (!supabaseRef.current || !isLeader) return false;

    const { data, error } = await supabaseRef.current.rpc('update_game_state', {
      room_id_param: roomId,
      new_phase: phase,
      new_round: roundNumber,
      new_state: gameState as unknown as Json,
    });

    if (error) {
      console.error('Failed to update game state:', error);
      return false;
    }

    return data as boolean;
  }, [roomId, isLeader]);

  // 브로드캐스트 메시지 전송
  const broadcast = useCallback((event: string, payload: unknown) => {
    if (!channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event,
      payload,
    });
  }, []);

  // 채널 연결 및 구독
  useEffect(() => {
    if (!supabaseRef.current || !profile) return;

    const supabase = supabaseRef.current;
    const channelName = `game:${roomId}`;

    // 채널 생성
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    // Presence 변경 감지
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const playerList: PlayerInfo[] = [];

      Object.values(presenceState).forEach((presences) => {
        (presences as unknown as PlayerInfo[]).forEach((p) => {
          playerList.push(p);
        });
      });

      setPlayers(playerList);
    });

    // 브로드캐스트 메시지 수신
    channel.on('broadcast', { event: 'game_state' }, ({ payload }) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: payload.phase,
          roundNumber: payload.roundNumber,
          gameState: payload.gameState as T,
        };
      });
    });

    channel.on('broadcast', { event: 'game_update' }, ({ payload }) => {
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          gameState: { ...prev.gameState, ...payload } as T,
        };
      });
    });

    // DB 변경 감지
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const newData = payload.new as {
          phase: string;
          current_round: number;
          game_state: T;
          leader_id: string | null;
        };

        setState((prev) => ({
          roomId,
          phase: newData.phase,
          roundNumber: newData.current_round,
          gameState: newData.game_state,
          isLeader: newData.leader_id === profile.id,
          players: prev?.players || [],
          playerCount: prev?.playerCount || 0,
        }));

        setIsLeader(newData.leader_id === profile.id);
      }
    );

    // 채널 구독
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Presence에 자신 등록
        await channel.track({
          id: profile.id,
          nickname: profile.nickname,
          onlineAt: new Date().toISOString(),
        });

        // 현재 게임 상태 가져오기
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomData) {
          const isCurrentLeader = roomData.leader_id === profile.id;
          setIsLeader(isCurrentLeader);

          setState({
            roomId,
            phase: roomData.phase,
            roundNumber: roomData.current_round,
            gameState: roomData.game_state as T,
            isLeader: isCurrentLeader,
            players: [],
            playerCount: 0,
          });

          // 리더가 없거나 자신이 리더면 리더 등록 시도
          if (!roomData.leader_id || isCurrentLeader) {
            const claimed = await tryClaimLeader();
            setIsLeader(claimed);
          }
        }
      }
    });

    channelRef.current = channel;

    // 하트비트 시작
    heartbeatRef.current = setInterval(() => {
      sendHeartbeat();
    }, 10000);

    // 클린업
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [roomId, profile, tryClaimLeader, sendHeartbeat]);

  // 플레이어 수 업데이트
  useEffect(() => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players,
        playerCount: players.length,
      };
    });
  }, [players]);

  return {
    state,
    isConnected,
    isLeader,
    broadcast,
    updateGameState,
  };
}
