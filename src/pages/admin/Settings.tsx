import React, { useState, useEffect, useRef } from 'react';
import { useVehicles, sanitizeHeroImage } from '../../context/VehicleContext';
import { UploadCloud, Trash2, Plus, Image as ImageIcon, Link as LinkIcon, AlertCircle, Wifi, WifiOff, Check, RotateCw, Play, Pause, Compass, Layers, Sparkles, Database, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadImageToStorage, cleanupLegacyImageVariants, supabase } from '../../lib/supabase';
import { SmartImage } from '../../components/SmartImage';
import { FrameUploaderModal } from '../../components/FrameUploaderModal';
import { loadCustomFrames, clearCustomFrames, getLastFrameUrl } from '../../lib/frameStore';

export default function AdminSettings() {
  const { siteConfig, updateSiteConfig } = useVehicles();
  const [success, setSuccess] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'not_configured' | 'error'>('checking');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState('');
  const [showSqlHelper, setShowSqlHelper] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // 360 Turntable Frame Sequence State
  const [isFrameStudioOpen, setIsFrameStudioOpen] = useState(false);
  const [customFrames, setCustomFrames] = useState<string[] | null>(null);
  const [lastFrameSrc, setLastFrameSrc] = useState<string>('/frames/frame_0060.webp');
  const [dealerPreviewIdx, setDealerPreviewIdx] = useState(0);
  const [isDealerAutoSpinning, setIsDealerAutoSpinning] = useState(false);
  const totalTurntableFrames = customFrames ? customFrames.length : 60;

  const refreshFrames = async () => {
    const loaded = await loadCustomFrames();
    setCustomFrames(loaded);
    const last = await getLastFrameUrl();
    setLastFrameSrc(last);
  };

  useEffect(() => {
    refreshFrames();
    window.addEventListener('apex_custom_frames_updated', refreshFrames);
    return () => window.removeEventListener('apex_custom_frames_updated', refreshFrames);
  }, []);

  // Dealer Turntable Auto Spin Player
  useEffect(() => {
    if (!isDealerAutoSpinning) return;
    const interval = setInterval(() => {
      setDealerPreviewIdx((prev) => (prev + 1) % totalTurntableFrames);
    }, 1000 / 18);
    return () => clearInterval(interval);
  }, [isDealerAutoSpinning, totalTurntableFrames]);

  const handleResetToPreset = async () => {
    if (window.confirm('Reset 360 sequence back to the factory 60-frame showcase preset?')) {
      await clearCustomFrames();
      await refreshFrames();
      setDealerPreviewIdx(0);
      setSuccess('Reverted 360° showcase sequence to factory preset (60 frames).');
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  React.useEffect(() => {
    const checkConnection = async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!url || !key || url === 'YOUR_SUPABASE_URL' || url === 'https://placeholder.supabase.co' || url.includes('placeholder')) {
        setSupabaseStatus('not_configured');
        return;
      }

      try {
        const { error } = await supabase.from('metadata_versions').select('key').limit(1);
        if (error) {
          setSupabaseStatus('error');
          setSupabaseErrorMsg(error.message || JSON.stringify(error));
        } else {
          setSupabaseStatus('connected');
        }
      } catch (err: any) {
        setSupabaseStatus('error');
        setSupabaseErrorMsg(err?.message || String(err));
      }
    };

    checkConnection();
  }, []);
  
  const handleCleanupLegacyVariants = async () => {
    setIsCleaning(true);
    setErrorText('');
    try {
      const { deletedCount, errors } = await cleanupLegacyImageVariants();
      if (errors.length > 0) {
        console.error('Cleanup encountered errors:', errors);
        setErrorText(`Cleaned ${deletedCount} images but encountered ${errors.length} errors.`);
      } else {
        setSuccess(`Successfully cleaned up ${deletedCount} legacy image variants.`);
      }
      setTimeout(() => setSuccess(''), 5000);
      setTimeout(() => setErrorText(''), 5000);
    } catch (err: any) {
      console.error(err);
      setErrorText('Failed to perform cleanup.');
    } finally {
      setIsCleaning(false);
    }
  };

  
  const [reelUrl, setReelUrl] = useState('');
  const [customAboutUrl, setCustomAboutUrl] = useState('');
  const [customHeroVideoUrl, setCustomHeroVideoUrl] = useState('');
  const [customHeroMobileVideoUrl, setCustomHeroMobileVideoUrl] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'logo' | 'aboutImage' | 'homeHeroVideo' | 'homeHeroMobileVideo' | 'homeHeroImage' | 'homeHeroMobileImage') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      setErrorText('');
      try {
        const subPath = key === 'logo' ? 'site_settings/logo' : 'site_settings';
        const publicUrl = await uploadImageToStorage(file, subPath, 'site_settings');
        
        updateSiteConfig({ [key]: publicUrl });
        const labels: Record<string, string> = {
          logo: 'Logo',
          homeHeroVideo: 'Home Hero Video',
          homeHeroMobileVideo: 'Home Hero Mobile Video',
          homeHeroImage: 'Home Hero Photo',
          homeHeroMobileImage: 'Home Hero Mobile Photo',
          aboutImage: 'About Image'
        };
        const labelText = labels[key] || 'Asset';
        setSuccess(`${labelText} updated successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        console.error('Image upload failed', err);
        setErrorText(err.message || 'Failed to process custom asset upload.');
        setTimeout(() => setErrorText(''), 5000);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSaveUrl = (key: 'aboutImage' | 'homeHeroVideo' | 'homeHeroMobileVideo', url: string) => {
    if (url.trim()) {
      updateSiteConfig({ [key]: url.trim() });
      const labels: Record<string, string> = {
        homeHeroVideo: 'Hero Video URL',
        homeHeroMobileVideo: 'Hero Mobile Video URL',
        aboutImage: 'About Image URL'
      };
      const labelText = labels[key] || 'Asset URL';
      setSuccess(`${labelText} updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      if (key === 'homeHeroVideo') setCustomHeroVideoUrl('');
      if (key === 'homeHeroMobileVideo') setCustomHeroMobileVideoUrl('');
      if (key === 'aboutImage') setCustomAboutUrl('');
    }
  };

  const handleDeliveryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      setErrorText('');
      try {
        const publicUrl = await uploadImageToStorage(file, 'site_settings', 'site_settings');
        
        const current = siteConfig.clientDeliveries || [];
        updateSiteConfig({ clientDeliveries: [...current, publicUrl] });
        setSuccess('Client delivery photo uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        console.error('Delivery photo upload failed', err);
        setErrorText(err.message || 'Failed to process delivery photo.');
        setTimeout(() => setErrorText(''), 5000);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleRemoveDelivery = (index: number) => {
    const current = siteConfig.clientDeliveries || [];
    const updated = current.filter((_, idx) => idx !== index);
    updateSiteConfig({ clientDeliveries: updated });
    setSuccess('Client delivery photo removed!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddReelUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (reelUrl.trim()) {
      const current = siteConfig.instagramReels || [];
      updateSiteConfig({ instagramReels: [...current, reelUrl.trim()] });
      setReelUrl('');
      setSuccess('Instagram Reel added!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleRemoveReel = (index: number) => {
    const current = siteConfig.instagramReels || [];
    const updated = current.filter((_, idx) => idx !== index);
    updateSiteConfig({ instagramReels: updated });
    setSuccess('Instagram Reel removed!');
    setTimeout(() => setSuccess(''), 3000);
  };


  return (
    <div className="space-y-8 max-w-4xl font-sans text-zinc-300">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-widest uppercase">Website Settings Manager</h1>
        <p className="text-zinc-400 text-xs mt-2 font-mono uppercase tracking-wider font-semibold">Manage public showroom imagery, branding, logos, and custom client delivery photos.</p>
      </div>



      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2.5 animate-ping"></span>
          <span>{success}</span>
        </div>
      )}

      {errorText && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-xl text-xs font-bold uppercase tracking-wider font-mono flex items-center shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 mr-2.5 animate-pulse"></span>
          <span>{errorText}</span>
        </div>
      )}

      {/* Cloud & Local Persistence Sync Status */}
      <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              supabaseStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              supabaseStatus === 'error' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white">Database & Storage Status</h3>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  supabaseStatus === 'connected' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  supabaseStatus === 'error' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-blue-500/10 border-blue-500/30 text-blue-400'
                }`}>
                  {supabaseStatus === 'connected' ? 'Connected & Synced' : supabaseStatus === 'error' ? 'IndexedDB Active (Cloud Notice)' : 'Local IndexedDB Active'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                All vehicles, 360° frames, and media configurations are guaranteed saved in high-speed IndexedDB cache.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlHelper(!showSqlHelper)}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            <span>Supabase Schema Helper</span>
            {showSqlHelper ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showSqlHelper && (
          <div className="mt-2 pt-3 border-t border-white/5 space-y-3">
            <p className="text-[10px] text-zinc-400 font-mono">
              Optional: If you would like to synchronize showroom settings across different cloud databases in Supabase, run this script in your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-white underline">Supabase SQL Editor</a>:
            </p>
            <div className="relative">
              <pre className="bg-black/60 border border-white/10 rounded-xl p-3.5 text-[10px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'CYR Cars',
  logo_url TEXT,
  about_image_url TEXT,
  home_hero_image_url TEXT,
  home_hero_mobile_image_url TEXT,
  home_hero_video_url TEXT,
  home_hero_mobile_video_url TEXT,
  home_hero_type TEXT DEFAULT 'video',
  client_deliveries JSONB DEFAULT '[]'::jsonb,
  instagram_reels JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.site_settings (id, company_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'CYR Cars')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow all upsert access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  const sql = `CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'CYR Cars',
  logo_url TEXT,
  about_image_url TEXT,
  home_hero_image_url TEXT,
  home_hero_mobile_image_url TEXT,
  home_hero_video_url TEXT,
  home_hero_mobile_video_url TEXT,
  home_hero_type TEXT DEFAULT 'video',
  client_deliveries JSONB DEFAULT '[]'::jsonb,
  instagram_reels JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.site_settings (id, company_name)
VALUES ('00000000-0000-0000-0000-000000000000', 'CYR Cars')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow all upsert access" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="absolute top-2.5 right-2.5 bg-white/10 hover:bg-white text-zinc-300 hover:text-black text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/20 transition-all flex items-center gap-1"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>
        )}
      </div>



      <div className="bg-zinc-950/65 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl p-4 sm:p-6 md:p-8 space-y-10">
        
        {/* 360° Showroom Turntable Studio & Frame Sequence Manager */}
        <div className="border-l-2 border-white pl-3 sm:pl-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 sm:mb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-serif font-bold text-white uppercase tracking-widest">360° Showcase Turntable Studio</h2>
              <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border ${
                customFrames ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/20'
              }`}>
                {customFrames ? `Custom (${customFrames.length} Frames)` : 'Factory Preset (60 Frames)'}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="btn-dealer-open-studio"
                onClick={() => setIsFrameStudioOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md active:scale-95 text-center"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Upload 360 Video / Frames</span>
              </button>
              {customFrames && (
                <button
                  type="button"
                  id="btn-dealer-reset-frames"
                  onClick={handleResetToPreset}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-white/10 text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider transition-all text-center"
                  title="Revert to factory default sequence"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-4 sm:mb-6">
            Upload any car video (MP4/MOV) to automatically extract compressed 360° scroll frames, or upload individual high-resolution images.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-black/40 p-3.5 sm:p-5 rounded-2xl border border-white/5">
            {/* Turntable Interactive Preview Window */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-zinc-900/60 border border-white/10 flex items-center justify-center shadow-inner">
                {customFrames && customFrames[dealerPreviewIdx] ? (
                  <img 
                    src={customFrames[dealerPreviewIdx]} 
                    alt={`Frame ${dealerPreviewIdx + 1}`}
                    className="w-full h-full object-cover select-none"
                  />
                ) : (
                  <img 
                    src={`/frames/frame_${String(dealerPreviewIdx + 1).padStart(4, '0')}.webp`}
                    alt={`Preset Frame ${dealerPreviewIdx + 1}`}
                    onError={(e) => {
                      // fallback to 2-digit if needed
                      const target = e.currentTarget;
                      target.src = `/frames/frame_${String(dealerPreviewIdx + 1).padStart(2, '0')}.webp`;
                    }}
                    className="w-full h-full object-cover select-none"
                  />
                )}

                {/* Overlay Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-zinc-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>FRAME {String(dealerPreviewIdx + 1).padStart(2, '0')} / {totalTurntableFrames}</span>
                  <span>({Math.round((dealerPreviewIdx / (totalTurntableFrames - 1 || 1)) * 360)}°)</span>
                </div>

                <div className="absolute bottom-2 right-2">
                  <button
                    type="button"
                    onClick={() => setIsDealerAutoSpinning(!isDealerAutoSpinning)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/80 hover:bg-white hover:text-black text-white text-[10px] font-mono uppercase tracking-wider border border-white/20 transition-all"
                  >
                    {isDealerAutoSpinning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isDealerAutoSpinning ? 'Pause Spin' : 'Test 360 Spin'}</span>
                  </button>
                </div>
              </div>

              {/* Scrubber slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
                  <span>Turntable Frame Scrub</span>
                  <span>{Math.round(((dealerPreviewIdx + 1) / totalTurntableFrames) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={totalTurntableFrames - 1}
                  value={dealerPreviewIdx}
                  onChange={(e) => {
                    setIsDealerAutoSpinning(false);
                    setDealerPreviewIdx(parseInt(e.target.value, 10));
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
              </div>
            </div>

            {/* Right details & Last Frame backdrop info */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 text-xs font-mono">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/30 border border-white/5">
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Permanent Backdrop Frame</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mb-3">
                    The last frame ({totalTurntableFrames} of {totalTurntableFrames}) is permanently set as the website backdrop for seamless visual continuity.
                  </p>
                  <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-white/10 bg-black/50">
                    <img 
                      src={lastFrameSrc} 
                      alt="Permanent Background Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsFrameStudioOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-white/20 hover:border-white text-zinc-300 hover:text-white hover:bg-white/5 transition-all text-center text-xs font-mono uppercase tracking-wider"
                >
                  + Upload Video / 360 Sequence Files
                </button>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Logo Section */}
        <div>
          <h2 className="text-sm font-bold font-serif text-white mb-1 uppercase tracking-widest">Showroom Brand Logo</h2>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">Updates logo displayed inside primary front-end header and footer bars.</p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-52 h-24 overflow-hidden rounded-xl border border-white/5 flex items-center justify-center p-4 bg-black/40 shrink-0 shadow-inner">
              <img src={siteConfig.logo} alt="Logo Preview" className="max-h-16 max-w-full object-contain" />
            </div>
            <div className="flex-grow space-y-4">
              <label className="block w-full cursor-pointer bg-zinc-900/25 border-2 border-dashed border-white/10 hover:border-white hover:bg-white/5 rounded-xl p-6 transition-all text-center">
                <input type="file" accept="image/*" className="hidden" disabled={isCompressing} onChange={(e) => handleImageUpload(e, 'logo')} />
                <UploadCloud className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  {isCompressing ? 'Compacting Logo...' : 'Upload New Logo'}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5 uppercase tracking-wider">Supports PNG or SVGs (automatically compressed)</p>
              </label>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Home Hero Background Photo (Desktop) */}
        <div className="border-l-2 border-white pl-4">
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-widest">Home Page Background Photo (Desktop)</h2>
            <span className="bg-white/10 text-white text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-white/15">Desktop</span>
            <span className="bg-white text-zinc-950 text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase">Active</span>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">High-resolution horizontal showcase image displayed as the desktop homepage background.</p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-52 aspect-video overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30 shrink-0 relative shadow-sm flex items-center justify-center">
              {siteConfig.homeHeroImage ? (
                <img src={siteConfig.homeHeroImage} className="w-full h-full object-cover" alt="Hero Desktop Backdrop" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-[10px] text-zinc-500 font-mono uppercase">No photo configured</p>
                  <p className="text-[8px] text-zinc-600 font-mono mt-1">Default dark solid background will show</p>
                </div>
              )}
            </div>
            <div className="flex-grow space-y-4">
              <label className="block w-full cursor-pointer bg-zinc-900/25 border-2 border-dashed border-white/10 hover:border-white hover:bg-white/5 rounded-xl p-6 transition-all text-center">
                <input type="file" accept="image/*" className="hidden" disabled={isCompressing} onChange={(e) => handleImageUpload(e, 'homeHeroImage')} />
                <UploadCloud className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  {isCompressing ? 'Uploading Photo...' : 'Upload Showroom Background Photo'}
                </p>
                <p className="text-[10px] text-zinc-550 font-mono mt-0.5 uppercase tracking-wider">Supports JPG, PNG format files (uploads directly to Supabase)</p>
              </label>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Home Hero Background Photo (Mobile) */}
        <div className="border-l-2 border-white pl-4">
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-widest">Home Page Background Photo (Mobile)</h2>
            <span className="bg-white/10 text-white text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-white/15">Mobile</span>
            <span className="bg-white text-zinc-950 text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase">Active</span>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">Optional portrait showcase image optimized for mobile devices.</p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-52 h-44 overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30 shrink-0 relative shadow-sm flex items-center justify-center">
              {siteConfig.homeHeroMobileImage ? (
                <img src={siteConfig.homeHeroMobileImage} className="w-full h-full object-cover" alt="Hero Mobile Backdrop" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-[10px] text-zinc-500 font-mono uppercase">No mobile photo</p>
                  <p className="text-[8px] text-zinc-600 font-mono mt-1">Falls back to Desktop Photo</p>
                </div>
              )}
            </div>
            <div className="flex-grow space-y-4">
              <label className="block w-full cursor-pointer bg-zinc-900/25 border-2 border-dashed border-white/10 hover:border-white hover:bg-white/5 rounded-xl p-6 transition-all text-center">
                <input type="file" accept="image/*" className="hidden" disabled={isCompressing} onChange={(e) => handleImageUpload(e, 'homeHeroMobileImage')} />
                <UploadCloud className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  {isCompressing ? 'Uploading Mobile Photo...' : 'Upload Mobile Background Photo'}
                </p>
                <p className="text-[10px] text-zinc-550 font-mono mt-0.5 uppercase tracking-wider">Supports JPG, PNG format files (uploads directly to Supabase)</p>
              </label>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Client Delivery Photos Manager */}
        <div>
          <h2 className="text-sm font-bold font-serif text-white mb-1 uppercase tracking-widest">Client Delivery Wall of Fame</h2>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">Manage delivery celebration photos rendered in the public customer about page.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left: Add Delivery Photo Tools */}
            <div className="space-y-6">
              <div className="border border-white/5 p-6 rounded-2xl bg-zinc-900/20 shadow-lg">
                <h3 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mb-4 flex items-center font-mono">
                  <ImageIcon className="w-4 h-4 mr-2 text-zinc-400" />
                  Upload Local File
                </h3>
                <label className="block w-full cursor-pointer bg-zinc-950 border border-dashed border-white/10 hover:border-white hover:bg-white/5 rounded-xl p-6 transition-all text-center">
                  <input type="file" accept="image/*" className="hidden" disabled={isCompressing} onChange={handleDeliveryUpload} />
                  <UploadCloud className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    {isCompressing ? 'Compacting Photograph...' : 'Upload Patron Moment'}
                  </p>
                  <p className="text-[9px] text-zinc-550 font-mono mt-0.5 uppercase tracking-wider font-semibold">PNG, JPG, JPEG files (Max 2MB)</p>
                </label>
              </div>
            </div>

            {/* Right: Current Grid Preview */}
            <div className="border border-white/5 p-6 rounded-2xl bg-zinc-950/40 shadow-lg">
              <h3 className="text-[10px] font-bold text-white tracking-widest uppercase mb-4 font-mono">
                Current Delivery Gallery ({(siteConfig.clientDeliveries || []).length})
              </h3>
              
              {(!siteConfig.clientDeliveries || siteConfig.clientDeliveries.length === 0) ? (
                <div className="text-center py-10 text-zinc-600 font-mono text-[10px] uppercase tracking-wider">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
                  No delivery photos uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1">
                  {(siteConfig.clientDeliveries || []).map((img, idx) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden border border-white/5 bg-zinc-900/50 aspect-[4/3] shadow-inner">
                      <SmartImage src={img} alt={`Patron Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-zinc-950/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                        <button 
                          onClick={() => handleRemoveDelivery(idx)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-md hover:scale-105 transition-all"
                          title="Remove Photograph"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 bg-zinc-950/85 text-[8px] font-bold tracking-widest uppercase text-white px-2 py-0.5 rounded border border-white/5 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        <hr className="border-white/5" />

        {/* Instagram Reels Manager */}
        <div>
          <h2 className="text-sm font-bold font-serif text-white mb-1 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-white" /> Linked Instagram Reels Feed
          </h2>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">Link and arrange your Instagram Reels to showcase actual highlight clips on your home and inventory pages.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left: Add Reel Link */}
            <div className="space-y-6">
              <form onSubmit={handleAddReelUrl} className="border border-white/5 p-6 rounded-2xl bg-zinc-900/20 shadow-lg space-y-4">
                <h3 className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase flex items-center font-mono">
                  <LinkIcon className="w-4 h-4 mr-2 text-zinc-400" />
                  Add Instagram Reel URL
                </h3>
                <div className="text-[10px] text-zinc-500 space-y-1 font-mono uppercase bg-black/30 p-4 rounded-xl border border-white/5">
                  <p className="text-white font-bold">Supported Formats:</p>
                  <p>• https://www.instagram.com/reel/C8O7w-pS9f3/</p>
                  <p>• https://www.instagram.com/p/C3_Y2I1S_0r/</p>
                  <p className="text-zinc-650 mt-2 text-[9px] normal-case">Linked reels render as fully interactive embedded players on the live website.</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="url"
                    value={reelUrl}
                    onChange={(e) => setReelUrl(e.target.value)}
                    placeholder="https://www.instagram.com/reel/..."
                    className="flex-grow text-xs px-4 py-3 border border-white/5 bg-zinc-950 rounded-xl text-white outline-none placeholder-zinc-700/60 focus:border-white transition-all font-mono"
                  />
                  <button 
                    type="submit"
                    className="bg-white hover:bg-zinc-900 text-zinc-950 hover:text-white border border-transparent hover:border-white/20 font-bold px-4 py-3 rounded-xl text-xs uppercase tracking-widest font-mono transition-all flex items-center shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Reels List with ID extraction */}
            <div className="border border-white/5 p-6 rounded-2xl bg-zinc-950/40 shadow-lg">
              <h3 className="text-[10px] font-bold text-white tracking-widest uppercase mb-4 font-mono">
                Current Connected Reels ({(siteConfig.instagramReels || []).length})
              </h3>
              
              {(!siteConfig.instagramReels || siteConfig.instagramReels.length === 0) ? (
                <div className="text-center py-10 text-zinc-600 font-mono text-[10px] uppercase tracking-wider">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
                  No Instagram Reels linked yet.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {(siteConfig.instagramReels || []).map((url, idx) => {
                    const match = url.match(/(?:\/p\/|\/reel\/|\/tv\/)([A-Za-z0-9_-]+)/);
                    const reelId = match ? match[1] : null;
                    return (
                      <div key={idx} className="flex items-center gap-4 bg-zinc-900/30 border border-white/5 rounded-xl p-3.5 justify-between group">
                        <div className="truncate flex-grow">
                          <p className="text-[8px] font-mono font-bold text-zinc-400">REEL #{idx + 1}</p>
                          <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">{url}</p>
                          {reelId && (
                            <span className="text-[8px] uppercase tracking-wider font-bold bg-white/10 border border-white/20 text-white px-1.5 py-0.5 rounded mt-1.5 inline-block font-mono">
                              ID: {reelId}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleRemoveReel(idx)}
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                          title="Remove Reel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* 360° Studio Frame Uploader Modal */}
      <FrameUploaderModal 
        isOpen={isFrameStudioOpen} 
        onClose={() => setIsFrameStudioOpen(false)} 
        onFramesUpdated={refreshFrames}
      />
    </div>
  );
}
