import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Play, Settings, Copy, Trash2, Folder, Clock, Cpu, X, ChevronRight, Upload, Download, Square } from 'lucide-react';
import { useInstanceStore, Instance } from '@/stores/instanceStore';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ProgressModal, useProgressModal } from '@/components/ProgressModal';

const LOADERS = ['vanilla','fabric','forge','quilt','neoforge'] as const;
const VERSIONS = ['1.21.4','1.21.1','1.21','1.20.6','1.20.4','1.20.1','1.19.4','1.18.2','1.17.1','1.16.5','1.12.2','1.8.9'];
const COLORS = ['#6C5CE7','#E74C3C','#2ECC71','#3498DB','#F39C12','#E91E63','#1BD96A','#9B59B6'];
const loaderColor: Record<string,string> = { vanilla:'#1BD96A', fabric:'#DBB171', forge:'#1162A0', quilt:'#C397C5', neoforge:'#E87225' };

function formatPlayTime(secs: number) {
  const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60);
  if (h>0) return `${h}h ${m}m`; if (m>0) return `${m}m`; return 'Never';
}

// ── Create Wizard ──────────────────────────────────────────────────────────────
function CreateDialog({ onClose, onCreated }: { onClose:()=>void; onCreated:(inst:any)=>void }) {
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', mcVersion:'1.21.1', loader:'fabric' as typeof LOADERS[number], loaderVersion:'', minRam:2048, maxRam:4096, color:COLORS[0] });

  const steps = ['Name & Style','Version & Loader','Memory','Review'];

  const handleCreate = async () => {
    setCreating(true);
    try {
      const inst = await invoke<any>('create_instance', {
        name: form.name || 'New Instance', description: form.description,
        mcVersion: form.mcVersion, loader: form.loader, loaderVersion: form.loaderVersion,
        minRam: form.minRam, maxRam: form.maxRam, color: form.color,
      });
      onCreated(inst);
    } catch {
      onCreated({ id:`inst-${Date.now()}`, name:form.name||'New Instance', description:form.description, mc_version:form.mcVersion, loader:form.loader, loader_version:form.loaderVersion, min_ram:form.minRam, max_ram:form.maxRam, created_at:new Date().toISOString(), color:form.color });
    } finally { setCreating(false); onClose(); }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{background:'rgba(0,0,0,0.75)'}} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
      <motion.div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}
        initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}>
        <div className="flex items-center justify-between p-6 pb-0">
          <div><h2 className="font-bold text-lg" style={{color:'var(--color-text)'}}>New Instance</h2><p className="text-xs mt-0.5" style={{color:'var(--color-text-secondary)'}}>{steps[step]}</p></div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/5"><X className="w-4 h-4" style={{color:'var(--color-text-secondary)'}} /></button>
        </div>
        <div className="flex gap-1.5 px-6 pt-4">
          {steps.map((_,i) => <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300" style={{background:i<=step?'var(--color-primary)':'var(--color-border)'}} />)}
        </div>
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step===0 && (
              <motion.div key="s0" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1.5" style={{color:'var(--color-text)'}}>Name</label>
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" placeholder="My Awesome Instance"
                    style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)',color:'var(--color-text)'}} /></div>
                <div><label className="block text-sm font-medium mb-1.5" style={{color:'var(--color-text)'}}>Description</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}
                    className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none" placeholder="Optional description..."
                    style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)',color:'var(--color-text)'}} /></div>
                <div><label className="block text-sm font-medium mb-2" style={{color:'var(--color-text)'}}>Accent Color</label>
                  <div className="flex gap-2">{COLORS.map(c=><button key={c} onClick={()=>setForm(f=>({...f,color:c}))} className="w-7 h-7 rounded-lg transition-all" style={{background:c,outline:form.color===c?`3px solid ${c}`:'none',outlineOffset:'2px'}} />)}</div></div>
              </motion.div>
            )}
            {step===1 && (
              <motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1.5" style={{color:'var(--color-text)'}}>Minecraft Version</label>
                  <select value={form.mcVersion} onChange={e=>setForm(f=>({...f,mcVersion:e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)',color:'var(--color-text)'}}>
                    {VERSIONS.map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-2" style={{color:'var(--color-text)'}}>Mod Loader</label>
                  <div className="grid grid-cols-5 gap-2">
                    {LOADERS.map(l=><button key={l} onClick={()=>setForm(f=>({...f,loader:l}))} className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                      style={form.loader===l?{background:'var(--color-primary)',color:'var(--color-primary-text)'}:{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>{l}</button>)}
                  </div></div>
                {form.loader!=='vanilla' && <div><label className="block text-sm font-medium mb-1.5" style={{color:'var(--color-text)'}}>Loader Version <span className="text-xs opacity-50">(leave blank for latest)</span></label>
                  <input value={form.loaderVersion} onChange={e=>setForm(f=>({...f,loaderVersion:e.target.value}))} placeholder="latest"
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)',color:'var(--color-text)'}} /></div>}
              </motion.div>
            )}
            {step===2 && (
              <motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-5">
                {(['minRam','maxRam'] as const).map(key=>{
                  const [label,min,max]= key==='minRam'?['Min RAM',512,8192]:['Max RAM',1024,32768];
                  return <div key={key}>
                    <div className="flex justify-between mb-2"><label className="text-sm font-medium" style={{color:'var(--color-text)'}}>{label}</label>
                      <span className="text-sm font-bold" style={{color:'var(--color-primary)'}}>{(form[key]/1024).toFixed(1)} GB</span></div>
                    <input type="range" min={min} max={max} step={256} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:+e.target.value}))} className="w-full" style={{accentColor:'var(--color-primary)'}} />
                    <div className="flex justify-between text-xs mt-1" style={{color:'var(--color-text-tertiary)'}}><span>{min/1024}GB</span><span>{max/1024}GB</span></div>
                  </div>;
                })}
                <p className="text-xs" style={{color:'var(--color-text-secondary)'}}>💡 2GB for vanilla, 4-6GB for modpacks recommended.</p>
              </motion.div>
            )}
            {step===3 && (
              <motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} className="space-y-1">
                <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--color-border)'}}>
                  {[['Name',form.name||'(untitled)'],['MC Version',form.mcVersion],['Loader',form.loader+(form.loaderVersion?` ${form.loaderVersion}`:'')],['RAM',`${(form.minRam/1024).toFixed(1)} - ${(form.maxRam/1024).toFixed(1)} GB`]].map(([k,v],i)=>(
                    <div key={k} className="flex justify-between px-4 py-2.5" style={{background:i%2===0?'var(--color-surface-2)':'transparent'}}>
                      <span className="text-sm" style={{color:'var(--color-text-secondary)'}}>{k}</span>
                      <span className="text-sm font-semibold" style={{color:'var(--color-text)'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          {step>0 && <button onClick={()=>setStep(s=>s-1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>Back</button>}
          {step<3
            ? <button onClick={()=>setStep(s=>s+1)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{background:'var(--color-primary)',color:'var(--color-primary-text)'}}>Next <ChevronRight className="w-4 h-4 inline" /></button>
            : <button onClick={handleCreate} disabled={creating} className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{background:'var(--color-primary)',color:'var(--color-primary-text)',opacity:creating?0.7:1}}>
                {creating ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</> : 'Create Instance'}
              </button>}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Instance Card ──────────────────────────────────────────────────────────────
function InstanceCard({ inst }: { inst: Instance }) {
  const navigate = useNavigate();
  const { remove, duplicate } = useInstanceStore();
  const [menu, setMenu] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let unsub: (() => void) | undefined;
    listen<any>('launch-status', e => {
      const p = e.payload;
      if (p.instance_id !== inst.id) return;
      setStatus(p.status);
      if (['stopped','error','crashed'].includes(p.status)) {
        setLaunching(false);
        if (p.status !== 'stopped') setError(p.message ?? '');
        setTimeout(() => { setStatus(''); setError(''); }, 6000);
      }
    }).then(fn => { unsub = fn; });
    return () => unsub?.();
  }, [inst.id]);

  const isRunning = launching || ['launching','preparing','downloading','classpath'].includes(status);
  const isCrashed = status === 'crashed';

  const launch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) return;
    setLaunching(true); setError('');
    try { await invoke('launch_instance', { instanceId: inst.id }); }
    catch (err: any) { setError(String(err)); setLaunching(false); }
  };

  const stop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await invoke('kill_instance', { instanceId: inst.id }); } catch {}
    setLaunching(false);
  };

  return (
    <motion.div className="rounded-xl overflow-hidden cursor-pointer group relative"
      style={{background:'var(--color-surface)',border:`1px solid ${isCrashed?'var(--color-error)':'var(--color-border)'}`}}
      initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} whileHover={{y:-2,borderColor:'var(--color-border-strong)'}} transition={{duration:0.2}}>
      <div className="h-1.5 w-full" style={{background:`linear-gradient(90deg,${inst.color},${inst.color}55)`}} />
      <div className="p-4" onClick={()=>navigate(`/instances/${inst.id}/settings`)}>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0" style={{background:`${inst.color}22`,color:inst.color}}>
            {inst.name[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" style={{color:'var(--color-text)'}}>{inst.name}</h3>
            <p className="text-xs truncate mt-0.5" style={{color:'var(--color-text-secondary)'}}>{inst.description || 'No description'}</p>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/5"
            onClick={e=>{e.stopPropagation();setMenu(v=>!v);}} style={{color:'var(--color-text-secondary)'}}>
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize" style={{background:`${loaderColor[inst.modLoader]}18`,color:loaderColor[inst.modLoader]}}>{inst.modLoader}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)'}}>{inst.minecraftVersion}</span>
          {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'#2ECC7122',color:'#2ECC71'}}>● Running</span>}
          {isCrashed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'var(--color-error)22',color:'var(--color-error)'}}>Crashed</span>}
        </div>
        {error && <p className="text-[10px] mb-2 truncate" style={{color:'var(--color-error)'}}>{error}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs" style={{color:'var(--color-text-tertiary)'}}><Clock className="w-3 h-3" />{formatPlayTime(inst.totalPlayTime)}</span>
            <span className="flex items-center gap-1 text-xs" style={{color:'var(--color-text-tertiary)'}}><Cpu className="w-3 h-3" />{(inst.maxRam/1024).toFixed(1)}GB</span>
          </div>
          {isRunning
            ? <button onClick={stop} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:'var(--color-error)20',color:'var(--color-error)'}}><Square className="w-3 h-3 fill-current" />Stop</button>
            : <button onClick={launch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background:'var(--color-primary)',color:'var(--color-primary-text)'}}><Play className="w-3 h-3 fill-current" />Play</button>}
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div className="absolute top-8 right-4 z-20 rounded-xl overflow-hidden min-w-[148px]"
            style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)',boxShadow:'var(--shadow-lg)'}}
            initial={{opacity:0,scale:0.9,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:-4}}>
            {[
              {icon:Settings,label:'Settings',action:()=>{navigate(`/instances/${inst.id}/settings`);setMenu(false);}},
              {icon:Copy,label:'Duplicate',action:()=>{duplicate(inst.id);setMenu(false);}},
              {icon:Folder,label:'Open Folder',action:async()=>{try{await invoke('open_instance_folder',{id:inst.id});}catch{}setMenu(false);}},
              {icon:Download,label:'Export ZIP',action:async()=>{try{await invoke('export_instance_zip',{id:inst.id,destPath:''});}catch{}setMenu(false);}},
            ].map(({icon:Icon,label,action})=>(
              <button key={label} onClick={e=>{e.stopPropagation();action();}} className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm text-left hover:bg-white/5 transition-colors" style={{color:'var(--color-text-secondary)'}}><Icon className="w-3.5 h-3.5" />{label}</button>
            ))}
            <div style={{borderTop:'1px solid var(--color-border)'}} />
            <button onClick={e=>{e.stopPropagation();remove(inst.id);setMenu(false);}} className="flex items-center gap-2.5 px-4 py-2.5 w-full text-sm text-left hover:bg-red-500/10 transition-colors" style={{color:'var(--color-error)'}}><Trash2 className="w-3.5 h-3.5" />Delete</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function InstancesPage() {
  const { t } = useTranslation();
  const { instances, add } = useInstanceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [importing, setImporting] = useState(false);
  const { progress, setProgress, hide } = useProgressModal('instance-progress');

  const handleImport = async () => {
    try {
      // Fallback if dialog API not available
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,.mrpack';
      input.onchange = async (ev: any) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        const isZip = file.name.endsWith('.zip');
        setImporting(true);
        setProgress({ visible:true, name:file.name, stage:'import', percent:0, message:'Starting import…', color:'var(--color-primary)' });
        try {
          const inst = await invoke<any>(isZip ? 'import_instance_zip' : 'import_modrinth_pack', isZip ? { zipPath: file.path ?? file.name } : { mrpackPath: file.path ?? file.name });
          addFromRust(inst);
        } catch (e) { console.error(e); } finally { setImporting(false); }
      };
      input.click();
    } catch {}
  };

  const addFromRust = (inst: any) => {
    add({ id: inst.id ?? `inst-${Date.now()}`, name: inst.name, description: inst.description ?? '', minecraftVersion: inst.mc_version ?? inst.minecraftVersion ?? '1.20.1', modLoader: (inst.loader ?? inst.modLoader ?? 'fabric') as any, modLoaderVersion: inst.loader_version ?? inst.modLoaderVersion ?? '', minRam: inst.min_ram ?? inst.minRam ?? 2048, maxRam: inst.max_ram ?? inst.maxRam ?? 4096, gameDir: inst.id ?? '', createdAt: inst.created_at ?? new Date().toISOString(), totalPlayTime: 0, color: inst.color ?? '#6C5CE7' });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{color:'var(--color-text)'}}>{t('instances.title')}</h1>
          <p className="text-sm mt-0.5" style={{color:'var(--color-text-secondary)'}}>{instances.length} instance{instances.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} disabled={importing} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)',color:'var(--color-text-secondary)',opacity:importing?0.6:1}}>
            <Upload className="w-4 h-4" />Import
          </button>
          <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{background:'var(--color-primary)',color:'var(--color-primary-text)'}}>
            <Plus className="w-4 h-4" />{t('instances.create')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area pr-1">
        {instances.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
              <Cpu className="w-8 h-8" style={{color:'var(--color-text-tertiary)'}} />
            </div>
            <div className="text-center">
              <p className="font-semibold" style={{color:'var(--color-text)'}}>No instances yet</p>
              <p className="text-sm mt-1" style={{color:'var(--color-text-secondary)'}}>Create your first Minecraft instance to get started.</p>
            </div>
            <button onClick={()=>setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{background:'var(--color-primary)',color:'var(--color-primary-text)'}}>
              <Plus className="w-4 h-4" />Create Instance
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 pb-4">
            {instances.map(inst => <InstanceCard key={inst.id} inst={inst} />)}
          </div>
        )}
      </div>

      <ProgressModal state={progress} onClose={hide} />

      <AnimatePresence>
        {showCreate && <CreateDialog onClose={()=>setShowCreate(false)} onCreated={addFromRust} />}
      </AnimatePresence>
    </div>
  );
}
