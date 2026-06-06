import { NavLink } from 'react-router-dom';
import { Home, Compass, User, Users, Library, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  tooltip: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/home',     icon: Home,    labelKey: 'nav.home',     tooltip: 'Home' },
  { to: '/discover', icon: Compass, labelKey: 'nav.discover', tooltip: 'Discover' },
  { to: '/skins',    icon: User,    labelKey: 'nav.skins',    tooltip: 'Skin Selector' },
  { to: '/friends',  icon: Users,   labelKey: 'nav.friends',  tooltip: 'Friends' },
  { to: '/instances',icon: Library, labelKey: 'nav.library',  tooltip: 'Library' },
];

function NavButton({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={item.tooltip}
      className={({ isActive }) =>
        `group relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-150 ${isActive ? '' : 'hover:bg-white/5'}`
      }
      style={({ isActive }) => isActive
        ? { background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }
        : { color: 'var(--color-text-tertiary)' }
      }>
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
              style={{ background: 'var(--color-primary)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <Icon className={`w-5 h-5 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
          <span className="text-[9px] font-semibold leading-none">
            {t(item.labelKey)}
          </span>
          {/* Tooltip on hover */}
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
            opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-md)',
            }}>
            {item.tooltip}
          </div>
        </>
      )}
    </NavLink>
  );
}

export function LeftSidebar() {
  return (
    <aside className="flex flex-col h-full select-none"
      style={{
        width: 68,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>

      {/* Logo */}
      <div className="flex items-center justify-center h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: 'linear-gradient(135deg, var(--color-primary), #E74C3C)' }}
          title="Portal Launcher">
          {/* Portal / compass SVG icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="white" strokeWidth="1.5"/>
            <circle cx="9" cy="9" r="2.5" fill="white"/>
            <path d="M9 1.5V4M9 14V16.5M1.5 9H4M14 9H16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5 5L7.5 7.5M10.5 10.5L13 13" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M13 5L10.5 7.5M7.5 10.5L5 13" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-2 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavButton key={item.to} item={item} />
        ))}
      </nav>

      {/* Bottom: Settings */}
      <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <NavLink
          to="/settings"
          title="Settings"
          className={({ isActive }) =>
            `group relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl transition-all duration-150 ${isActive ? '' : 'hover:bg-white/5'}`
          }
          style={({ isActive }) => isActive
            ? { background: 'var(--color-primary-dim)', color: 'var(--color-primary)' }
            : { color: 'var(--color-text-tertiary)' }
          }>
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-semibold leading-none">Settings</span>
          <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
            opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50"
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              boxShadow: 'var(--shadow-md)',
            }}>
            Settings
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
