import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  User, Palette, Globe, Layers, MessageSquare, Mic, Volume2, Code, Info,
  Check, LogIn, LogOut, Upload, ChevronRight, Key, Eye, EyeOff, UserPlus,
  Coffee, Download, RefreshCw, Trash2, FolderOpen, Plus, X, AlertCircle
} from 'lucide-react';
import { useThemeStore, ThemeId } from '@/stores/themeStore';
import { useLanguageStore, Lang } from '@/stores/languageStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore, useCurrentUser } from '@/stores/authStore';
import { themes } from '@/lib/theme-engine';
import { MicrosoftAuth } from '@/components/auth/MicrosoftAuth';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0"
      style={{ background: value ? 'var(--color-primary)' : 'var(--color-surface-2)', border: `1px solid ${value ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
      <motion.div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white"
        animate={{ x: value ? 20 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
        {desc && <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold mb-4 mt-6 first:mt-0" style={{ color: 'var(--color-text)' }}>{children as any}</h3>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="px-5 divide-y" style={{ '--tw-divide-opacity': 1 } as any}>{children}</div>
    </div>
  );
}

// ── Java Management ──────────────────────────────────────────────────────────
interface JavaVersion {
  path: string;
  version: string;
  major_version: number;
  vendor: string;
  managed: boolean;
}

function JavaSection() {
  const [javaVersions, setJavaVersions] = useState<JavaVersion[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [dlPercent, setDlPercent] = useState(0);
  const [dlMessage, setDlMessage] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const versions = await invoke<JavaVersion[]>('get_managed_java_versions');
      setJavaVersions(versions);
    } catch (e) {
      console.error('get_managed_java_versions error:', e);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    const unsubs: Array<()=>void> = [];
    listen<any>('java-download', e => {
      setDlPercent(e.payload.percent);
      setDlMessage(e.payload.message ?? '');
      if (e.payload.percent >= 100) {
        setTimeout(() => { setDownloading(null); setDlPercent(0); refresh(); }, 1500);
      }
    }).then(fn => unsubs.push(fn));
    return () => unsubs.forEach(f => f());
  }, []);

  const downloadJava = async (major: number) => {
    setDownloading(major);
    setDlPercent(0);
    setDlMessage('Starting download…');
    try {
      await invoke('download_java', { majorVersion: major });
      await refresh();
    } catch (e: any) {
      setDlMessage(String(e));
      setTimeout(() => setDownloading(null), 3000);
    }
  };

  const testJava = async () => {
    const path = customPath.trim() || 'java';
    try {
      const info = await invoke<JavaVersion>('get_java_info', { javaPath: path });
      setTestResult(`✓ Java ${info.version} (${info.vendor})`);
    } catch (e: any) {
      setTestResult(`✗ ${String(e)}`);
    }
    setTimeout(() => setTestResult(''), 4000);
  };

  const javaOptions = [
    { major: 8, label: 'Java 8', desc: 'Minecraft 1.16.5 and below', color: '#F39C12' },
    { major: 17, label: 'Java 17', desc: 'Minecraft 1.17 – 1.20.4', color: '#3498DB' },
    { major: 21, label: 'Java 21', desc: 'Minecraft 1.20.5+ (recommended)', color: '#2ECC71' },
  ];

  return (
    <div>
      <SectionTitle>Java Runtime</SectionTitle>

      {/* Managed Java */}
      <div className="rounded-xl overflow-hidden mb-3" style={{ border: '1px solid var(--color-border)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Auto-managed Java (Adoptium Temurin)</p>
          <button onClick={refresh} disabled={loading} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all hover:bg-white/5" style={{ color: 'var(--color-text-secondary)' }}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {javaOptions.map(({ major, label, desc, color }) => {
            const installed = javaVersions.find(j => j.major_version === major && j.managed);
            const isDl = downloading === major;
            return (
              <div key={major} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ background: `${color}20`, color }}>☕</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>{installed ? `Installed: ${installed.version}` : desc}</p>
                  {isDl && (
                    <div className="mt-1.5">
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                        <motion.div className="h-full rounded-full" style={{ background: color }} animate={{ width: `${dlPercent}%` }} transition={{ type: 'spring', stiffness: 60 }} />
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{dlMessage}</p>
                    </div>
                  )}
                </div>
                {installed ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#2ECC7122', color: '#2ECC71' }}>✓ Ready</span>
                ) : (
                  <button onClick={() => downloadJava(major)} disabled={isDl || downloading !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: `${color}22`, color, opacity: (isDl || downloading !== null && !isDl) ? 0.6 : 1 }}>
                    {isDl ? <div className="w-3 h-3 border-2 border-current/40 border-t-current rounded-full animate-spin" /> : <Download className="w-3 h-3" />}
                    {isDl ? `${dlPercent}%` : 'Download'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Installed list */}
      {javaVersions.length > 0 && (
        <div className="rounded-xl mb-3" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Detected Java Installations</p>
          </div>
          {javaVersions.map((jv, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: i < javaVersions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
              <Coffee className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>Java {jv.major_version} — {jv.version}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>{jv.path}</p>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: jv.managed ? '#6C5CE722' : 'var(--color-surface-2)', color: jv.managed ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{jv.managed ? 'managed' : 'system'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom path test */}
      <div className="rounded-xl p-4" style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Test custom Java path</p>
        <div className="flex gap-2">
          <input value={customPath} onChange={e => setCustomPath(e.target.value)} placeholder="/usr/bin/java or C:\Java\bin\java.exe"
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          <button onClick={testJava} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>Test</button>
        </div>
        {testResult && (
          <p className="text-xs mt-2 font-medium" style={{ color: testResult.startsWith('✓') ? '#2ECC71' : 'var(--color-error)' }}>{testResult}</p>
        )}
      </div>
    </div>
  );
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function ThemeSection() {
  const { themeId, setTheme } = useThemeStore();
  const themeList: { id: ThemeId; color: string }[] = [
    { id: 'dark', color: '#6C5CE7' }, { id: 'light', color: '#6C5CE7' },
    { id: 'red-dark', color: '#E74C3C' }, { id: 'green-dark', color: '#2ECC71' },
    { id: 'purple-dark', color: '#9B59B6' }, { id: 'pink-dark', color: '#E91E63' },
    { id: 'pixel', color: '#6C5CE7' },
  ];
  return (
    <div>
      <SectionTitle>Theme</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {themeList.map(({ id, color }) => {
          const th = themes[id];
          const active = themeId === id;
          return (
            <button key={id} onClick={() => setTheme(id)}
              className="relative p-4 rounded-xl text-left transition-all duration-200"
              style={{ background: th.colors.background, border: `2px solid ${active ? color : 'transparent'}`, boxShadow: active ? `0 0 16px ${color}40` : 'none' }}>
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: color }}>
                  <Check className="w-3 h-3 text-white" />
                </span>
              )}
              <div className="flex flex-col gap-1.5 mb-3">
                <div className="h-2 rounded-full w-full" style={{ background: th.colors.surface }} />
                <div className="h-1.5 rounded-full w-3/4" style={{ background: th.colors.surface }} />
                <div className="h-1.5 rounded-full w-1/2" style={{ background: color, opacity: 0.9 }} />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold" style={{ color: th.colors.text }}>{th.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Nav items ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id:'account', icon:User, label:'Account' },
  { id:'appearance', icon:Palette, label:'Appearance' },
  { id:'java', icon:Coffee, label:'Java' },
  { id:'language', icon:Globe, label:'Language' },
  { id:'game', icon:Layers, label:'Game' },
  { id:'audio', icon:Volume2, label:'Audio' },
  { id:'developer', icon:Code, label:'Developer' },
  { id:'about', icon:Info, label:'About' },
];

export function SettingsPage() {
  const [tab, setTab] = useState('account');
  const { t } = useTranslation();
  const { lang, setLang } = useLanguageStore();
  const settings = useSettingsStore();
  const auth = useAuthStore();
  const user = useCurrentUser();
  const [showMsAuth, setShowMsAuth] = useState(false);

  const LANGS: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' }, { code: 'ru', label: 'Русский' },
    { code: 'uk', label: 'Українська' }, { code: 'de', label: 'Deutsch' },
    { code: 'zh', label: '中文' },
  ];

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* Sidebar */}
      <div className="w-44 shrink-0 flex flex-col gap-0.5 pt-1">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-left w-full transition-all"
            style={tab === id ? { background: 'var(--color-primary)', color: 'var(--color-primary-text)' } : { color: 'var(--color-text-secondary)' }}>
            <Icon className="w-4 h-4 shrink-0" />{label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scroll-area pr-1 pb-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* Account */}
            {tab === 'account' && (
              <div>
                <SectionTitle>Account</SectionTitle>
                {user ? (
                  <div className="rounded-xl p-5 mb-4 flex items-center gap-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-14 h-14 rounded-xl object-cover" alt="" /> : <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">{user.username?.[0]?.toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold" style={{ color: 'var(--color-text)' }}>{user.username}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Microsoft Account</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: '#2ECC7122', color: '#2ECC71' }}>● Online</span>
                    </div>
                    <button onClick={auth.logout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--color-error)15', color: 'var(--color-error)' }}>
                      <LogOut className="w-3.5 h-3.5" />Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl p-5 mb-4 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--color-surface-2)' }}>
                      <User className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
                    </div>
                    <p className="font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Not signed in</p>
                    <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>Sign in with your Microsoft account to play online and sync your profile.</p>
                    <button onClick={() => setShowMsAuth(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mx-auto" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}>
                      <LogIn className="w-4 h-4" />Sign in with Microsoft
                    </button>
                  </div>
                )}
                <AnimatePresence>{showMsAuth && <MicrosoftAuth onSuccess={() => setShowMsAuth(false)} onCancel={() => setShowMsAuth(false)} />}</AnimatePresence>
              </div>
            )}

            {/* Appearance */}
            {tab === 'appearance' && <ThemeSection />}

            {/* Java */}
            {tab === 'java' && <JavaSection />}

            {/* Language */}
            {tab === 'language' && (
              <div>
                <SectionTitle>Language</SectionTitle>
                <div className="grid grid-cols-1 gap-2">
                  {LANGS.map(({ code, label }) => (
                    <button key={code} onClick={() => setLang(code)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={lang === code ? { background: 'var(--color-primary)', color: 'var(--color-primary-text)' } : { background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                      {label}{lang === code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Game */}
            {tab === 'game' && (
              <div>
                <SectionTitle>Game Settings</SectionTitle>
                <SectionCard>
                  <SettingRow label="Close launcher on game start" desc="Hides the launcher window when Minecraft launches">
                    <Toggle value={settings.closeLauncherOnStart ?? false} onChange={v => settings.setSetting('closeLauncherOnStart', v)} />
                  </SettingRow>
                  <SettingRow label="Show snapshots" desc="Include snapshot and beta versions">
                    <Toggle value={settings.showSnapshots ?? false} onChange={v => settings.setSetting('showSnapshots', v)} />
                  </SettingRow>
                  <SettingRow label="Keep game logs" desc="Save game logs to the instance folder">
                    <Toggle value={settings.keepLogs ?? true} onChange={v => settings.setSetting('keepLogs', v)} />
                  </SettingRow>
                  <SettingRow label="Auto-install dependencies" desc="Automatically install required mod dependencies">
                    <Toggle value={settings.autoInstallDeps ?? true} onChange={v => settings.setSetting('autoInstallDeps', v)} />
                  </SettingRow>
                </SectionCard>
              </div>
            )}

            {/* Audio */}
            {tab === 'audio' && (
              <div>
                <SectionTitle>Audio</SectionTitle>
                <SectionCard>
                  <SettingRow label="Enable voice chat" desc="Use built-in voice chat with friends">
                    <Toggle value={settings.voiceEnabled ?? false} onChange={v => settings.setSetting('voiceEnabled', v)} />
                  </SettingRow>
                  <SettingRow label="Noise suppression" desc="Reduce background noise from microphone">
                    <Toggle value={settings.noiseSuppression ?? true} onChange={v => settings.setSetting('noiseSuppression', v)} />
                  </SettingRow>
                  <SettingRow label="Mic volume">
                    <input type="range" min={0} max={200} step={5} value={settings.micVolume ?? 100} onChange={e => settings.setSetting('micVolume', +e.target.value)} className="w-28" style={{ accentColor: 'var(--color-primary)' }} />
                  </SettingRow>
                </SectionCard>
              </div>
            )}

            {/* Developer */}
            {tab === 'developer' && (
              <div>
                <SectionTitle>Developer</SectionTitle>
                <SectionCard>
                  <SettingRow label="Developer mode" desc="Show extra debug info">
                    <Toggle value={settings.developerMode ?? false} onChange={v => settings.setSetting('developerMode', v)} />
                  </SettingRow>
                  <SettingRow label="Verbose logging" desc="Log all Tauri events to console">
                    <Toggle value={settings.verboseLogging ?? false} onChange={v => settings.setSetting('verboseLogging', v)} />
                  </SettingRow>
                </SectionCard>
              </div>
            )}

            {/* About */}
            {tab === 'about' && (
              <div>
                <SectionTitle>About</SectionTitle>
                <div className="rounded-xl p-6 text-center mb-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}>⛏</div>
                  <h2 className="font-bold text-xl" style={{ color: 'var(--color-text)' }}>Portal Launcher</h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Version 1.2.0</p>
                  <p className="text-xs mt-3 max-w-xs mx-auto" style={{ color: 'var(--color-text-secondary)' }}>A modern Minecraft launcher with full mod management, instance isolation, and voice chat.</p>
                </div>
                <SectionCard>
                  <SettingRow label="Build" desc="Portal Launcher v1.2.0"><span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>2025-06-06</span></SettingRow>
                  <SettingRow label="Framework" desc="Tauri 2 + React"><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Rust / TypeScript</span></SettingRow>
                  <SettingRow label="License"><span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>MIT</span></SettingRow>
                </SectionCard>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
