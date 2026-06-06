import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Package, Image, Sparkles, Database, Box, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { useInstanceStore } from '@/stores/instanceStore';

const TABS = [
  { id:'mods', label:'Mods', icon:Package },
  { id:'resourcepacks', label:'Resource Packs', icon:Image },
  { id:'shaders', label:'Shaders', icon:Sparkles },
  { id:'datapacks', label:'Data Packs', icon:Database },
  { id:'modpacks', label:'Modpacks', icon:Box },
] as const;

type TabId = typeof TABS[number]['id'];

const MOCK_MODS: Record<TabId, any[]> = {
  mods: [
    { id:'sodium', name:'Sodium', version:'0.6.0-alpha.2', author:'jellysquid3', color:'#f59e0b', desc:'Rendering optimization mod' },
    { id:'fabric-api', name:'Fabric API', version:'0.102.0', author:'FabricMC', color:'#8b5cf6', desc:'Core API library' },
    { id:'create', name:'Create', version:'0.5.1f', author:'simibubi', color:'#f97316', desc:'Automation and machinery' },
    { id:'ae2', name:'Applied Energistics 2', version:'15.0.21', author:'AppliedEnergistics', color:'#818cf8', desc:'Digital storage networks' },
    { id:'jei', name:'Just Enough Items', version:'19.21.0', author:'mezz', color:'#10b981', desc:'Recipe viewer' },
  ],
  resourcepacks: [
    { id:'faithful', name:'Faithful 64x', version:'1.21', author:'Faithful Team', color:'#06b6d4', desc:'High-res faithful textures' },
    { id:'bare-bones', name:'Bare Bones', version:'1.21', author:'RobotPantaloons', color:'#e74c3c', desc:'Minimalist texture pack' },
  ],
  shaders: [
    { id:'bsl', name:'BSL Shaders', version:'8.3.02', author:'captTatsu', color:'#f59e0b', desc:'Beautiful high-performance shaders' },
    { id:'complementary', name:'Complementary Reimagined', version:'r5.3', author:'EminGT', color:'#3498db', desc:'Balanced performance shaders' },
  ],
  datapacks: [],
  modpacks: [],
};

export function LibraryPage() {
  const { t } = useTranslation();
  const instances = useInstanceStore(s => s.instances);
  const [selectedInstanceId, setSelectedInstanceId] = useState(instances[0]?.id ?? null);
  const [tab, setTab] = useState<TabId>('mods');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const selectedInst = instances.find(i => i.id === selectedInstanceId);
  const items = MOCK_MODS[tab].filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = async (id: string) => {
    setUpdating(s => new Set(s).add(id));
    await new Promise(r => setTimeout(r, 1500));
    setUpdating(s => { const n=new Set(s); n.delete(id); return n; });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'var(--color-text)'}}>{t('library.title')}</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--color-text-secondary)'}}>Manage content for your instances</p>
        </div>

        {/* Instance selector */}
        {instances.length > 0 && (
          <div className="relative">
            <select value={selectedInstanceId??''} onChange={e=>setSelectedInstanceId(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
              style={{background:'var(--color-surface)',border:'1px solid var(--color-border)',color:'var(--color-text)'}}>
              {instances.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{color:'var(--color-text-secondary)'}} />
          </div>
        )}
      </div>

      {instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4">
          <Box className="w-12 h-12" style={{color:'var(--color-text-tertiary)'}} />
          <div className="text-center">
            <p className="font-semibold" style={{color:'var(--color-text)'}}>No instances yet</p>
            <p className="text-sm mt-1" style={{color:'var(--color-text-secondary)'}}>Create an instance to manage content</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs + search */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1 p-1 rounded-xl"
              style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
              {TABS.map(({id:tabId,label,icon:Icon})=>(
                <button key={tabId} onClick={()=>setTab(tabId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={tab===tabId?{background:'var(--color-primary)',color:'var(--color-primary-text)'}:{color:'var(--color-text-secondary)'}}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
              <Search className="w-4 h-4" style={{color:'var(--color-text-tertiary)'}} />
              <input value={search} onChange={e=>setSearch(e.target.value)}
                className="bg-transparent text-sm" style={{color:'var(--color-text)',width:180}}
                placeholder={t('library.searchContent')} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scroll-area pr-1">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}>
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-56 gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
                      {(() => { const T=TABS.find(t2=>t2.id===tab)!; return <T.icon className="w-7 h-7" style={{color:'var(--color-text-tertiary)'}} />; })()}
                    </div>
                    <div className="text-center">
                      <p className="font-medium" style={{color:'var(--color-text)'}}>
                        {search ? 'No results found' : t('library.noContent')}
                      </p>
                      <p className="text-sm mt-1" style={{color:'var(--color-text-secondary)'}}>
                        {search ? 'Try different search terms' : t('library.installContent')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {items.map((item,i) => (
                      <motion.div key={item.id}
                        initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                        className="flex items-center gap-4 p-4 rounded-xl group"
                        style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                          style={{background:`${item.color}20`,color:item.color}}>
                          {item.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{color:'var(--color-text)'}}>{item.name}</p>
                          <p className="text-xs" style={{color:'var(--color-text-secondary)'}}>{item.desc} · by {item.author}</p>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 rounded-lg"
                          style={{background:'var(--color-surface-2)',color:'var(--color-text-tertiary)',border:'1px solid var(--color-border)'}}>
                          v{item.version}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>handleUpdate(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/5"
                            style={{color:'var(--color-text-secondary)'}}>
                            {updating.has(item.id)
                              ? <span className="w-4 h-4 border-2 rounded-full border-t-transparent" style={{borderColor:'var(--color-primary)',borderTopColor:'transparent',animation:'spin 0.6s linear infinite'}} />
                              : <RefreshCw className="w-3.5 h-3.5" />}
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-red-500/10"
                            style={{color:'var(--color-error)'}}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
