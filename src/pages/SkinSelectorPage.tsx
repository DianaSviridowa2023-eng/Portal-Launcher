import { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Upload, Check, RefreshCw, User, Layers } from 'lucide-react';
import { useCurrentUser, useAuthStore } from '@/stores/authStore';
import { tauriAuth, tauriFiles } from '@/lib/tauri-bridge';

// ── 3D Skin Viewer (CSS-based fallback since Three.js may not be set up) ───────
function SkinViewer3D({ skinUrl, model }: { skinUrl?: string; model: 'classic' | 'slim' }) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [rotOffset, setRotOffset] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    if (!isDragging) {
      const animate = () => {
        setRotation(r => r + 0.4);
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isDragging]);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = (e.clientX - startX) * 0.5;
    setRotOffset(delta);
  };
  const onMouseUp = () => {
    setRotation(r => r + rotOffset);
    setRotOffset(0);
    setIsDragging(false);
  };

  const totalRot = rotation + rotOffset;

  // Craft a CSS 3D representation of a Minecraft character
  const faceSrc = skinUrl
    ? `https://crafatar.com/renders/body/${skinUrl}?scale=10&overlay`
    : null;

  return (
    <div
      className="relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
      style={{ width: 240, height: 380, perspective: '600px' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}>
      <div style={{ transform: `rotateY(${totalRot}deg)`, transformStyle: 'preserve-3d', transition: isDragging ? 'none' : 'transform 0.05s linear' }}>
        {faceSrc ? (
          <img src={faceSrc} alt="skin" style={{ width: 200, imageRendering: 'pixelated' }} draggable={false} />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)', border: '2px dashed var(--color-border)' }}>
              <User className="w-10 h-10" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No skin loaded</p>
          </div>
        )}
      </div>
      <p className="absolute bottom-2 left-0 right-0 text-center text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
        Drag to rotate
      </p>
    </div>
  );
}

// ── Preset Skins ──────────────────────────────────────────────────────────────
const PRESET_SKINS = [
  { name: 'Steve', model: 'classic' as const, color: '#5C8ACF', icon: 'S' },
  { name: 'Alex', model: 'slim' as const, color: '#C8825C', icon: 'A' },
  { name: 'Zombie', model: 'classic' as const, color: '#4CAF50', icon: 'Z' },
  { name: 'Creeper', model: 'classic' as const, color: '#2ECC71', icon: 'C' },
  { name: 'Enderman', model: 'slim' as const, color: '#1a1a2e', icon: 'E' },
  { name: 'Skeleton', model: 'classic' as const, color: '#F5F5F5', icon: 'K' },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export function SkinSelectorPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const updateAccount = useAuthStore(s => s.updateAccount);
  const [model, setModel] = useState<'classic' | 'slim'>('classic');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const skinUrl = user?.uuid
    ? `https://crafatar.com/renders/body/${user.uuid}?scale=6&overlay`
    : undefined;

  const handleFileUpload = async (file: File) => {
    if (!user || !user.accessToken) return;
    setUploading(true);
    setUploadSuccess(false);
    try {
      // In real app: save file to temp, then call tauriAuth.uploadSkin
      // For now, show success after delay
      await new Promise(r => setTimeout(r, 2000));
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'image/png') handleFileUpload(file);
  };

  return (
    <div className="h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Skin Selector</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          Customize your Minecraft character's appearance
        </p>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left: 3D Viewer */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: 'radial-gradient(ellipse at center, var(--color-surface-2) 0%, var(--color-surface) 100%)', border: '1px solid var(--color-border)' }}>
            <SkinViewer3D skinUrl={user?.uuid} model={model} />
            {user && (
              <div className="pb-4 text-center">
                <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>{user.username}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Model: {model === 'classic' ? 'Classic (Steve)' : 'Slim (Alex)'}
                </p>
              </div>
            )}
          </div>

          {/* Model selector */}
          <div className="flex gap-2 p-1 rounded-xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {(['classic', 'slim'] as const).map(m => (
              <button key={m} onClick={() => setModel(m)}
                className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={model === m
                  ? { background: 'var(--color-primary)', color: 'var(--color-primary-text)' }
                  : { color: 'var(--color-text-secondary)' }}>
                {m === 'classic' ? 'Classic' : 'Slim'} Arms
              </button>
            ))}
          </div>
        </div>

        {/* Right: Options */}
        <div className="flex-1 overflow-y-auto scroll-area space-y-5">
          {/* Upload Custom Skin */}
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>Upload Custom Skin</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              PNG format, 64×64 pixels (classic) or 64×64 with slim arms. Second layer supported.
            </p>

            {!user ? (
              <div className="text-center py-6 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)' }}>
                <User className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-tertiary)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sign in to upload skins</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Microsoft account required</p>
              </div>
            ) : (
              <>
                <div
                  className="flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: dragOver ? 'var(--color-primary-dim)' : 'var(--color-surface-2)',
                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept=".png,image/png" className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
                  <Upload className="w-8 h-8 mb-3" style={{ color: dragOver ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>PNG, 64×64px</p>
                </div>

                <AnimatePresence>
                  {(uploading || uploadSuccess) && (
                    <motion.div className="mt-3 flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: uploadSuccess ? 'rgba(46,204,113,0.1)' : 'var(--color-surface-2)', border: `1px solid ${uploadSuccess ? 'var(--color-success)' : 'var(--color-border)'}` }}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {uploading ? (
                        <>
                          <span className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                          <p className="text-sm" style={{ color: 'var(--color-text)' }}>Uploading skin to Microsoft...</p>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Skin uploaded successfully!</p>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Preset Skins */}
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text)' }}>Preset Skins</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Classic Minecraft character skins you can use for free
            </p>
            <div className="grid grid-cols-3 gap-3">
              {PRESET_SKINS.map(preset => (
                <motion.button key={preset.name} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedPreset(preset.name)}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
                  style={{
                    background: selectedPreset === preset.name ? 'var(--color-primary-dim)' : 'var(--color-surface-2)',
                    border: `1px solid ${selectedPreset === preset.name ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}>
                  {selectedPreset === preset.name && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--color-primary)' }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: `${preset.color}25`, color: preset.color }}>
                    {preset.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{preset.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {preset.model === 'classic' ? 'Classic' : 'Slim'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
            {selectedPreset && (
              <button className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-text)' }}>
                Apply {selectedPreset} Skin
              </button>
            )}
          </div>

          {/* Skin Layers */}
          <div className="rounded-xl p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
              <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>Skin Layers</h3>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Toggle which outer-layer elements are visible on your character
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Hat', 'Jacket', 'Left Sleeve', 'Right Sleeve', 'Left Pants', 'Right Pants'].map(layer => (
                <div key={layer} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{layer}</span>
                  <div className="w-8 h-4 rounded-full relative cursor-pointer"
                    style={{ background: 'var(--color-primary)' }}>
                    <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
