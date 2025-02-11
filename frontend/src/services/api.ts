import axios from 'axios';
import { Target, WatchlistItem, HealthStatus } from '../types/api.types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Watchlist API calls
export const getWatchlistItems = () =>
  api.get<WatchlistItem[]>('/watchlist').then(res => res.data);

export const addWatchlistItem = (data: { pattern: string; description: string; severity: string }) =>
  api.post<WatchlistItem>('/watchlist', data).then(res => res.data);

export const deleteWatchlistItem = (id: number) => {
  if (!id || isNaN(id) || !Number.isInteger(id)) {
    return Promise.reject(new Error('Invalid watchlist item ID'));
  }
  return api.delete<{ status: string }>(`/watchlist/${id}`).then(res => res.data);
};

export const checkWatchlistItem = (id: number) =>
  api.get(`/watchlist/${id}/check`).then(res => res.data);

export const getLatestMatches = async (limit = 10) => {
  const response = await axios.get(`${API_BASE_URL}/watchlist/latest-matches?limit=${limit}`);
  return response.data;
};

// Search API calls
export const searchTargets = (query: string) =>
  api.get<Target[]>('/search', { params: { query } }).then(res => res.data);

export const getSearchSuggestions = (query: string) =>
  api.get<string[]>('/search/suggest', { params: { q: query } }).then(res => res.data);

// Health Check API calls
export const getApiHealth = () =>
  api.get<HealthStatus>('/health').then(res => res.data);

export const getSearchHealth = () =>
  api.get<HealthStatus>('/search/health').then(res => res.data);

// Dashboard API calls
export const getDashboardStats = () =>
  api.get('/dashboard/stats').then(res => res.data);

export const getDashboardTrends = () =>
  api.get('/dashboard/trends').then(res => res.data);

export const getRecentTargets = () =>
  api.get('/dashboard/recent').then(res => res.data);

export const getAttackMethods = () =>
  api.get('/dashboard/methods').then(res => res.data);

// Target API calls
export const getActiveTargets = (days: number = 7) =>
  api.get<Target[]>('/search/targets/active', { params: { days } }).then(res => res.data);

export const getTargetDetails = (host: string) =>
  api.get<Target[]>(`/search/target/${encodeURIComponent(host)}`).then(res => res.data);

// Traffic and Target Detection API calls
export const getTrafficAlerts = (threshold = 10) =>
  api.get('/watchlist/traffic-alerts', { params: { threshold } }).then(res => res.data);

export const getNewTargets = (minutes = 5) =>
  api.get('/watchlist/new-targets', { params: { minutes } }).then(res => res.data);
