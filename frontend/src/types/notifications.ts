export type NotificationType = 'watchlist' | 'traffic' | 'target' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  time: Date;
  metadata?: {
    pattern?: string;
    host?: string;
    port?: number;
    severity?: string;
  };
}

export interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'time'>) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}