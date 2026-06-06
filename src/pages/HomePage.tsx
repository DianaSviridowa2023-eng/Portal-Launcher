import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Zap, TrendingUp, Star, ArrowRight, Play, Clock } from 'lucide-react';
import { useCurrentUser } from '@/stores/authStore';
import { useInstanceStore } from '@/stores/instanceStore';

const FEATURED = [
  { id:'create', name:'Create', desc:'Build machines, contraptions, and automated factories', color:'#f97316', icon:'C', source:'curseforge', downloads:'9.8M', stars:4.9 },
  { id:'sodium', name:'Sodium', desc:'The most performant rendering optimization mod', color:'#f59e0b', icon:'S', source:'modrinth', downloads:'12.4M', stars:4.9 },
  { id:'iris', name:'Iris Shaders', desc:'Beautiful shader support compatible with Optifine packs', color:'#06b6d4', icon:'I', source:'modrinth', downloads:'7.3M', stars:4.8 },
];

const TRENDING = [
  { id:'ae2', name:'Applied Energistics 2', desc:'Digital storage and automation networks', color:'#818cf8', icon:'A', downloads:'11.3M' },
  { id:'jei', name:'Just Enough Items', desc:'Recipe viewer and item browser', color:'#10b981', icon:'J', downloads:'18.7M' },
  { id:'waystones', name:'Waystones', desc:'Fast travel points across your world', color:'#a78bfa', icon:'W', downloads:'8.1M' },
  { id:'bop', name:"Biomes O' Plenty", desc:'60+ new biomes and environments', color:'#4ade80', icon:'B', downloads:'15.6M' },
];

const MODPACKS = [
  { name:'All the Mods 9', version:'1.21.1', mods:380, color:'#6C5CE7' },
  { name:'Better Minecraft', version:'1.20.1', mods:240, color:'#2ECC71' },
  { name:'RLCraft', version:'1.12.2', mods:120, color:'#E74C3C' },
];

function formatPlayTime(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return 'No playtime';
}

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const instances = useInstanceStore(s => s.instances);
  const recent = instances.filter(i => i.lastPlayed).sort((a, b) =>
    new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime()
  ).slice(0, 3);

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
  const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="h-full overflow-y-auto scroll-area pr-1">
      <div className="max-w-5xl mx-auto pb-8 space-y-8">

        {/* Welcome Banner */}
        <motion.div className="relative rounded-2xl overflow-hidden p-8"
          style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #E74C3C 100%)' }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-white mb-2">
              {user ? `Welcome back, ${user.username}! 👋` : 'Welcome to Portal Launcher! 🚀'}
            </h1>
            <p className="text-white/70 text-sm mb-6">
              {user
                ? 'Ready to dive into Minecraft? Your worlds are waiting.'
                : 'Sign in with Microsoft to start playing and managing your instances.'}
            </p>
            <div className="flex gap-3">
              {user ? (
                <button onClick={() => navigate('/instances')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/20 text-white hover:bg-white/30 transition-all">
                  <Play className="w-4 h-4 fill-current" />Play Now
                </button>
              ) : (
                <button onClick={() => navigate('/settings/account')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-white text-[#6C5CE7] hover:bg-white/90 transition-all">
                  Sign in with Microsoft
                </button>
              )}
              <button onClick={() => navigate('/discover')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white border border-white/30 hover:bg-white/10 transition-all">
                <Compass className="w-4 h-4" />Explore Mods
              </button>
            </div>
          </div>
        </motion.div>

        {/* Recent Instances */}
        {recent.length > 0 && (
          <motion.section variants={stagger} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                <Clock className="w-5 h-5 inline mr-2 opacity-60" />Recent Instances
              </h2>
              <button onClick={() => navigate('/instances')}
                className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}>
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {recent.map(inst => (
                <motion.button key={inst.id} variants={fade} onClick={() => navigate('/instances')}
                  className="text-left p-4 rounded-xl transition-all hover:-translate-y-0.5 group"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="h-1 rounded-full mb-3 w-full" style={{ background: inst.color }} />
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: `${inst.color}25`, color: inst.color }}>
                      {inst.name[0]}
                    </div>
                    <p className="text-sm font-semibold truncate flex-1" style={{ color: 'var(--color-text)' }}>{inst.name}</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {inst.minecraftVersion} · {inst.modLoader} · {formatPlayTime(inst.totalPlayTime)}
                  </p>
                  <button className="mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg w-full justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: 'var(--color-primary)', color: 'white' }}>
                    <Play className="w-3 h-3 fill-current" />Play
                  </button>
                </motion.button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Featured Mods */}
        <motion.section variants={stagger} initial="hidden" animate="show">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
              <Star className="w-5 h-5 inline mr-2 opacity-60" />Featured Mods
            </h2>
            <button onClick={() => navigate('/discover')}
              className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}>
              Discover more <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {FEATURED.map(mod => (
              <motion.div key={mod.id} variants={fade}
                className="p-5 rounded-xl cursor-pointer transition-all hover:-translate-y-1"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                onClick={() => navigate(`/discover/${mod.source}/${mod.id}`)}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: `${mod.color}22`, color: mod.color }}>{mod.icon}</div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{mod.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" style={{ color: '#f59e0b' }} />
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{mod.stars} · {mod.downloads}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{mod.desc}</p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={mod.source === 'modrinth'
                      ? { background: 'rgba(27,217,106,0.12)', color: 'var(--color-modrinth)' }
                      : { background: 'rgba(241,100,54,0.12)', color: 'var(--color-curseforge)' }}>
                    {mod.source === 'modrinth' ? 'Modrinth' : 'CurseForge'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Trending + Popular Modpacks side by side */}
        <div className="grid grid-cols-5 gap-4">
          {/* Trending */}
          <motion.section className="col-span-3" variants={stagger} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                <TrendingUp className="w-5 h-5 inline mr-2 opacity-60" />Trending
              </h2>
            </div>
            <div className="space-y-2">
              {TRENDING.map((mod, i) => (
                <motion.div key={mod.id} variants={fade}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  onClick={() => navigate(`/discover/curseforge/${mod.id}`)}>
                  <span className="text-sm font-bold w-5 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                    {i + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: `${mod.color}20`, color: mod.color }}>{mod.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{mod.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>{mod.desc}</p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>{mod.downloads}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Popular Modpacks */}
          <motion.section className="col-span-2" variants={stagger} initial="hidden" animate="show">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                <Zap className="w-5 h-5 inline mr-2 opacity-60" />Top Modpacks
              </h2>
            </div>
            <div className="space-y-2">
              {MODPACKS.map(mp => (
                <motion.div key={mp.name} variants={fade}
                  className="p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  onClick={() => navigate('/discover')}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: mp.color }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{mp.name}</p>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {mp.version} · {mp.mods} mods
                  </p>
                  <button className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg"
                    style={{ background: `${mp.color}18`, color: mp.color }}>
                    Install
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
