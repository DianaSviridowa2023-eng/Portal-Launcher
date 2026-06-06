import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Filter, Download, Star, X, ChevronDown, Zap } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';

const MODS = [
  { id:'sodium', name:'Sodium', author:'jellysquid3', desc:'A modern rendering engine and client-side optimization mod for Minecraft.', downloads:'12.4M', stars:4.9, category:'Performance', source:'modrinth', color:'#f59e0b', icon:'S', mc:'1.21.1', loader:'fabric' },
  { id:'fabric-api', name:'Fabric API', author:'FabricMC', desc:'Core API library for the Fabric mod loader, providing hooks and interop features.', downloads:'45.2M', stars:4.8, category:'Library', source:'modrinth', color:'#8b5cf6', icon:'F', mc:'1.21.1', loader:'fabric' },
  { id:'jei', name:'Just Enough Items', author:'mezz', desc:'View item recipes and uses. Essential for any modded Minecraft experience.', downloads:'18.7M', stars:4.7, category:'Utility', source:'curseforge', color:'#10b981', icon:'J', mc:'1.20.1', loader:'forge' },
  { id:'optifine', name:'OptiFine', author:'sp614x', desc:'OptiFine is a Minecraft optimization mod. It allows Minecraft to run faster and look better with full support for HD textures and many configuration options.', downloads:'32.1M', stars:4.6, category:'Performance', source:'curseforge', color:'#e74c3c', icon:'O', mc:'1.20.1', loader:'forge' },
  { id:'create', name:'Create', author:'simibubi', desc:'Provides a variety of tools and blocks for Building, Decoration and Aesthetic Automation. Mechanical contraptions, factories, trains!', downloads:'9.8M', stars:4.9, category:'Technology', source:'curseforge', color:'#f97316', icon:'C', mc:'1.20.1', loader:'forge' },
  { id:'iris', name:'Iris Shaders', author:'coderbot', desc:'A shaders mod for Minecraft intended to be compatible with existing OptiFine shaderpacks.', downloads:'7.3M', stars:4.8, category:'Graphics', source:'modrinth', color:'#06b6d4', icon:'I', mc:'1.21.1', loader:'fabric' },
  { id:'lithium', name:'Lithium', author:'CaffeineMC', desc:'No-compromises game logic/server optimization mod for Minecraft. Drastically improve tick times.', downloads:'5.2M', stars:4.8, category:'Performance', source:'modrinth', color:'#84cc16', icon:'L', mc:'1.21.1', loader:'fabric' },
  { id:'waystones', name:'Waystones', author:'BlayTheNinth', desc:'Adds waystone blocks that the player can return to once they\'ve been activated, either on foot or through other means.', downloads:'8.1M', stars:4.7, category:'Utility', source:'curseforge', color:'#a78bfa', icon:'W', mc:'1.20.1', loader:'forge' },
  { id:'tinkers-construct', name:"Tinker's Construct", author:'mDiyo', desc:'Modify all the things! Craft tools from components, making it possible to have a multitude of possible tools.', downloads:'22.5M', stars:4.8, category:'Tools', source:'curseforge', color:'#fbbf24', icon:'T', mc:'1.20.1', loader:'forge' },
  { id:'ae2', name:'Applied Energistics 2', author:'AppliedEnergistics', desc:'A Mod about Matter, Energy and using them to conquer the world. Storage networks, digital automation!', downloads:'11.3M', stars:4.9, category:'Technology', source:'curseforge', color:'#818cf8', icon:'A', mc:'1.20.1', loader:'forge' },
  { id:'biomes-o-plenty', name:"Biomes O' Plenty", author:'Forstride', desc:'Adds over 60 new biomes to Minecraft, including mountain ranges, wetlands, jungles, and alien landscapes.', downloads:'15.6M', stars:4.7, category:'World Gen', source:'curseforge', color:'#4ade80', icon:'B', mc:'1.20.1', loader:'forge' },
  { id:'wthit', name:'WTHIT', author:'badasintended', desc:'What The Heck Is That - A mod that shows information about what you are looking at.', downloads:'3.4M', stars:4.6, category:'Utility', source:'modrinth', color:'#fb923c', icon:'W', mc:'1.21.1', loader:'fabric' },
];

const CATEGORIES = ['All','Performance','Graphics','Technology','Utility','Library','Tools','World Gen'];
const LOADERS = ['All','fabric','forge','quilt','neoforge'];
const VERSIONS = ['All','1.21.1','1.20.1','1.19.4','1.18.2','1.16.5','1.12.2'];
const SORTS = ['Relevance','Downloads','Stars','Updated'];

const fade = { hidden:{opacity:0,y:10}, show:{opacity:1,y:0} };

export function DiscoverPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const defaultPlatform = useSettingsStore(s => s.defaultPlatform);
  const [platform, setPlatform] = useState<'modrinth'|'curseforge'|'all'>('all');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loader, setLoader] = useState('All');
  const [version, setVersion] = useState('All');
  const [sort, setSort] = useState('Downloads');
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const filtered = MODS.filter(m => {
    if (platform !== 'all' && m.source !== platform) return false;
    if (category !== 'All' && m.category !== category) return false;
    if (loader !== 'All' && m.loader !== loader) return false;
    if (version !== 'All' && m.mc !== version) return false;
    if (query && !m.name.toLowerCase().includes(query.toLowerCase()) && !m.desc.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }).sort((a,b) => sort==='Downloads' ? parseFloat(b.downloads)-parseFloat(a.downloads) : sort==='Stars' ? b.stars-a.stars : 0);

  const handleInstall = useCallback(async (id: string) => {
    if (installed.has(id)) return;
    setInstalling(s => new Set(s).add(id));
    await new Promise(r => setTimeout(r, 1800));
    setInstalling(s => { const n=new Set(s); n.delete(id); return n; });
    setInstalled(s => new Set(s).add(id));
  }, [installed]);

  return (
    <div className="h-full flex flex-col gap-4 min-w-0" style={{maxWidth:'100%'}}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'var(--color-text)'}}>Discover Mods</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--color-text-secondary)'}}>CurseForge & Modrinth in one place</p>
        </div>

        {/* Platform Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
          {(['all','modrinth','curseforge'] as const).map(p => (
            <button key={p} onClick={() => setPlatform(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
              style={platform===p
                ? {background:p==='modrinth'?'var(--color-modrinth)':p==='curseforge'?'var(--color-curseforge)':'var(--color-primary)',color:'#fff'}
                : {color:'var(--color-text-secondary)'}}
            >{p==='all'?'All':p==='modrinth'?'Modrinth':'CurseForge'}</button>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
          <Search className="w-4 h-4 shrink-0" style={{color:'var(--color-text-tertiary)'}} />
          <input className="flex-1 bg-transparent text-sm" style={{color:'var(--color-text)'}}
            placeholder="Search mods, modpacks..." value={query} onChange={e=>setQuery(e.target.value)} />
          {query && <button onClick={()=>setQuery('')}><X className="w-3.5 h-3.5" style={{color:'var(--color-text-tertiary)'}} /></button>}
        </div>
        <button onClick={()=>setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{background:showFilters?'var(--color-primary-dim)':' var(--color-surface)',border:'1px solid '+(showFilters?'var(--color-primary)':'var(--color-border)'),color:showFilters?'var(--color-primary)':'var(--color-text-secondary)'}}>
          <Filter className="w-4 h-4" />Filters
        </button>
        {/* Sort */}
        <div className="relative">
          <select value={sort} onChange={e=>setSort(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-xl text-sm font-medium cursor-pointer"
            style={{background:'var(--color-surface)',border:'1px solid var(--color-border)',color:'var(--color-text)'}}>
            {SORTS.map(s=><option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{color:'var(--color-text-secondary)'}} />
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="flex gap-6 p-4 rounded-xl overflow-hidden flex-shrink-0"
            style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
            <div>
              <p className="text-xs font-semibold mb-2" style={{color:'var(--color-text-secondary)'}}>CATEGORY</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c=>(
                  <button key={c} onClick={()=>setCategory(c)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={category===c?{background:'var(--color-primary)',color:'#fff'}:{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div className="w-px" style={{background:'var(--color-border)'}} />
            <div>
              <p className="text-xs font-semibold mb-2" style={{color:'var(--color-text-secondary)'}}>LOADER</p>
              <div className="flex flex-wrap gap-1.5">
                {LOADERS.map(l=>(
                  <button key={l} onClick={()=>setLoader(l)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize"
                    style={loader===l?{background:'var(--color-primary)',color:'#fff'}:{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}
                  >{l}</button>
                ))}
              </div>
            </div>
            <div className="w-px" style={{background:'var(--color-border)'}} />
            <div>
              <p className="text-xs font-semibold mb-2" style={{color:'var(--color-text-secondary)'}}>MC VERSION</p>
              <div className="flex flex-wrap gap-1.5">
                {VERSIONS.map(v=>(
                  <button key={v} onClick={()=>setVersion(v)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={version===v?{background:'var(--color-primary)',color:'#fff'}:{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}
                  >{v}</button>
                ))}
              </div>
            </div>
            <div className="ml-auto flex items-start">
              <button onClick={()=>{setCategory('All');setLoader('All');setVersion('All');}}
                className="text-xs font-medium" style={{color:'var(--color-text-tertiary)'}}>Reset</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <p className="text-xs flex-shrink-0" style={{color:'var(--color-text-tertiary)'}}>
        {filtered.length} mod{filtered.length!==1?'s':''} found
      </p>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scroll-area pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Search className="w-8 h-8" style={{color:'var(--color-text-tertiary)'}} />
            <p className="font-medium" style={{color:'var(--color-text-secondary)'}}>No mods found</p>
            <p className="text-sm" style={{color:'var(--color-text-tertiary)'}}>Try different search terms or filters</p>
          </div>
        ) : (
          <motion.div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-4"
            variants={{show:{transition:{staggerChildren:0.04}}}} initial="hidden" animate="show">
            {filtered.map(mod => {
              const isInstalling = installing.has(mod.id);
              const isInstalled = installed.has(mod.id);
              return (
                <motion.div key={mod.id} variants={fade}
                  className="rounded-xl p-4 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
                  style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}
                  onClick={() => navigate(`/discover/${mod.source}/${mod.id}`)}>
                  {/* Top */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{background:`${mod.color}20`,color:mod.color}}>
                      {mod.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate" style={{color:'var(--color-text)'}}>{mod.name}</h3>
                      </div>
                      <p className="text-xs" style={{color:'var(--color-text-tertiary)'}}>by {mod.author}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={mod.source==='modrinth'?{background:'rgba(27,217,106,0.12)',color:'var(--color-modrinth)'}:{background:'rgba(241,100,54,0.12)',color:'var(--color-curseforge)'}}>
                      {mod.source==='modrinth'?'MR':'CF'}
                    </span>
                  </div>
                  {/* Desc */}
                  <p className="text-xs mb-3 line-clamp-2" style={{color:'var(--color-text-secondary)'}}>{mod.desc}</p>
                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                      style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>
                      {mod.loader}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>
                      {mod.mc}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{background:`${mod.color}18`,color:mod.color}}>
                      {mod.category}
                    </span>
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between" onClick={e=>e.stopPropagation()}>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs" style={{color:'var(--color-text-tertiary)'}}>
                        <Download className="w-3 h-3" />{mod.downloads}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{color:'var(--color-text-tertiary)'}}>
                        <Star className="w-3 h-3 fill-current" style={{color:'#f59e0b'}} />{mod.stars}
                      </span>
                    </div>
                    <button
                      onClick={() => handleInstall(mod.id)}
                      disabled={isInstalling || isInstalled}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={isInstalled
                        ? {background:'rgba(46,204,113,0.15)',color:'var(--color-success)'}
                        : {background:'var(--color-primary)',color:'var(--color-primary-text)',opacity:isInstalling?0.7:1}}>
                      {isInstalling ? (
                        <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full" style={{animation:'spin 0.6s linear infinite'}} />Installing</>
                      ) : isInstalled ? '✓ Installed' : <><Zap className="w-3 h-3" />Install</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
