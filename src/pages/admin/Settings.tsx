import React, { useState, useEffect, useRef } from 'react';
import { useVehicles, sanitizeHeroImage } from '../../context/VehicleContext';
import { 
  UploadCloud, 
  Trash2, 
  Plus, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Check, 
  RotateCw, 
  Play, 
  Pause, 
  Compass, 
  Layers, 
  Sparkles, 
  Database, 
  Copy, 
  ChevronDown, 
  ChevronUp,
  Laptop,
  Smartphone,
  Video,
  Zap,
  FolderOpen,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { uploadImageToStorage, cleanupLegacyImageVariants, supabase } from '../../lib/supabase';
import { SmartImage } from '../../components/SmartImage';

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

  // 360 Turntable Frame Sequence State (In-Build Preset Preview)
  const [activePreviewTarget, setActivePreviewTarget] = useState<'desktop' | 'mobile'>('desktop');
  const [dealerPreviewIdx, setDealerPreviewIdx] = useState(0);
  const [isDealerAutoSpinning, setIsDealerAutoSpinning] = useState(false);

  const totalTurntableFrames = 96;

  // Dealer Turntable Auto Spin Player
  useEffect(() => {
    if (!isDealerAutoSpinning) return;
    const interval = setInterval(() => {
      setDealerPreviewIdx((prev) => (prev + 1) % totalTurntableFrames);
    }, 1000 / 18);
    return () => clearInterval(interval);
  }, [isDealerAutoSpinning, totalTurntableFrames]);

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
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [customAboutUrl, setCustomAboutUrl] = useState('');
  const [customHeroVideoUrl, setCustomHeroVideoUrl] = useState('');
  const [customHeroMobileVideoUrl, setCustomHeroMobileVideoUrl] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: 'aboutImage' | 'homeHeroVideo' | 'homeHeroMobileVideo' | 'homeHeroImage' | 'homeHeroMobileImage') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressing(true);
      setErrorText('');
      try {
        const subPath = 'site_settings';
        const publicUrl = await uploadImageToStorage(file, subPath, 'site_settings');
        
        updateSiteConfig({ [key]: publicUrl });
        const labels: Record<string, string> = {
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

  const handleSaveUrl = (key: 'logo' | 'aboutImage' | 'homeHeroVideo' | 'homeHeroMobileVideo', url: string) => {
    if (url.trim()) {
      updateSiteConfig({ [key]: url.trim() });
      const labels: Record<string, string> = {
        logo: 'Logo Path',
        homeHeroVideo: 'Hero Video URL',
        homeHeroMobileVideo: 'Hero Mobile Video URL',
        aboutImage: 'About Image URL'
      };
      const labelText = labels[key] || 'Asset URL';
      setSuccess(`${labelText} updated successfully!`);
      setTimeout(() => setSuccess(''), 3000);
      if (key === 'logo') setCustomLogoUrl('');
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
        
        {/* 360° Showroom Turntable & Build Assets (Direct Build Architecture) */}
        <div className="border-l-2 border-white pl-3 sm:pl-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 sm:mb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs sm:text-sm font-serif font-bold text-white uppercase tracking-widest">360° Showcase Turntable</h2>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  Direct In-Build Asset (96 Frames)
                </span>
                <span className="text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border bg-white/10 text-white border-white/20">
                  $0 Supabase Egress
                </span>
              </div>
            </div>
          </div>
          <p className="text-zinc-400 text-[10px] uppercase font-mono tracking-wider mb-4 sm:mb-6">
            Pre-bundled WebP 360° turntable sequence located at <code className="text-emerald-400">/public/frames/desktop/</code> and <code className="text-emerald-400">/public/frames/mobile/</code> (96 Frames). Served directly from the high-speed edge CDN with zero database costs.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-black/40 p-3.5 sm:p-5 rounded-2xl border border-white/5">
            {/* Turntable Interactive Preview Window */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              
              {/* Target Switcher for preview */}
              <div className="flex items-center justify-between gap-2 bg-zinc-900/60 p-1.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreviewTarget('desktop');
                      setDealerPreviewIdx(0);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      activePreviewTarget === 'desktop'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3 h-3" />
                    <span>Desktop Showcase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePreviewTarget('mobile');
                      setDealerPreviewIdx(0);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      activePreviewTarget === 'mobile'
                        ? 'bg-white text-black shadow'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Mobile Showcase</span>
                  </button>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 pr-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Build-Linked (96 Frames)</span>
                </span>
              </div>

              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-zinc-900/60 border border-white/10 flex items-center justify-center shadow-inner">
                <img 
                  src={`/frames/${activePreviewTarget}/frame_${String(dealerPreviewIdx + 1).padStart(4, '0')}.webp`}
                  alt={`Preset Frame ${dealerPreviewIdx + 1}`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = `/frames/desktop/frame_${String(dealerPreviewIdx + 1).padStart(4, '0')}.webp`;
                  }}
                  className="w-full h-full object-cover select-none"
                />

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

            {/* Right details & Direct Build Guide */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 text-xs font-mono">
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct In-Build Architecture</span>
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
                    360° rotation images and background videos reside directly in the build filesystem. This keeps dynamic Supabase database quotas reserved solely for active vehicle inventory and customer leads.
                  </p>
                  <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 text-[10px] font-mono text-zinc-300 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <FileCode className="w-3 h-3" />
                      <span className="font-bold">Build File Directory:</span>
                    </div>
                    <p className="text-zinc-400 break-all">/public/frames/desktop/ (96 frames) &amp; /public/frames/mobile/ (96 frames)</p>
                  </div>
                  <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-white/10 bg-black/50">
                    <img 
                      src="/frames/desktop/frame_0001.webp" 
                      alt="Permanent Background Preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.src = '/frames/desktop/frame_0001.webp';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Home Hero Video (Desktop / Laptop) - In-Build Asset */}
        <div className="border-l-2 border-white pl-4">
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-widest">Home Page Hero Video (Desktop / Laptop 16:9)</h2>
            <span className="bg-white/10 text-white text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-white/15">Desktop</span>
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-emerald-500/30">Direct In-Build Asset</span>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">
            Directly bundled horizontal video at <code className="text-emerald-400">/public/videos/hero-laptop.mp4</code> or <code className="text-emerald-400">/public/videos/hero-desktop.mp4</code>.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-56 aspect-video overflow-hidden rounded-xl border border-white/10 bg-zinc-900/30 shrink-0 relative shadow-sm flex items-center justify-center">
              {siteConfig.homeHeroVideo ? (
                <video src={siteConfig.homeHeroVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Video className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-400 font-mono uppercase">Interactive 360 Turntable Active</p>
                </div>
              )}
            </div>
            <div className="flex-grow space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="/videos/hero-laptop.mp4"
                  value={customHeroVideoUrl || siteConfig.homeHeroVideo || ''}
                  onChange={(e) => setCustomHeroVideoUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => handleSaveUrl('homeHeroVideo', customHeroVideoUrl)}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-black font-bold text-xs font-mono uppercase rounded-xl hover:bg-zinc-200"
                >
                  Save Path
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSiteConfig({ homeHeroVideo: '/videos/hero-laptop.mp4' });
                    setSuccess('Set to local in-build video (/videos/hero-laptop.mp4).');
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10.5px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Use /videos/hero-laptop.mp4</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSiteConfig({ homeHeroVideo: '/videos/hero-desktop.mp4' });
                    setSuccess('Set to local in-build video (/videos/hero-desktop.mp4).');
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10.5px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Use /videos/hero-desktop.mp4</span>
                </button>
                {siteConfig.homeHeroVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSiteConfig({ homeHeroVideo: '' });
                      setSuccess('Cleared video. Defaulting to interactive 360 turntable.');
                      setTimeout(() => setSuccess(''), 4000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 text-[10.5px] font-mono"
                  >
                    Use 360 Turntable Instead
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Home Hero Video (Mobile Phone) - In-Build Asset */}
        <div className="border-l-2 border-white pl-4">
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-widest">Home Page Hero Video (Mobile Phone 9:16 / Portrait)</h2>
            <span className="bg-white/10 text-white text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-white/15">Mobile</span>
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-emerald-500/30">Direct In-Build Asset</span>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">
            Directly bundled vertical video at <code className="text-emerald-400">/public/videos/hero-mobile.mp4</code>.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-56 h-44 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/30 shrink-0 relative shadow-sm flex items-center justify-center">
              {siteConfig.homeHeroMobileVideo ? (
                <video src={siteConfig.homeHeroMobileVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Smartphone className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                  <p className="text-[10px] text-zinc-400 font-mono uppercase">
                    {siteConfig.homeHeroVideo ? 'Using Desktop Video Fallback' : 'Interactive 360 Turntable Active'}
                  </p>
                </div>
              )}
            </div>
            <div className="flex-grow space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="/videos/hero-mobile.mp4"
                  value={customHeroMobileVideoUrl || siteConfig.homeHeroMobileVideo || ''}
                  onChange={(e) => setCustomHeroMobileVideoUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => handleSaveUrl('homeHeroMobileVideo', customHeroMobileVideoUrl)}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-black font-bold text-xs font-mono uppercase rounded-xl hover:bg-zinc-200"
                >
                  Save Path
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSiteConfig({ homeHeroMobileVideo: '/videos/hero-mobile.mp4' });
                    setSuccess('Set to local in-build mobile video (/videos/hero-mobile.mp4).');
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10.5px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Use Local In-Build Mobile Video (/videos/hero-mobile.mp4)</span>
                </button>
                {siteConfig.homeHeroMobileVideo && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSiteConfig({ homeHeroMobileVideo: '' });
                      setSuccess('Cleared mobile video. Defaulting to interactive 360 turntable.');
                      setTimeout(() => setSuccess(''), 4000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 text-[10.5px] font-mono"
                  >
                    Use 360 Turntable Instead
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Logo Section (Direct In-Build Asset) */}
        <div className="border-l-2 border-white pl-4">
          <div className="flex items-center space-x-2 mb-1">
            <h2 className="text-sm font-bold font-serif text-white uppercase tracking-widest">Showroom Brand Logo</h2>
            <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold font-mono px-2 py-0.5 rounded tracking-wider uppercase border border-emerald-500/30">Direct In-Build Asset</span>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-6">
            Logo file bundled directly in the build at <code className="text-emerald-400">/public/logo.svg</code> or <code className="text-emerald-400">/public/logo.png</code>. Displayed across the front-end navigation bar and footer.
          </p>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6">
            <div className="w-56 h-28 overflow-hidden rounded-xl border border-white/10 flex items-center justify-center p-4 bg-zinc-900/40 shrink-0 shadow-inner">
              <img src={siteConfig.logo || '/logo.svg'} alt="Logo Preview" className="max-h-16 max-w-full object-contain" />
            </div>
            <div className="flex-grow space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="/logo.svg or /logo.png"
                  value={customLogoUrl || siteConfig.logo || ''}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => handleSaveUrl('logo', customLogoUrl)}
                  className="w-full sm:w-auto px-4 py-2 bg-white text-black font-bold text-xs font-mono uppercase rounded-xl hover:bg-zinc-200"
                >
                  Save Path
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    updateSiteConfig({ logo: '/logo.svg' });
                    setSuccess('Logo set to in-build vector SVG (/logo.svg).');
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10.5px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Use Local In-Build SVG (/logo.svg)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateSiteConfig({ logo: '/logo.png' });
                    setSuccess('Logo set to in-build PNG (/logo.png).');
                    setTimeout(() => setSuccess(''), 4000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10.5px] font-mono text-zinc-300 hover:text-white flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3 h-3 text-emerald-400" />
                  <span>Use Local In-Build PNG (/logo.png)</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[10.5px] font-mono text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>In-Build Zero Egress:</span>
                </div>
                <p>Place your vector logo (<code className="text-white">logo.svg</code>) or transparent PNG (<code className="text-white">logo.png</code>) directly into <code className="text-emerald-400">/public/</code>.</p>
              </div>
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
    </div>
  );
}

