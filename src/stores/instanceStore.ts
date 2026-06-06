import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Instance {
  id: string;
  name: string;
  description: string;
  iconPath?: string;
  minecraftVersion: string;
  modLoader: 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge';
  modLoaderVersion?: string;
  javaPath?: string;
  jvmArgs?: string;
  minRam: number;
  maxRam: number;
  gameDir: string;
  createdAt: string;
  lastPlayed?: string;
  totalPlayTime: number;
  color: string;
}

interface InstanceState {
  instances: Instance[];
  selectedId: string | null;
  add: (inst: Instance) => void;
  update: (id: string, partial: Partial<Instance>) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
  duplicate: (id: string) => void;
}

const COLORS = ['#6C5CE7','#E74C3C','#2ECC71','#3498DB','#F39C12','#E91E63','#1BD96A','#9B59B6'];

export const useInstanceStore = create<InstanceState>()(
  persist(
    (set, get) => ({
      instances: [
        { id:'inst-1', name:'Vanilla 1.21.1', description:'Clean vanilla experience', minecraftVersion:'1.21.1', modLoader:'vanilla', minRam:1024, maxRam:4096, gameDir:'', createdAt:'2024-01-15T10:00:00Z', lastPlayed:'2024-12-01T20:00:00Z', totalPlayTime:3600, color:'#6C5CE7' },
        { id:'inst-2', name:'Tech Modpack', description:'Create + Applied Energistics + Thermal', minecraftVersion:'1.20.1', modLoader:'forge', modLoaderVersion:'47.2.0', minRam:2048, maxRam:8192, gameDir:'', createdAt:'2024-03-10T12:00:00Z', lastPlayed:'2024-11-28T18:00:00Z', totalPlayTime:7200, color:'#E74C3C' },
        { id:'inst-3', name:'Adventure Pack', description:'RLCraft + Better Dungeons', minecraftVersion:'1.12.2', modLoader:'forge', modLoaderVersion:'14.23.5', minRam:2048, maxRam:6144, gameDir:'', createdAt:'2024-06-20T08:00:00Z', totalPlayTime:1800, color:'#F39C12' },
      ],
      selectedId: null,
      add: (inst) => set((s) => ({ instances: [...s.instances, inst] })),
      update: (id, partial) => set((s) => ({ instances: s.instances.map(i => i.id===id ? {...i,...partial} : i) })),
      remove: (id) => set((s) => ({ instances: s.instances.filter(i => i.id!==id) })),
      select: (id) => set({ selectedId: id }),
      duplicate: (id) => {
        const orig = get().instances.find(i => i.id===id);
        if (!orig) return;
        const copy: Instance = { ...orig, id:`inst-${Date.now()}`, name:`${orig.name} (Copy)`, createdAt:new Date().toISOString(), totalPlayTime:0, color:COLORS[Math.floor(Math.random()*COLORS.length)] };
        set((s) => ({ instances: [...s.instances, copy] }));
      },
    }),
    { name: 'portal-instances' }
  )
);
