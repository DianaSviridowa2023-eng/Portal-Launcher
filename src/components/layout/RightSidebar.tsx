import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, ChevronDown, LogIn, UserPlus, Users, Package, Info, ExternalLink } from 'lucide-react';
import { useCurrentUser, useIsAuthenticated, useAuthStore } from '@/stores/authStore';
import { useNotifStore, Notification, NotifType } from '@/stores/notificationStore';

// ── Notification Panel ────────────────────────────────────────────────────────
function NotifIcon({ type }: { type: NotifType }) {
  switch (type) {
    case 'friend_request': return <UserPlus className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} />;
    case 'message':        return <Users className="w-3.5 h-3.5" style={{ color: '#3498DB' }} />;
    case 'mod_update':     return <Package className="w-3.5 h-3.5" style={{ color: '#F39C12' }} />;
    case 'friend_online':  return <Users className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />;
    default:               return <Info className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />;
  }
}

function NotifBgColor(type: NotifType): string {
  switch (type) {
    case 'friend_request': return 'rgba(108,92,231,0.12)';
    case 'message':        return 'rgba(52,152,219,0.12)';
    case 'mod_update':     return 'rgba(243,156,18,0.12)';
    case 'friend_online':  return 'rgba(46,204,113,0.12)';
    default:               return 'var(--color-surface-2)';
  }
}

function fmtRelative(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { notifications, markRead, markAllRead, remove } = useNotifStore();

  const handleClick = (n: Notification) => {
    markRead(n.id);
    if (n.action) navigate(n.action.route);
    onClose();
  };

  return (
    <motion.div
      className="absolute top-0 right-full mr-3 w-80 rounded-2xl overflow-hidden z-50"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-lg)',
        maxHeight: '80vh',
      }}
      initial={{ opacity: 0, scale: 0.95, x: 8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}>

      {/* Header */}
      <div className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead}
              className="text-xs font-medium hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}>
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/5">
            <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Bell className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No notifications</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id}
              className="flex items-start gap-3 p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all hover:bg-white/5 group relative"
              style={{
                background: n.read ? 'transparent' : NotifBgColor(n.type),
                border: `1px solid ${n.read ? 'transparent' : 'var(--color-border)'}`,
              }}
              onClick={() => handleClick(n)}>
              {/* Icon */}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: NotifBgColor(n.type) }}>
                <NotifIcon type={n.type} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{n.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{n.body}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>{fmtRelative(n.createdAt)}</p>
              </div>
              {/* Unread dot */}
              {!n.read && (
                <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: 'var(--color-primary)' }} />
              )}
              {/* Delete button */}
              <button
                className="absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'var(--color-surface-2)' }}
                onClick={e => { e.stopPropagation(); remove(n.id); }}>
                <X className="w-2.5 h-2.5" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ── Account Panel ──────────────────────────────────────────────────────────────
function AccountPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { accounts, activeAccountUuid, switchAccount, logout } = useAuthStore();
  const user = useCurrentUser();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(5);

  useEffect(() => {
    if (!logoutConfirm) return;
    const iv = setInterval(() => setLogoutCountdown(c => {
      if (c <= 1) { clearInterval(iv); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(iv);
  }, [logoutConfirm]);

  const handleLogout = () => {
    logout();
    setLogoutConfirm(false);
    onClose();
  };

  if (!user) return (
    <motion.div className="absolute top-0 right-full mr-3 w-72 rounded-2xl overflow-hidden z-50"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
      initial={{ opacity: 0, scale: 0.95, x: 8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: 8 }}>
      <div className="p-5 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <LogIn className="w-7 h-7" style={{ color: 'var(--color-text-tertiary)' }} />
        </div>
        <div className="text-center">
          <p className="font-bold" style={{ color: 'var(--color-text)' }}>Not signed in</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Sign in with Microsoft to play</p>
        </div>
        <button
          onClick={() => { navigate('/settings/account'); onClose(); }}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}>
          <LogIn className="w-4 h-4" /> Sign in with Microsoft
        </button>
      </div>
    </motion.div>
  );

  return (
    <motion.div className="absolute top-0 right-full mr-3 w-72 rounded-2xl overflow-hidden z-50"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
      initial={{ opacity: 0, scale: 0.95, x: 8 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95, x: 8 }}>

      {/* Current account */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), #E74C3C)' }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold">{user.username[0]}</div>}
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: 'var(--color-text)' }}>{user.username}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Microsoft Account</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-3.5 h-3.5" style={{ color: 'var(--color-text-tertiary)' }} />
          </button>
        </div>
      </div>

      {/* Other accounts */}
      {accounts.length > 1 && (
        <div className="p-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest px-2 py-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Switch Account
          </p>
          {accounts.filter(a => a.uuid !== activeAccountUuid).map(acc => (
            <button key={acc.uuid} onClick={() => { switchAccount(acc.uuid); onClose(); }}
              className="w-full flex items-center gap-2 p-2 rounded-lg transition-all hover:bg-white/5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
                {acc.username[0]}
              </div>
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>{acc.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={() => { navigate('/settings/account'); onClose(); }}
          className="w-full flex items-center gap-2 p-2.5 rounded-lg transition-all hover:bg-white/5 text-sm text-left"
          style={{ color: 'var(--color-text-secondary)' }}>
          <ExternalLink className="w-3.5 h-3.5" /> Account Settings
        </button>
        <button
          onClick={() => { navigate('/settings/account'); onClose(); }}
          className="w-full flex items-center gap-2 p-2.5 rounded-lg transition-all hover:bg-white/5 text-sm text-left"
          style={{ color: 'var(--color-text-secondary)' }}>
          <LogIn className="w-3.5 h-3.5" /> Add Account
        </button>
        {/* Logout */}
        {!logoutConfirm ? (
          <button onClick={() => { setLogoutConfirm(true); setLogoutCountdown(5); }}
            className="w-full flex items-center gap-2 p-2.5 rounded-lg transition-all hover:bg-red-500/10 text-sm text-left"
            style={{ color: 'var(--color-error)' }}>
            <X className="w-3.5 h-3.5" /> Sign Out
          </button>
        ) : (
          <div className="p-2 rounded-lg" style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)' }}>
            <p className="text-xs mb-2 font-medium" style={{ color: 'var(--color-error)' }}>
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLogout}
                disabled={logoutCountdown > 0}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: logoutCountdown > 0 ? 'var(--color-surface-2)' : 'var(--color-error)',
                  color: logoutCountdown > 0 ? 'var(--color-text-tertiary)' : 'white',
                }}>
                {logoutCountdown > 0 ? `Confirm (${logoutCountdown})` : 'Confirm'}
              </button>
              <button onClick={() => setLogoutConfirm(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Right Sidebar ─────────────────────────────────────────────────────────────
export function RightSidebar() {
  const user = useCurrentUser();
  const isAuthenticated = useIsAuthenticated();
  const unreadCount = useNotifStore(s => s.unreadCount());
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowNotifs(false);
        setShowAccount(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <aside ref={ref} className="flex flex-col h-full flex-shrink-0 relative"
      style={{
        width: 64,
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
      }}>

      {/* Account Button */}
      <div className="flex items-center justify-center h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => { setShowAccount(v => !v); setShowNotifs(false); }}
          title={isAuthenticated ? user?.username : 'Sign In'}
          className="relative w-10 h-10 rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-offset-1"
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), #E74C3C)',
          }}>
          {isAuthenticated && user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username}
              className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
          ) : isAuthenticated && user ? (
            <span className="text-white font-bold text-sm">{user.username[0]}</span>
          ) : (
            <LogIn className="w-5 h-5 text-white" style={{ margin: 'auto' }} />
          )}
          {/* Online dot */}
          {isAuthenticated && (
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: 'var(--color-success)', borderColor: 'var(--color-surface)' }} />
          )}
        </button>

        <AnimatePresence>
          {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}
        </AnimatePresence>
      </div>

      {/* Notifications Button */}
      <div className="flex items-center justify-center pt-4 relative">
        <button
          onClick={() => { setShowNotifs(v => !v); setShowAccount(false); }}
          title="Notifications"
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
          style={{
            background: showNotifs ? 'var(--color-primary-dim)' : 'transparent',
            color: showNotifs ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          }}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1"
              style={{ background: 'var(--color-error)' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </button>

        <AnimatePresence>
          {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
        </AnimatePresence>
      </div>
    </aside>
  );
}
