import { create } from 'zustand';

export type FriendStatus = 'online' | 'offline' | 'playing';

export interface Friend {
  id: string;
  uuid: string;
  username: string;
  status: FriendStatus;
  currentInstance?: string;
  serverAddress?: string;  // null = LAN, string = dedicated server
  lastSeen?: string;
  unread: number;
  friendsSince: string;
  avatarColor: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  type: 'text' | 'image' | 'voice';
  status: 'sent' | 'delivered' | 'read';
  deleted?: boolean;
  deletedForMe?: boolean;
  imageUrl?: string;
}

interface FriendsState {
  friends: Friend[];
  selectedId: string | null;
  messages: Record<string, Message[]>;
  select: (id: string | null) => void;
  addMessage: (friendId: string, msg: Message) => void;
  markRead: (friendId: string) => void;
  deleteForMe: (friendId: string, msgId: string) => void;
  deleteForAll: (friendId: string, msgId: string) => void;
  setFriendStatus: (friendId: string, status: FriendStatus, extra?: Partial<Friend>) => void;
}

export const useFriendsStore = create<FriendsState>((set) => ({
  friends: [
    { id: 'f1', uuid: 'u1', username: 'CreeperSlayer99', status: 'online', unread: 3, friendsSince: '2023-04-01', avatarColor: '#E74C3C' },
    { id: 'f2', uuid: 'u2', username: 'DiamondMiner', status: 'playing', currentInstance: 'Tech Modpack', serverAddress: undefined, unread: 0, friendsSince: '2023-08-15', avatarColor: '#3498DB' },
    { id: 'f3', uuid: 'u3', username: 'EnderDragon_X', status: 'playing', currentInstance: 'Vanilla 1.21', serverAddress: 'mc.hypixel.net', unread: 1, friendsSince: '2024-01-20', avatarColor: '#9B59B6' },
    { id: 'f4', uuid: 'u4', username: 'SteveBuilder', status: 'offline', lastSeen: new Date(Date.now() - 7200000).toISOString(), unread: 0, friendsSince: '2024-06-10', avatarColor: '#2ECC71' },
  ],
  selectedId: null,
  messages: {
    f1: [
      { id: 'm1', senderId: 'f1', text: 'Hey! Want to play together?', timestamp: new Date(Date.now() - 600000).toISOString(), isMe: false, type: 'text', status: 'read' },
      { id: 'm2', senderId: 'me', text: 'Sure! Join my server in a sec', timestamp: new Date(Date.now() - 540000).toISOString(), isMe: true, type: 'text', status: 'read' },
      { id: 'm3', senderId: 'f1', text: 'What modpack are you using?', timestamp: new Date(Date.now() - 480000).toISOString(), isMe: false, type: 'text', status: 'read' },
      { id: 'm4', senderId: 'f1', text: 'Is it the Create one?', timestamp: new Date(Date.now() - 470000).toISOString(), isMe: false, type: 'text', status: 'read' },
      { id: 'm5', senderId: 'me', text: "Yeah! Create + AE2, it's insane 🔥", timestamp: new Date(Date.now() - 420000).toISOString(), isMe: true, type: 'text', status: 'read' },
    ],
    f2: [],
    f3: [{ id: 'm10', senderId: 'f3', text: 'заходи ка, ты ко мне :)', timestamp: new Date(Date.now() - 300000).toISOString(), isMe: false, type: 'text', status: 'read' }],
    f4: [],
  },

  select: (id) => set((s) => ({
    selectedId: id,
    friends: s.friends.map(f => f.id === id ? { ...f, unread: 0 } : f),
  })),

  addMessage: (friendId, msg) => set((s) => ({
    messages: { ...s.messages, [friendId]: [...(s.messages[friendId] ?? []), msg] },
  })),

  markRead: (friendId) => set((s) => ({
    friends: s.friends.map(f => f.id === friendId ? { ...f, unread: 0 } : f),
  })),

  deleteForMe: (friendId, msgId) => set((s) => ({
    messages: {
      ...s.messages,
      [friendId]: (s.messages[friendId] ?? []).map(m => m.id === msgId ? { ...m, deletedForMe: true } : m),
    },
  })),

  deleteForAll: (friendId, msgId) => set((s) => ({
    messages: {
      ...s.messages,
      [friendId]: (s.messages[friendId] ?? []).map(m => m.id === msgId ? { ...m, deleted: true, text: '' } : m),
    },
  })),

  setFriendStatus: (friendId, status, extra) => set((s) => ({
    friends: s.friends.map(f => f.id === friendId ? { ...f, status, ...extra } : f),
  })),
}));
