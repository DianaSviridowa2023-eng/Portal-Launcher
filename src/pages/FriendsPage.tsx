import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  UserPlus, Phone, Mic, MicOff, Send, Paperclip,
  X, Check, CheckCheck, Clock, Trash2, Copy,
  Users, Search, Play, Server, Wifi, Info, ChevronDown
} from 'lucide-react';
import { useFriendsStore, Friend, Message } from '@/stores/friendsStore';
import { useInstanceStore } from '@/stores/instanceStore';
import { tauriFriends } from '@/lib/tauri-bridge';

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const statusDot: Record<string, string> = { online: '#2ECC71', offline: '#484F58', playing: '#3498DB' };
const statusLabel: Record<string, string> = { online: 'Online', offline: 'Offline', playing: 'Playing' };

// ── Join World Modal ───────────────────────────────────────────────────────────
function JoinWorldModal({ friend, onClose }: { friend: Friend; onClose: () => void }) {
  const { instances } = useInstanceStore();
  const [selectedInstance, setSelectedInstance] = useState(instances[0]?.id ?? '');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    if (!selectedInstance) return;
    setJoining(true);
    try {
      await tauriFriends.joinWorld(
        friend.id,
        selectedInstance,
        friend.serverAddress,
      );
      setJoined(true);
      setTimeout(onClose, 2000);
    } catch {
      setJoining(false);
    }
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>

        {joined ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(46,204,113,0.15)', border: '2px solid var(--color-success)' }}>
              <Check className="w-7 h-7" style={{ color: 'var(--color-success)' }} />
            </div>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>Launching Minecraft…</p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Connecting to {friend.username}'s {friend.serverAddress ? 'server' : 'world'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>
                  Join {friend.username}'s {friend.serverAddress ? 'Server' : 'World'}
                </h3>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {friend.serverAddress
                    ? `Connecting to ${friend.serverAddress}`
                    : 'Connecting via LAN'}
                </p>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
                <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              </button>
            </div>

            {/* Connection info */}
            <div className="flex items-center gap-3 p-3 rounded-xl mb-5"
              style={{ background: friend.serverAddress ? 'rgba(52,152,219,0.1)' : 'rgba(46,204,113,0.1)', border: `1px solid ${friend.serverAddress ? 'rgba(52,152,219,0.3)' : 'rgba(46,204,113,0.3)'}` }}>
              {friend.serverAddress
                ? <Server className="w-5 h-5" style={{ color: '#3498DB' }} />
                : <Wifi className="w-5 h-5" style={{ color: 'var(--color-success)' }} />}
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {friend.serverAddress ? 'Multiplayer Server' : 'LAN World (local network)'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {friend.serverAddress
                    ? `${friend.serverAddress} — standard multiplayer connection`
                    : 'Requires Radmin VPN, Hamachi, or same LAN. Minecraft will handle connection automatically.'}
                </p>
              </div>
            </div>

            {/* Instance selector */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Select Instance to Launch
              </label>
              {instances.length === 0 ? (
                <p className="text-sm py-3 text-center rounded-xl" style={{ color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  No instances. Create one first.
                </p>
              ) : (
                <div className="relative">
                  <select value={selectedInstance} onChange={e => setSelectedInstance(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl text-sm appearance-none cursor-pointer"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
                    {instances.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.minecraftVersion})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--color-text-secondary)' }} />
                </div>
              )}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 rounded-xl mb-5"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {friend.serverAddress
                  ? 'Minecraft will launch and automatically connect to the server. Make sure you have the right mods installed.'
                  : 'Minecraft will launch and the LAN world will appear in Multiplayer. If you cannot see it, check VPN software (Radmin/Hamachi) is running.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                Cancel
              </button>
              <button onClick={handleJoin} disabled={joining || !selectedInstance}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)', opacity: joining ? 0.7 : 1 }}>
                {joining
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Launching...</>
                  : <><Play className="w-4 h-4 fill-current" />Launch & Join</>}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Add Friend Modal ───────────────────────────────────────────────────────────
function AddFriendModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!username.trim()) return;
    setSent(true);
    setTimeout(onClose, 2000);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{t('friends.addFriend')}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
          </button>
        </div>
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(46,204,113,0.15)', border: '2px solid var(--color-success)' }}>
              <Check className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t('friends.requestSent')}</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {username} will see your request when they open Portal Launcher.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {t('friends.searchByUsername')}
            </p>
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className="w-full px-3 py-2.5 rounded-xl text-sm mb-4"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              placeholder="CreeperSlayer99" autoFocus />
            <button onClick={handleSend} disabled={!username.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)', opacity: username.trim() ? 1 : 0.5 }}>
              {t('friends.sendRequest')}
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg, onDelete }: { msg: Message; onDelete: (type: 'me' | 'all') => void }) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (msg.deletedForMe) return null;
  if (msg.deleted) return (
    <div className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className="px-3 py-2 rounded-2xl text-xs italic flex items-center gap-1.5"
        style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', color: 'var(--color-text-tertiary)' }}>
        <Trash2 className="w-3 h-3" />
        {msg.isMe ? t('chat.youDeletedThisMessage') : t('chat.messageWasDeleted')}
      </div>
    </div>
  );

  return (
    <div ref={ref} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'} mb-1 group relative`}>
      <div className="max-w-[75%] relative">
        {/* Bubble */}
        <motion.div
          className="px-3 py-2 rounded-2xl text-sm cursor-pointer select-text"
          style={msg.isMe
            ? { background: 'var(--color-primary)', color: 'white' }
            : { background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
          initial={msg.isMe ? { backgroundColor: 'rgba(46,204,113,0.7)' } : {}}
          animate={msg.isMe ? { backgroundColor: 'var(--color-primary)' } : {}}
          transition={{ duration: 0.6 }}
          onContextMenu={e => { e.preventDefault(); setShowMenu(true); }}>
          {msg.text}
        </motion.div>

        {/* Meta */}
        <div className={`flex items-center gap-1 mt-0.5 ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{fmtTime(msg.timestamp)}</span>
          {msg.isMe && (
            msg.status === 'sent'
              ? <Clock className="w-2.5 h-2.5" style={{ color: 'var(--color-text-tertiary)' }} />
              : msg.status === 'delivered'
                ? <Check className="w-2.5 h-2.5" style={{ color: 'var(--color-text-tertiary)' }} />
                : <CheckCheck className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} />
          )}
        </div>

        {/* Context menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              className="absolute z-20 rounded-xl overflow-hidden"
              style={{ [msg.isMe ? 'right' : 'left']: '0', bottom: '100%', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)' }}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              {[
                { icon: Copy, label: t('chat.copyText'), action: () => { navigator.clipboard.writeText(msg.text); setShowMenu(false); } },
                { icon: Trash2, label: t('chat.deleteForMe'), action: () => { onDelete('me'); setShowMenu(false); }, color: 'var(--color-error)' },
                ...(msg.isMe ? [{ icon: Trash2, label: t('chat.deleteForEveryone'), action: () => { onDelete('all'); setShowMenu(false); }, color: 'var(--color-error)' }] : []),
              ].map(({ icon: Icon, label, action, color }) => (
                <button key={label} onClick={action}
                  className="flex items-center gap-2.5 px-4 py-2.5 w-full text-left text-sm hover:bg-white/5 transition-colors whitespace-nowrap"
                  style={{ color: color || 'var(--color-text-secondary)' }}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Chat Window ────────────────────────────────────────────────────────────────
function ChatWindow({ friend }: { friend: Friend }) {
  const { t } = useTranslation();
  const { messages, addMessage, deleteForMe, deleteForAll, markRead } = useFriendsStore();
  const [text, setText] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const msgs = messages[friend.id] ?? [];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);
  useEffect(() => { markRead(friend.id); }, [friend.id, markRead]);

  const sendMsg = () => {
    if (!text.trim()) return;
    addMessage(friend.id, {
      id: `msg-${Date.now()}`, senderId: 'me', text: text.trim(),
      timestamp: new Date().toISOString(), isMe: true, type: 'text', status: 'sent',
    });
    setText('');
    // Simulate reply
    setTimeout(() => {
      const replies = ['Nice!', 'That\'s cool!', 'haha', 'I see 👀', '👍', 'gg', 'Yeah!', 'Sure!', 'lol', 'fr fr'];
      addMessage(friend.id, {
        id: `msg-${Date.now() + 1}`, senderId: friend.id,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toISOString(), isMe: false, type: 'text', status: 'delivered',
      });
    }, 1500 + Math.random() * 1000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${friend.avatarColor}25`, color: friend.avatarColor }}>
            {friend.username[0].toUpperCase()}
          </div>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: statusDot[friend.status], borderColor: 'var(--color-surface)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{friend.username}</p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {friend.status === 'playing' && friend.currentInstance
              ? `🎮 Playing ${friend.currentInstance}${friend.serverAddress ? ` · ${friend.serverAddress}` : ' · LAN'}`
              : statusLabel[friend.status]}
          </p>
        </div>

        {/* Join World button (when friend is playing) */}
        {friend.status === 'playing' && (
          <button
            onClick={() => setShowJoinModal(true)}
            title="Join their world"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--color-success)', color: 'white' }}>
            <Play className="w-3 h-3 fill-current" />
            Join
          </button>
        )}

        {/* Call button */}
        <button
          onClick={() => setInCall(v => !v)}
          title={inCall ? 'End Call' : 'Start Call'}
          className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
          style={{
            background: inCall ? 'rgba(231,76,60,0.15)' : 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: inCall ? 'var(--color-error)' : 'var(--color-text-secondary)',
          }}>
          <Phone className="w-4 h-4" />
        </button>
      </div>

      {/* In-call bar */}
      <AnimatePresence>
        {inCall && (
          <motion.div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
            style={{ background: 'rgba(46,204,113,0.1)', borderBottom: '1px solid rgba(46,204,113,0.2)' }}
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>In Call</span>
              <div className="flex items-center gap-1.5">
                {/* Speaking indicator */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: `${friend.avatarColor}25`, color: friend.avatarColor }}>
                  {friend.username[0]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMicMuted(v => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                style={{ background: micMuted ? 'rgba(231,76,60,0.15)' : 'var(--color-surface-2)', color: micMuted ? 'var(--color-error)' : 'var(--color-text-secondary)' }}>
                {micMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setInCall(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: 'var(--color-error)', color: 'white' }}>
                End
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-area p-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: `${friend.avatarColor}20`, color: friend.avatarColor }}>
              {friend.username[0]}
            </div>
            <div className="text-center">
              <p className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>{friend.username}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Friends since {new Date(friend.friendsSince).toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>Say hello! 👋</p>
            </div>
          </div>
        )}
        {msgs.map(msg => (
          <MessageBubble key={msg.id} msg={msg}
            onDelete={(type) => type === 'me' ? deleteForMe(friend.id, msg.id) : deleteForAll(friend.id, msg.id)} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-end gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <button className="mb-0.5" style={{ color: 'var(--color-text-tertiary)' }} title="Attach file">
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
            placeholder={t('chat.typeMessage')}
            rows={1} className="flex-1 bg-transparent text-sm resize-none"
            style={{ color: 'var(--color-text)', maxHeight: '80px', lineHeight: '1.5' }} />
          <button onClick={sendMsg} disabled={!text.trim()} className="mb-0.5 transition-all"
            style={{ color: text.trim() ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-center mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>

      <AnimatePresence>
        {showJoinModal && <JoinWorldModal friend={friend} onClose={() => setShowJoinModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ── Friend Card ────────────────────────────────────────────────────────────────
function FriendCard({ friend, selected, onClick }: { friend: Friend; selected: boolean; onClick: () => void }) {
  const { messages } = useFriendsStore();
  const msgArr = messages[friend.id] ?? [];
  const lastMsg = msgArr.length > 0 ? msgArr[msgArr.length - 1] : undefined;

  return (
    <motion.button onClick={onClick} whileHover={{ x: 2 }} transition={{ duration: 0.1 }}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
      style={{
        background: selected ? 'var(--color-primary-dim)' : 'transparent',
        border: selected ? '1px solid var(--color-primary)' : '1px solid transparent',
      }}>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: `${friend.avatarColor}25`, color: friend.avatarColor }}>
          {friend.username[0].toUpperCase()}
        </div>
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
          style={{ background: statusDot[friend.status], borderColor: 'var(--color-surface)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold truncate"
            style={{ color: selected ? 'var(--color-primary)' : 'var(--color-text)' }}>
            {friend.username}
          </p>
          {lastMsg && (
            <span className="text-[10px] shrink-0 ml-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {fmtTime(lastMsg.timestamp)}
            </span>
          )}
        </div>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {friend.status === 'playing' && friend.currentInstance
            ? `🎮 ${friend.currentInstance}`
            : lastMsg
              ? (lastMsg.isMe ? `You: ${lastMsg.text}` : lastMsg.text)
              : statusLabel[friend.status]}
        </p>
      </div>
      {friend.unread > 0 && (
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          {friend.unread}
        </div>
      )}
    </motion.button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function FriendsPage() {
  const { t } = useTranslation();
  const { friends, selectedId, select } = useFriendsStore();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');

  const selectedFriend = friends.find(f => f.id === selectedId);
  const filtered = friends.filter(f => f.username.toLowerCase().includes(search.toLowerCase()));
  const online = filtered.filter(f => f.status !== 'offline');
  const offline = filtered.filter(f => f.status === 'offline');

  return (
    <div className="h-full flex gap-4 min-h-0">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="p-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>{t('friends.title')}</h2>
            <button onClick={() => setShowAdd(true)} title="Add Friend"
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5"
              style={{ color: 'var(--color-text-secondary)' }}>
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--color-text-tertiary)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs" style={{ color: 'var(--color-text)' }}
              placeholder="Search friends..." />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-area p-2">
          {online.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest px-2 py-1.5"
                style={{ color: 'var(--color-text-tertiary)' }}>Online — {online.length}</p>
              {online.map(f => <FriendCard key={f.id} friend={f} selected={selectedId === f.id} onClick={() => select(f.id)} />)}
            </>
          )}
          {offline.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest px-2 py-1.5 mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}>Offline — {offline.length}</p>
              {offline.map(f => <FriendCard key={f.id} friend={f} selected={selectedId === f.id} onClick={() => select(f.id)} />)}
            </>
          )}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
              {friends.length === 0 ? (
                <>
                  <Users className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{t('friends.emptyTitle')}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{t('friends.emptyHint')}</p>
                </>
              ) : (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No friends found</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: chat */}
      <div className="flex-1 rounded-xl overflow-hidden min-w-0"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <AnimatePresence mode="wait">
          {selectedFriend ? (
            <motion.div key={selectedFriend.id} className="h-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChatWindow friend={selectedFriend} />
            </motion.div>
          ) : (
            <motion.div key="empty" className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <Users className="w-8 h-8" style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{t('friends.selectFriend')}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Select a friend to start chatting or join their world
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>{showAdd && <AddFriendModal onClose={() => setShowAdd(false)} />}</AnimatePresence>
    </div>
  );
}
