import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useNotificationStore } from '../store/notifications';
import { getLatestMatches, getTrafficAlerts, getNewTargets } from '../services/api';

interface MatchAlert {
  pattern: string;
  host: string;
  severity: string;
  match_time: string;
}

interface TrafficAlert {
  host: string;
  port: number;
  attacks: number;
  last_seen: string;
}

interface NewTarget {
  host: string;
  port: number;
  first_seen: string;
}

const HIGH_TRAFFIC_THRESHOLD = 10;

export function useNotifications() {
  const addNotification = useNotificationStore(state => state.addNotification);
  const processedAlerts = useRef(new Set<string>());

  // Poll for new matches
  useQuery<MatchAlert[]>({
    queryKey: ['latestMatches'],
    queryFn: () => getLatestMatches(5),
    refetchInterval: 10000,
    onSuccess: (matches: MatchAlert[]) => {
      matches?.forEach(match => {
        const alertKey = `watchlist-${match.pattern}-${match.host}-${match.match_time}`;
        if (!processedAlerts.current.has(alertKey)) {
          addNotification({
            type: 'watchlist',
            message: `Watchlist pattern "${match.pattern}" matched`,
            metadata: {
              pattern: match.pattern,
              host: match.host,
              severity: match.severity
            }
          });
          processedAlerts.current.add(alertKey);
        }
      });
    }
  } as UseQueryOptions<MatchAlert[]>);

  // Poll for high traffic
  useQuery<TrafficAlert[]>({
    queryKey: ['trafficAlerts'],
    queryFn: () => getTrafficAlerts(HIGH_TRAFFIC_THRESHOLD),
    refetchInterval: 15000,
    onSuccess: (alerts: TrafficAlert[]) => {
      alerts?.forEach(alert => {
        const alertKey = `traffic-${alert.host}-${alert.last_seen}`;
        if (!processedAlerts.current.has(alertKey)) {
          addNotification({
            type: 'traffic',
            message: `High traffic detected: ${alert.attacks} hits on ${alert.host}`,
            metadata: {
              host: alert.host,
              port: alert.port
            }
          });
          processedAlerts.current.add(alertKey);
        }
      });
    }
  } as UseQueryOptions<TrafficAlert[]>);

  // Track new targets
  useQuery<NewTarget[]>({
    queryKey: ['newTargets'],
    queryFn: () => getNewTargets(5), // Check last 5 minutes
    refetchInterval: 20000,
    onSuccess: (targets: NewTarget[]) => {
      targets?.forEach(target => {
        const alertKey = `target-${target.host}-${target.first_seen}`;
        if (!processedAlerts.current.has(alertKey)) {
          addNotification({
            type: 'target',
            message: `New target detected: ${target.host}`,
            metadata: {
              host: target.host,
              port: target.port
            }
          });
          processedAlerts.current.add(alertKey);
        }
      });
    }
  } as UseQueryOptions<NewTarget[]>);

  // Clean up old processed alerts periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      processedAlerts.current = new Set();
    }, 3600000); // Clear every hour

    return () => clearInterval(cleanupInterval);
  }, []);
}