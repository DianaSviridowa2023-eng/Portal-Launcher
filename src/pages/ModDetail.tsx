import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Download, Star, Calendar, Code, ExternalLink, Zap } from 'lucide-react';
import { useState } from 'react';

const MOD_DATA: Record<string, any> = {
  sodium: {
    name:'Sodium', author:'jellysquid3', downloads:'12.4M', stars:4.9, source:'modrinth', color:'#f59e0b', icon:'S',
    mc:['1.21.1','1.21','1.20.6'], loader:['Fabric','Quilt'], category:'Performance', updated:'Dec 1, 2024',
    desc:`<h2>Sodium</h2><p>Sodium is a free and open-source optimization mod for Minecraft which improves frame rates, reduces micro-stutter, and fixes graphical issues in Minecraft.</p><h3>Features</h3><ul><li>A large number of optimizations to chunk rendering and CPU overhead</li><li>Support for custom rendering backends, including Direct3D 12 via DXVK</li><li>Compatibility with resource packs that use custom shaders</li><li>Integration with other mods in the ecosystem</li></ul><h3>Compared to OptiFine</h3><p>Sodium comes out significantly ahead in a number of metrics. On a machine running an Nvidia RTX 2080 Ti and Intel Core i9-9900K, Sodium can provide up to 500% more FPS.</p>`,
    deps: [{name:'Fabric API', required:true}],
    versions: [{id:'mc1.21.1', version:'0.6.0-alpha.2', mc:'1.21.1', date:'Dec 1, 2024'}],
  },
  create: {
    name:'Create', author:'simibubi', downloads:'9.8M', stars:4.9, source:'curseforge', color:'#f97316', icon:'C',
    mc:['1.20.1','1.19.2','1.18.2','1.16.5'], loader:['Forge','Fabric'], category:'Technology', updated:'Nov 15, 2024',
    desc:`<h2>Create</h2><p>Create is a Minecraft Java Edition mod. It offers a wide variety of tools and blocks for Building, Decoration and Aesthetic Automation.</p><h3>What is Create?</h3><p>The added elements of tech are designed to leave as many design choices to the player as possible. With Create, the game isn't played inside a menu, every interaction is chosen to be done in the 3D space of the game world.</p><h3>Core Mechanics</h3><ul><li><strong>Rotational Force</strong> — Drive contraptions with waterwheels, windmills, and more</li><li><strong>Contraptions</strong> — Build moving machinery that interacts with the world</li><li><strong>Processing</strong> — Automate resource processing with mechanical equipment</li><li><strong>Trains</strong> — Build and ride fully automated trains</li></ul>`,
    deps: [{name:'Flywheel', required:true}],
    versions: [{id:'mc1.20.1', version:'0.5.1f', mc:'1.20.1', date:'Nov 15, 2024'}],
  },
};

export function ModDetail() {
  const { source, modId } = useParams();
  const navigate = useNavigate();
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [tab, setTab] = useState<'desc'|'versions'|'deps'>('desc');

  const mod = modId ? (MOD_DATA[modId] ?? MOD_DATA.sodium) : MOD_DATA.sodium;

  const handleInstall = async () => {
    setInstalling(true);
    await new Promise(r => setTimeout(r, 2000));
    setInstalling(false);
    setInstalled(true);
  };

  return (
    <div className="h-full overflow-y-auto scroll-area">
      <div className="max-w-4xl mx-auto pb-8">
        {/* Back */}
        <button onClick={() => navigate('/discover')}
          className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
          style={{color:'var(--color-text-secondary)'}}>
          <ChevronLeft className="w-4 h-4" />Back to Discover
        </button>

        {/* Header */}
        <motion.div className="rounded-2xl p-6 mb-4 flex items-start gap-5"
          style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}
          initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
            style={{background:`${mod.color}25`,color:mod.color}}>{mod.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-0.5" style={{color:'var(--color-text)'}}>{mod.name}</h1>
                <p className="text-sm" style={{color:'var(--color-text-secondary)'}}>by {mod.author}</p>
              </div>
              <button onClick={handleInstall} disabled={installing||installed}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shrink-0 transition-all"
                style={installed?{background:'rgba(46,204,113,0.15)',color:'var(--color-success)',border:'1px solid var(--color-success)'}:{background:'var(--color-primary)',color:'var(--color-primary-text)',opacity:installing?0.7:1}}>
                {installing?<><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" style={{animation:'spin 0.6s linear infinite'}} />Installing...</>:installed?'✓ Installed':<><Zap className="w-4 h-4" />Install</>}
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm" style={{color:'var(--color-text-secondary)'}}>
                <Download className="w-4 h-4" />{mod.downloads} downloads
              </span>
              <span className="flex items-center gap-1.5 text-sm" style={{color:'var(--color-text-secondary)'}}>
                <Star className="w-4 h-4 fill-current" style={{color:'#f59e0b'}} />{mod.stars}
              </span>
              <span className="flex items-center gap-1.5 text-sm" style={{color:'var(--color-text-secondary)'}}>
                <Calendar className="w-4 h-4" />Updated {mod.updated}
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={mod.source==='modrinth'?{background:'rgba(27,217,106,0.12)',color:'var(--color-modrinth)'}:{background:'rgba(241,100,54,0.12)',color:'var(--color-curseforge)'}}>
                {mod.source==='modrinth'?'Modrinth':'CurseForge'}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {mod.loader.map((l: string) => (
                <span key={l} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>
                  {l}
                </span>
              ))}
              {mod.mc.map((v: string) => (
                <span key={v} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{background:'var(--color-surface-2)',color:'var(--color-text-secondary)',border:'1px solid var(--color-border)'}}>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
          {([['desc','Description'],['versions','Versions'],['deps','Dependencies']] as const).map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab===id?{background:'var(--color-primary)',color:'var(--color-primary-text)'}:{color:'var(--color-text-secondary)'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
          className="rounded-xl p-6" style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>
          {tab==='desc' && (
            <div className="prose-custom" style={{color:'var(--color-text)'}}
              dangerouslySetInnerHTML={{__html:mod.desc
                .replace(/<h2>/g,`<h2 style="font-size:1.25rem;font-weight:700;margin-bottom:0.75rem;color:var(--color-text)">`)
                .replace(/<h3>/g,`<h3 style="font-size:1rem;font-weight:600;margin-top:1.25rem;margin-bottom:0.5rem;color:var(--color-text)">`)
                .replace(/<p>/g,`<p style="font-size:0.875rem;line-height:1.6;margin-bottom:0.75rem;color:var(--color-text-secondary)">`)
                .replace(/<ul>/g,`<ul style="list-style:disc;padding-left:1.25rem;margin-bottom:0.75rem">`)
                .replace(/<li>/g,`<li style="font-size:0.875rem;line-height:1.6;margin-bottom:0.25rem;color:var(--color-text-secondary)">`)
              }} />
          )}
          {tab==='versions' && (
            <div className="space-y-2">
              {mod.versions.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)'}}>
                  <div>
                    <p className="text-sm font-semibold" style={{color:'var(--color-text)'}}>{v.version}</p>
                    <p className="text-xs" style={{color:'var(--color-text-secondary)'}}>MC {v.mc} · {v.date}</p>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{background:'var(--color-primary)',color:'var(--color-primary-text)'}}>
                    <Download className="w-3 h-3" />Download
                  </button>
                </div>
              ))}
            </div>
          )}
          {tab==='deps' && (
            <div className="space-y-2">
              {mod.deps.map((d: any) => (
                <div key={d.name} className="flex items-center justify-between p-3 rounded-xl"
                  style={{background:'var(--color-surface-2)',border:'1px solid var(--color-border)'}}>
                  <div className="flex items-center gap-3">
                    <Code className="w-4 h-4" style={{color:'var(--color-text-secondary)'}} />
                    <div>
                      <p className="text-sm font-medium" style={{color:'var(--color-text)'}}>{d.name}</p>
                      <p className="text-xs" style={{color:d.required?'var(--color-error)':'var(--color-text-tertiary)'}}>
                        {d.required?'Required':'Optional'}
                      </p>
                    </div>
                  </div>
                  <button className="text-xs font-medium flex items-center gap-1" style={{color:'var(--color-primary)'}}>
                    <ExternalLink className="w-3 h-3" />View
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
