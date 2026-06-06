import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, RefreshCw, ExternalLink, X, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { tauriAuth } from '@/lib/tauri-bridge';

export function MicrosoftAuth({ onSuccess, onCancel }: {
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { setDeviceCode, clearDeviceCode, addAccount, setLoading, isLoading } = useAuthStore();
  const [step, setStep] = useState<'idle' | 'code' | 'waiting' | 'success' | 'error'>('idle');
  const [userCode, setUserCode] = useState('');
  const [verUri, setVerUri] = useState('');
  const [deviceCode, setDCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (step !== 'code' && step !== 'waiting') return;
    const iv = setInterval(() => {
      const left = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) {
        clearInterval(iv);
        setStep('error');
        setErrorMsg('Code expired. Please try again.');
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [step, expiresAt]);

  // Stop polling on unmount
  useEffect(() => () => { if (pollInterval) clearInterval(pollInterval); }, [pollInterval]);

  const startFlow = useCallback(async () => {
    setLoading(true);
    setStep('code');
    setErrorMsg('');
    try {
      const res = await tauriAuth.startDeviceCodeFlow();
      setUserCode(res.user_code);
      setVerUri(res.verification_uri);
      setDCode(res.device_code);
      setExpiresAt(Date.now() + res.expires_in * 1000);
      setTimeLeft(res.expires_in);
      setDeviceCode(res.device_code, res.verification_uri, res.user_code, res.expires_in);
      setStep('waiting');

      // Poll for auth
      const iv = setInterval(async () => {
        try {
          const profile = await tauriAuth.pollForToken(res.device_code);
          if (profile) {
            clearInterval(iv);
            addAccount({
              uuid: profile.uuid,
              username: profile.username,
              skinUrl: profile.skin_url,
              avatarUrl: profile.skin_url
                ? `https://crafatar.com/avatars/${profile.uuid}?size=64&overlay`
                : undefined,
              accessToken: profile.access_token,
              refreshToken: profile.refresh_token,
              tokenExpiry: Date.now() + profile.expires_in * 1000,
            });
            clearDeviceCode();
            setStep('success');
            setLoading(false);
            setTimeout(() => onSuccess?.(), 1500);
          }
        } catch {
          // still polling
        }
      }, (res.interval ?? 5) * 1000);
      setPollInterval(iv);
    } catch (e) {
      setStep('error');
      setErrorMsg('Failed to start authentication. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [addAccount, clearDeviceCode, setDeviceCode, setLoading, onSuccess]);

  const copyCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openBrowser = () => window.open(verUri, '_blank');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center text-center">
      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0078D4, #00BCF2)' }}>
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Sign in with Microsoft</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Authenticate with your Minecraft-enabled Microsoft account to play and access all features.
              </p>
            </div>
            <button onClick={startFlow}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: '#0078D4', color: 'white' }}>
              <svg viewBox="0 0 21 21" className="w-4 h-4 fill-white">
                <rect x="1" y="1" width="9" height="9" /><rect x="11" y="1" width="9" height="9" />
                <rect x="1" y="11" width="9" height="9" /><rect x="11" y="11" width="9" height="9" />
              </svg>
              Continue with Microsoft
            </button>
            {onCancel && (
              <button onClick={onCancel} className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Cancel</button>
            )}
          </motion.div>
        )}

        {(step === 'code' || step === 'waiting') && (
          <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-5 w-full">
            {/* Step 1 */}
            <div className="w-full p-4 rounded-xl text-left" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Step 1 — Copy Code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center justify-center py-3 rounded-xl"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <span className="text-2xl font-bold tracking-[0.3em]" style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                    {userCode || '— — — —'}
                  </span>
                </div>
                <button onClick={copyCode}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  style={{ background: copied ? 'rgba(46,204,113,0.15)' : 'var(--color-surface)', border: '1px solid var(--color-border)', color: copied ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="w-full p-4 rounded-xl text-left" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-tertiary)' }}>Step 2 — Open Browser</p>
              <button onClick={openBrowser}
                className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#0078D4', color: 'white' }}>
                <ExternalLink className="w-4 h-4" /> Open microsoft.com/link
              </button>
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center gap-3 py-3">
              <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Waiting for authentication...
              </p>
              <span className="text-xs font-mono" style={{ color: 'var(--color-text-tertiary)' }}>
                {formatTime(timeLeft)}
              </span>
            </div>

            <button onClick={() => { if (pollInterval) clearInterval(pollInterval); startFlow(); }}
              className="text-xs flex items-center gap-1 hover:opacity-80"
              style={{ color: 'var(--color-text-tertiary)' }}>
              <RefreshCw className="w-3 h-3" /> Get new code
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(46,204,113,0.15)', border: '2px solid var(--color-success)' }}>
              <Check className="w-8 h-8" style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--color-text)' }}>Signed in successfully!</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Welcome to Portal Launcher</p>
            </div>
          </motion.div>
        )}

        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(231,76,60,0.1)', border: '2px solid var(--color-error)' }}>
              <X className="w-8 h-8" style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--color-text)' }}>Authentication failed</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{errorMsg}</p>
            </div>
            <button onClick={() => { setStep('idle'); }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}>
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
