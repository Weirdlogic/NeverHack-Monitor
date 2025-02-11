import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { NotificationStore } from '../types/notifications';

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      {
        ...notification,
        id: uuidv4(),
        time: new Date(),
      },
      ...state.notifications,
    ].slice(0, 50), // Keep only last 50 notifications
  })),
  clearNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),
  clearAll: () => set({ notifications: [] }),
}));