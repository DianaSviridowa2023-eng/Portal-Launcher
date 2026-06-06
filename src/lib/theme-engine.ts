import { useEffect } from 'react';

export type ThemeId = 'light' | 'dark' | 'red-dark' | 'green-dark' | 'purple-dark' | 'pink-dark' | 'pixel';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  isDark: boolean;
  colors: {
    background: string; surface: string; surfaceHover: string; surfaceActive: string;
    border: string; borderStrong: string;
    text: string; textSecondary: string; textTertiary: string;
    primary: string; primaryHover: string; primaryText: string;
    success: string; warning: string; error: string; info: string;
    curseforge: string; modrinth: string;
  };
  radii: { xs:string; sm:string; md:string; lg:string; xl:string; full:string; button:string; card:string; modal:string; };
  shadows: { sm:string; md:string; lg:string; glow:string; };
  font: string;
}

const dark = {
  background:'#0D1117', surface:'#161B22', surfaceHover:'#1C2333', surfaceActive:'#21283B',
  border:'#30363D', borderStrong:'#484F58',
  text:'#E6EDF3', textSecondary:'#8B949E', textTertiary:'#484F58',
  primaryText:'#FFFFFF', success:'#2ECC71', warning:'#F39C12', error:'#E74C3C', info:'#3498DB',
  curseforge:'#F16436', modrinth:'#1BD96A',
};

const darkRadii = { xs:'4px', sm:'6px', md:'8px', lg:'12px', xl:'16px', full:'9999px', button:'10px', card:'12px', modal:'16px' };
const darkShadows = { sm:'0 1px 2px rgba(0,0,0,0.3)', md:'0 4px 6px rgba(0,0,0,0.4)', lg:'0 10px 15px rgba(0,0,0,0.5)', glow:'' };

export const themes: Record<ThemeId, ThemeDefinition> = {
  light: {
    id:'light', name:'Light', isDark:false,
    colors:{ background:'#FFFFFF', surface:'#F8F9FA', surfaceHover:'#F1F3F5', surfaceActive:'#E9ECEF',
      border:'#DEE2E6', borderStrong:'#CED4DA', text:'#212529', textSecondary:'#6C757D', textTertiary:'#ADB5BD',
      primary:'#6C5CE7', primaryHover:'#5A4BD1', primaryText:'#FFFFFF', success:'#2ECC71', warning:'#F39C12',
      error:'#E74C3C', info:'#3498DB', curseforge:'#F16436', modrinth:'#1BD96A' },
    radii:darkRadii, shadows:{ sm:'0 1px 2px rgba(0,0,0,0.05)', md:'0 4px 6px rgba(0,0,0,0.07)', lg:'0 10px 15px rgba(0,0,0,0.1)', glow:'0 0 20px rgba(108,92,231,0.3)' },
    font:"'Inter',system-ui,sans-serif",
  },
  dark: {
    id:'dark', name:'Dark', isDark:true,
    colors:{ ...dark, primary:'#6C5CE7', primaryHover:'#7B6FF0' },
    radii:darkRadii, shadows:{ ...darkShadows, glow:'0 0 20px rgba(108,92,231,0.3)' },
    font:"'Inter',system-ui,sans-serif",
  },
  'red-dark': {
    id:'red-dark', name:'Red Dark', isDark:true,
    colors:{ ...dark, primary:'#E74C3C', primaryHover:'#EC7063' },
    radii:darkRadii, shadows:{ ...darkShadows, glow:'0 0 20px rgba(231,76,60,0.4)' },
    font:"'Inter',system-ui,sans-serif",
  },
  'green-dark': {
    id:'green-dark', name:'Green Dark', isDark:true,
    colors:{ ...dark, primary:'#2ECC71', primaryHover:'#58D68D' },
    radii:darkRadii, shadows:{ ...darkShadows, glow:'0 0 20px rgba(46,204,113,0.4)' },
    font:"'Inter',system-ui,sans-serif",
  },
  'purple-dark': {
    id:'purple-dark', name:'Purple Dark', isDark:true,
    colors:{ ...dark, primary:'#9B59B6', primaryHover:'#AF7AC5' },
    radii:darkRadii, shadows:{ ...darkShadows, glow:'0 0 20px rgba(155,89,182,0.4)' },
    font:"'Inter',system-ui,sans-serif",
  },
  'pink-dark': {
    id:'pink-dark', name:'Pink Dark', isDark:true,
    colors:{ ...dark, primary:'#E91E63', primaryHover:'#EC407A' },
    radii:darkRadii, shadows:{ ...darkShadows, glow:'0 0 20px rgba(233,30,99,0.4)' },
    font:"'Inter',system-ui,sans-serif",
  },
  pixel: {
    id:'pixel', name:'Pixel', isDark:true,
    colors:{ ...dark, primary:'#6C5CE7', primaryHover:'#7B6FF0' },
    radii:{ xs:'0px', sm:'0px', md:'0px', lg:'0px', xl:'0px', full:'0px', button:'0px', card:'0px', modal:'0px' },
    shadows:{ sm:'2px 2px 0px rgba(0,0,0,0.5)', md:'4px 4px 0px rgba(0,0,0,0.5)', lg:'6px 6px 0px rgba(0,0,0,0.5)', glow:'0 0 0 2px #6C5CE7' },
    font:"'Press Start 2P',monospace",
  },
};

export function applyTheme(themeId: ThemeId) {
  const t = themes[themeId] ?? themes.dark;
  const r = document.documentElement.style;
  r.setProperty('--color-bg', t.colors.background);
  r.setProperty('--color-surface', t.colors.surface);
  r.setProperty('--color-surface-2', t.colors.surfaceHover);
  r.setProperty('--color-surface-hover', t.colors.surfaceHover);
  r.setProperty('--color-surface-active', t.colors.surfaceActive);
  r.setProperty('--color-border', t.colors.border);
  r.setProperty('--color-border-strong', t.colors.borderStrong);
  r.setProperty('--color-text', t.colors.text);
  r.setProperty('--color-text-secondary', t.colors.textSecondary);
  r.setProperty('--color-text-tertiary', t.colors.textTertiary);
  r.setProperty('--color-primary', t.colors.primary);
  r.setProperty('--color-primary-hover', t.colors.primaryHover);
  r.setProperty('--color-primary-dim', t.colors.primary + '26');
  r.setProperty('--color-primary-text', t.colors.primaryText);
  r.setProperty('--color-success', t.colors.success);
  r.setProperty('--color-warning', t.colors.warning);
  r.setProperty('--color-error', t.colors.error);
  r.setProperty('--color-info', t.colors.info);
  r.setProperty('--color-curseforge', t.colors.curseforge);
  r.setProperty('--color-modrinth', t.colors.modrinth);
  r.setProperty('--radius-xs', t.radii.xs);
  r.setProperty('--radius-sm', t.radii.sm);
  r.setProperty('--radius-md', t.radii.md);
  r.setProperty('--radius-lg', t.radii.lg);
  r.setProperty('--radius-xl', t.radii.xl);
  r.setProperty('--radius-full', t.radii.full);
  r.setProperty('--radius-button', t.radii.button);
  r.setProperty('--radius-card', t.radii.card);
  r.setProperty('--radius-modal', t.radii.modal);
  r.setProperty('--shadow-sm', t.shadows.sm);
  r.setProperty('--shadow-md', t.shadows.md);
  r.setProperty('--shadow-lg', t.shadows.lg);
  r.setProperty('--shadow-glow', t.shadows.glow);
  r.setProperty('--font-ui', t.font);
  document.documentElement.classList.toggle('dark', t.isDark);
}

export function useTheme(themeId: ThemeId) {
  useEffect(() => { applyTheme(themeId); }, [themeId]);
}
