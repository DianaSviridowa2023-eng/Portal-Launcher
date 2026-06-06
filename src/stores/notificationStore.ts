import { create } from 'zustand';

export type NotifType = 'friend_request' | 'message' | 'mod_update' | 'system' | 'friend_online';

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  avatarUrl?: string;
  fromUuid?: string;
  fromUsername?: string;
  read: boolean;
  createdAt: string;
  action?: { label: string; route: string };
}

interface NotifState {
  notifications: Notification[];
  panelOpen: boolean;
  add: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  setPanel: (open: boolean) => void;
  unreadCount: () => number;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  notifications: [
    {
      id: 'n1', type: 'friend_request', title: 'Friend Request',
      body: 'CreeperSlayer99 wants to be friends!', fromUsername: 'CreeperSlayer99',
      read: false, createdAt: new Date(Date.now() - 60000).toISOString(),
      action: { label: 'View', route: '/friends' },
    },
    {
      id: 'n2', type: 'message', title: 'New Message',
      body: 'DiamondMiner: заходи ка, ты ко мне :)', fromUsername: 'DiamondMiner',
      read: false, createdAt: new Date(Date.now() - 300000).toISOString(),
      action: { label: 'Open Chat', route: '/friends' },
    },
    {
      id: 'n3', type: 'mod_update', title: 'Mod Update Available',
      body: 'Sodium 0.6.1 is available for 1.21.1',
      read: true, createdAt: new Date(Date.now() - 3600000).toISOString(),
      action: { label: 'Update', route: '/library' },
    },
  ],
  panelOpen: false,

  add: (n) => set(s => ({
    notifications: [{
      ...n,
      id: `notif-${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date().toISOString(),
    }, ...s.notifications].slice(0, 50),
  })),

  markRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
  })),

  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
  })),

  remove: (id) => set(s => ({
    notifications: s.notifications.filter(n => n.id !== id),
  })),

  clear: () => set({ notifications: [] }),
  setPanel: (open) => set({ panelOpen: open }),
  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
