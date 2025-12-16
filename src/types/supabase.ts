export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          nickname: string;
          balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nickname: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nickname?: string;
          balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      login_attempts: {
        Row: {
          id: string;
          email: string;
          attempt_count: number;
          last_attempt_at: string;
          locked_until: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          attempt_count?: number;
          last_attempt_at?: string;
          locked_until?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          attempt_count?: number;
          last_attempt_at?: string;
          locked_until?: string | null;
        };
        Relationships: [];
      };
      game_rooms: {
        Row: {
          id: string;
          current_round: number;
          phase: string;
          game_state: Json;
          leader_id: string | null;
          leader_connected_at: string | null;
          last_update: string;
          created_at: string;
        };
        Insert: {
          id: string;
          current_round?: number;
          phase?: string;
          game_state?: Json;
          leader_id?: string | null;
          leader_connected_at?: string | null;
          last_update?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          current_round?: number;
          phase?: string;
          game_state?: Json;
          leader_id?: string | null;
          leader_connected_at?: string | null;
          last_update?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      game_bets: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          round_number: number;
          bet_data: Json;
          status: string;
          payout: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          round_number: number;
          bet_data: Json;
          status?: string;
          payout?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          user_id?: string;
          round_number?: number;
          bet_data?: Json;
          status?: string;
          payout?: number;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_nickname_exists: {
        Args: { nickname_to_check: string };
        Returns: boolean;
      };
      update_balance: {
        Args: { user_id: string; amount: number };
        Returns: number;
      };
      check_login_attempts: {
        Args: { user_email: string };
        Returns: {
          locked: boolean;
          attempts: number;
          locked_until: string | null;
        };
      };
      record_login_attempt: {
        Args: { user_email: string; success: boolean };
        Returns: {
          locked: boolean;
          attempts: number;
          locked_until: string | null;
        };
      };
      claim_game_leader: {
        Args: { room_id_param: string };
        Returns: boolean;
      };
      heartbeat_game_leader: {
        Args: { room_id_param: string };
        Returns: boolean;
      };
      update_game_state: {
        Args: {
          room_id_param: string;
          new_phase: string;
          new_round: number;
          new_state: Json;
        };
        Returns: boolean;
      };
      get_server_time: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
