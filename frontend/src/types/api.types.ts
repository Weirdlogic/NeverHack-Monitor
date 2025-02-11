// api.types.ts

export interface DashboardStats {
  total_targets: number;
  total_attacks: number;
  unique_hosts: number;
  unique_ips: number;
}

export interface Target {
  host: string;
  ip: string;
  type: string;
  method: string;
  port: number;
  path?: string;
  first_seen?: string;
  last_seen?: string;
  attacks?: number;
  attack_stats?: {
    methods_used: string[];
    ports_targeted: string[];
    recent_paths?: string[];
  };
  attack_instances?: Target[];
}

export interface WatchlistItem {
  id: number;
  pattern: string;
  description: string;
  severity: string;
  created_at: string;
  last_match?: string;
  match_count?: number;
  is_up?: boolean;
  last_check?: string;
  last_status?: number;
}

export interface AttackTrend {
  time: string;
  attacks: number;
}

export interface WebsiteStatusPayload {
  host: string;
  is_up: boolean;
  status_code?: number;
  error?: string;
}

export interface WatchlistMatchPayload {
  pattern: string;
  matched_host: string;
  timestamp: string;
}

export interface SearchSuggestions {
  hosts: string[];
  ips: string[];
  paths: string[];
}

export interface TargetDetails {
  details: Target & {
    total_attacks: number;
    common_methods: Record<string, number>;
    port_distribution: Record<string, number>;
  };
  history: {
    time: string;
    attacks: number;
    methods: string[];
  }[];
}

// Add health check types
export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
  error?: string;
}
