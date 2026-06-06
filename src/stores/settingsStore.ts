import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  defaultPlatform: 'modrinth' | 'curseforge';
  chatMessageSound: boolean;
  chatSendSound: boolean;
  micDevice: string;
  micGain: number;
  micVolume: number;
  micVad: boolean;
  noiseSuppression: boolean;
  audioOutput: string;
  audioCallVolume: number;
  javaPath: string;
  customJvmArgs: string;
  minRam: number;
  maxRam: number;
  curseforgeApiKey: string;
  // Game
  closeLauncherOnStart: boolean;
  showSnapshots: boolean;
  keepLogs: boolean;
  autoInstallDeps: boolean;
  // Voice
  voiceEnabled: boolean;
  // Dev
  developerMode: boolean;
  verboseLogging: boolean;
}

interface SettingsState extends Settings {
  update: (partial: Partial<Settings>) => void;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
  // legacy compat
  get: () => Settings;
}

const defaults: Settings = {
  defaultPlatform: 'modrinth',
  chatMessageSound: true,
  chatSendSound: true,
  micDevice: 'default',
  micGain: 100,
  micVolume: 100,
  micVad: true,
  noiseSuppression: true,
  audioOutput: 'default',
  audioCallVolume: 80,
  javaPath: '',
  customJvmArgs: '',
  minRam: 1024,
  maxRam: 4096,
  curseforgeApiKey: '',
  closeLauncherOnStart: false,
  showSnapshots: false,
  keepLogs: true,
  autoInstallDeps: true,
  voiceEnabled: false,
  developerMode: false,
  verboseLogging: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaults,
      update: (partial) => set((s) => ({ ...s, ...partial })),
      setSetting: (key, value) => set((s) => ({ ...s, [key]: value })),
      reset: () => set(defaults),
      get: () => get(),
    }),
    { name: 'portal-settings' }
  )
);
