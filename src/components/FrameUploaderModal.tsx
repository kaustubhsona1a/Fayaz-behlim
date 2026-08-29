import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Upload, 
  Film, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  Image as ImageIcon, 
  Sliders, 
  Play, 
  Pause, 
  Video, 
  FileCode, 
  Zap, 
  FolderOpen,
  AlertCircle,
  Laptop,
  Smartphone,
  Download,
  Database,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  saveCustomFrames, 
  loadCustomFrames, 
  clearCustomFrames, 
  DeviceTarget 
} from '../lib/frameStore';

interface FrameUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFramesUpdated?: () => void;
}

export const FrameUploaderModal: React.FC<FrameUploaderModalProps> = ({
  isOpen,
  onClose,
  onFramesUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'images' | 'zero_egress_guide'>('video');
  const [targetDevice, setTargetDevice] = useState<DeviceTarget>('desktop');
  
  const [targetFrameCount, setTargetFrameCount] = useState<number>(60);
  const [qualityPreset, setQualityPreset] = useState<'1080p' | '720p'>('1080p');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [extractProgress, setExtractProgress] = useState<number>(0);
  const [, setCurrentExtractFrame] = useState<{ current: number; total: number }>({ current: 0, total: 60 });
  const [liveExtractPreview, setLiveExtractPreview] = useState<string | null>(null);

  // Frames for the currently selected target
  const [uploadedFrames, setUploadedFrames] = useState<string[]>([]);
  const [desktopSavedCount, setDesktopSavedCount] = useState<number>(0);
  const [mobileSavedCount, setMobileSavedCount] = useState<number>(0);

  const [previewIdx, setPreviewIdx] = useState<number>(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Load status and frames for both desktop and mobile
  const refreshTargetFrames = async (target: DeviceTarget) => {
    const desktopFrames = await loadCustomFrames('desktop');
    const mobileFrames = await loadCustomFrames('mobile');
    
    setDesktopSavedCount(desktopFrames ? desktopFrames.length : 0);
    setMobileSavedCount(mobileFrames ? mobileFrames.length : 0);

    const currentFrames = target === 'mobile' ? mobileFrames : desktopFrames;
    if (currentFrames && currentFrames.length > 0) {
      setUploadedFrames(currentFrames);
    } else {
      setUploadedFrames([]);
    }
    setPreviewIdx(0);
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshTargetFrames(targetDevice);
  }, [isOpen, targetDevice]);

  // Mini animation preview player
  useEffect(() => {
    if (!isPlayingPreview || uploadedFrames.length === 0) return;
    const interval = setInterval(() => {
      setPreviewIdx((prev) => (prev + 1) % uploadedFrames.length);
    }, 1000 / 24); // 24 FPS
    return () => clearInterval(interval);
  }, [isPlayingPreview, uploadedFrames]);

  if (!isOpen) return null;

  // Natural numeric sort for image filenames (e.g. frame_1, frame_2, frame_10)
  const sortFilesNaturally = (files: File[]): File[] => {
    return [...files].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  };

  const isVideoFile = (file: File): boolean => {
    if (file.type && (file.type.startsWith('video/') || file.type.includes('mp4') || file.type.includes('quicktime') || file.type.includes('webm'))) {
      return true;
    }
    const name = (file.name || '').toLowerCase();
    return /\.(mp4|mov|webm|m4v|mkv|avi|3gp)$/i.test(name);
  };

  /**
   * Automated High-Speed Video to Frames Extractor
   * Uses HTML5 Video + Offscreen Canvas to sample frames evenly across the video
   */
  const processVideoFile = async (file: File) => {
    if (!isVideoFile(file)) {
      alert('Please upload a valid video file (.mp4, .mov, .webm, .m4v, etc.)');
      return;
    }

    setIsProcessing(true);
    setExtractProgress(0);
    setLiveExtractPreview(null);
    isCancelledRef.current = false;
    setProcessingStatus(`Loading ${targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} video into local extraction engine...`);

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    
    // Set video attributes for smooth decoding across all desktop & mobile browsers
    video.src = videoUrl;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.preload = 'auto';
    video.autoplay = false;

    // Attach off-screen to DOM temporarily so browser allocates video decode buffers
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '120px';
    video.style.height = '68px';
    video.style.opacity = '0.01';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    try {
      // Wait for video metadata to load reliably
      await new Promise<void>((resolve, reject) => {
        let loaded = false;
        const onLoaded = () => {
          if (loaded) return;
          loaded = true;
          clean();
          resolve();
        };
        const onError = () => {
          if (loaded) return;
          loaded = true;
          clean();
          reject(new Error('Failed to decode video. Please ensure the file is an H.264 / WebM / MP4 / MOV video.'));
        };
        const clean = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('loadeddata', onLoaded);
          video.removeEventListener('canplay', onLoaded);
          video.removeEventListener('error', onError);
        };

        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('loadeddata', onLoaded);
        video.addEventListener('canplay', onLoaded);
        video.addEventListener('error', onError);

        video.load();

        if (video.readyState >= 1 && video.duration > 0) {
          onLoaded();
        }

        setTimeout(() => {
          if (video.readyState >= 1 || video.duration > 0) {
            onLoaded();
          } else {
            onError();
          }
        }, 10000);
      });

      const duration = video.duration;
      if (!duration || duration <= 0 || isNaN(duration)) {
        throw new Error('Could not determine video duration.');
      }

      setProcessingStatus(`Video ready (${duration.toFixed(1)}s). Slicing ${targetFrameCount} ${targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} frames...`);

      // Determine dimensions based on quality preset and target device orientation
      const originalWidth = video.videoWidth || (targetDevice === 'mobile' ? 1080 : 1920);
      const originalHeight = video.videoHeight || (targetDevice === 'mobile' ? 1920 : 1080);
      const aspectRatio = originalWidth / (originalHeight || 1);

      let targetWidth = 1920;
      if (qualityPreset === '720p') {
        targetWidth = 1280;
      }
      if (targetDevice === 'mobile' && aspectRatio < 1) {
        // Portrait mobile video
        targetWidth = qualityPreset === '720p' ? 720 : 1080;
      }
      if (originalWidth < targetWidth) {
        targetWidth = originalWidth;
      }
      const targetHeight = Math.max(100, Math.round(targetWidth / (aspectRatio || 1)));

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Could not initialize 2D canvas rendering context.');
      }

      const totalFrames = targetFrameCount;
      const extractedDataUrls: string[] = [];

      const captureCanvas = (): string => {
        try {
          const webp = canvas.toDataURL('image/webp', 0.82);
          if (webp && webp.startsWith('data:image/webp')) {
            return webp;
          }
        } catch {
          // fallback
        }
        return canvas.toDataURL('image/jpeg', 0.85);
      };

      const seekToTime = async (timeSec: number): Promise<void> => {
        return new Promise<void>((resolve) => {
          let isDone = false;
          const finish = () => {
            if (isDone) return;
            isDone = true;
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('timeupdate', onSeeked);
            video.removeEventListener('error', finish);
            resolve();
          };

          const onSeeked = () => {
            setTimeout(finish, 20);
          };

          const safetyTimer = setTimeout(finish, 350);

          video.addEventListener('seeked', onSeeked, { once: true });
          video.addEventListener('timeupdate', onSeeked, { once: true });
          video.addEventListener('error', finish, { once: true });

          try {
            const clamped = Math.max(0, Math.min(timeSec, Math.max(0, duration - 0.02)));
            if (Math.abs(video.currentTime - clamped) < 0.005) {
              clearTimeout(safetyTimer);
              onSeeked();
            } else {
              video.currentTime = clamped;
            }
          } catch {
            clearTimeout(safetyTimer);
            finish();
          }
        });
      };

      // Extract frames evenly across entire video duration
      for (let i = 0; i < totalFrames; i++) {
        if (isCancelledRef.current) {
          throw new Error('Video frame extraction cancelled.');
        }

        const targetTime = totalFrames > 1 
          ? (i / (totalFrames - 1)) * Math.max(0, duration - 0.02)
          : 0;

        await seekToTime(targetTime);

        // Draw video frame to offscreen canvas
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        try {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        } catch (drawErr) {
          console.warn('Canvas draw warning:', drawErr);
        }

        const frameDataUrl = captureCanvas();
        extractedDataUrls.push(frameDataUrl);

        // Update progress indicators
        const progressPct = Math.round(((i + 1) / totalFrames) * 100);
        setExtractProgress(progressPct);
        setCurrentExtractFrame({ current: i + 1, total: totalFrames });
        setLiveExtractPreview(frameDataUrl);
        setProcessingStatus(`Extracted frame ${i + 1} of ${totalFrames} (${progressPct}%)...`);

        // Yield slightly for responsive UI updates
        await new Promise((r) => setTimeout(r, 6));
      }

      setUploadedFrames(extractedDataUrls);
      setPreviewIdx(0);
      setProcessingStatus(`Extracted ${extractedDataUrls.length} ${targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} frames! Ready to apply.`);
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Video extraction error:', err);
      alert(err.message || 'An error occurred while extracting frames from the video.');
      setIsProcessing(false);
    } finally {
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
      URL.revokeObjectURL(videoUrl);
    }
  };

  const handleImageFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus(`Reading and sorting ${targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} image sequence...`);

    const imageFiles = Array.from(filesList).filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      alert('Please select valid image files (.webp, .png, .jpg, .jpeg, .avif)');
      setIsProcessing(false);
      return;
    }

    const sortedFiles = sortFilesNaturally(imageFiles);
    const readPromises = sortedFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    const dataUrls = await Promise.all(readPromises);
    setUploadedFrames(dataUrls);
    setPreviewIdx(0);
    setIsProcessing(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const firstFile = e.dataTransfer.files[0];
      if (isVideoFile(firstFile)) {
        setActiveTab('video');
        processVideoFile(firstFile);
      } else {
        setActiveTab('images');
        handleImageFiles(e.dataTransfer.files);
      }
    }
  };

  const handleApplyFrames = async () => {
    if (uploadedFrames.length < 2) {
      alert('Please extract or upload at least 2 or more sequential frames for a 360 animation.');
      return;
    }

    await saveCustomFrames(uploadedFrames, targetDevice);
    if (targetDevice === 'mobile') {
      setMobileSavedCount(uploadedFrames.length);
    } else {
      setDesktopSavedCount(uploadedFrames.length);
    }

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    if (onFramesUpdated) onFramesUpdated();
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleResetToFactory = async () => {
    const targetLabel = targetDevice === 'mobile' ? 'Mobile' : 'Desktop';
    if (confirm(`Reset the ${targetLabel} 360 sequence back to default preset?`)) {
      await clearCustomFrames(targetDevice);
      await refreshTargetFrames(targetDevice);
      if (onFramesUpdated) onFramesUpdated();
    }
  };

  const handleExportFramePack = () => {
    if (uploadedFrames.length === 0) {
      alert('No frames available to export. Please extract or upload frames first.');
      return;
    }

    setIsExporting(true);
    try {
      // Export as a lightweight manifest JSON that contains all frame Data URLs
      const data = {
        name: `cyr_360_${targetDevice}_sequence`,
        target: targetDevice,
        totalFrames: uploadedFrames.length,
        exportedAt: new Date().toISOString(),
        note: 'Place frames inside /public/frames/ or /public/frames_mobile/ for zero-egress static builds',
        frames: uploadedFrames
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cyr-360-frames-${targetDevice}-${uploadedFrames.length}-pack.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export frame package.');
    } finally {
      setIsExporting(false);
    }
  };

  const isCurrentTargetCustom = targetDevice === 'mobile' ? mobileSavedCount > 0 : desktopSavedCount > 0;

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 overflow-hidden touch-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 999999
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      
      <div 
        className="relative w-full h-[100dvh] sm:h-auto sm:max-w-4xl max-h-[100dvh] sm:max-h-[92vh] bg-zinc-950 border-0 sm:border sm:border-white/20 rounded-none sm:rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] flex flex-col text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/95 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Film className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-base font-bold text-white font-serif tracking-wide uppercase truncate">
                  360° Studio &amp; Video Extractor
                </h3>
                {isCurrentTargetCustom && (
                  <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase shrink-0">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-sans truncate">
                Configure separate 360 video sequences for Laptop and Mobile.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-colors shrink-0 ml-2 touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Device Target Switcher Bar (Desktop vs Mobile) */}
        <div className="px-3 sm:px-6 py-2 bg-zinc-900/60 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 uppercase">
            <span>Target Screen:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setTargetDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] sm:text-xs font-mono font-bold transition-all ${
                targetDevice === 'desktop'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Laptop / Desktop (16:9)</span>
              {desktopSavedCount > 0 && (
                <span className="text-[8px] px-1 rounded bg-black/20 text-black font-bold">
                  {desktopSavedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTargetDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10.5px] sm:text-xs font-mono font-bold transition-all ${
                targetDevice === 'mobile'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone</span>
              {mobileSavedCount > 0 ? (
                <span className="text-[8px] px-1 rounded bg-black/20 text-black font-bold">
                  {mobileSavedCount}
                </span>
              ) : (
                <span className="text-[8px] px-1 rounded bg-white/10 text-zinc-400 font-normal">
                  Auto
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-3 sm:px-6 gap-2 sm:gap-6 bg-zinc-950 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('video')}
            className={`py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'video' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Extractor</span>
            <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-white text-black font-bold uppercase">Optimal</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'images' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image Sequence</span>
          </button>

          <button
            onClick={() => setActiveTab('zero_egress_guide')}
            className={`py-2.5 sm:py-3 text-[11px] sm:text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 sm:gap-2 ${
              activeTab === 'zero_egress_guide' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Egress Build Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto min-h-0 p-3 sm:p-5 flex-1 space-y-3.5 sm:space-y-5 overscroll-contain">
          
          {/* TAB 1: AUTO EXTRACT FROM VIDEO */}
          {activeTab === 'video' && (
            <div className="space-y-3.5 sm:space-y-5">
              
              {/* Architecture & Optimal explanation banner */}
              <div className="p-3 sm:p-4 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5 text-xs text-zinc-300 font-sans leading-relaxed">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white uppercase tracking-wider text-[10px] sm:text-[11px] font-mono flex items-center gap-2">
                    <span>{targetDevice === 'mobile' ? 'Mobile Phone (Portrait / 9:16)' : 'Laptop / Desktop (16:9)'} Video Slicer</span>
                  </div>
                  <p className="text-zinc-300 text-[10.5px] sm:text-[11.5px] leading-relaxed">
                    Processes your video in-browser into lightweight WebP frames for <strong>60 FPS touch scrubbing</strong> with zero Supabase egress cache cost.
                  </p>
                </div>
              </div>

              {/* Extraction Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-zinc-900/60 border border-white/5">
                <div>
                  <label className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-300 block mb-1.5 font-bold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-white" />
                    <span>Target Frame Count</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { count: 36, label: '36' },
                      { count: 60, label: '60 (Best)' },
                      { count: 90, label: '90' },
                      { count: 120, label: '120' }
                    ].map((opt) => (
                      <button
                        key={opt.count}
                        type="button"
                        onClick={() => setTargetFrameCount(opt.count)}
                        className={`py-2 px-1 rounded-lg text-[10.5px] sm:text-xs font-mono font-bold transition-all border ${
                          targetFrameCount === opt.count
                            ? 'bg-white text-black border-white shadow-md'
                            : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-300 block mb-1.5 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span>Quality &amp; Resolution</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQualityPreset('1080p')}
                      className={`py-2 px-2 rounded-lg text-[10.5px] sm:text-xs font-mono font-bold transition-all border ${
                        qualityPreset === '1080p'
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Full HD (1080p)
                    </button>
                    <button
                      type="button"
                      onClick={() => setQualityPreset('720p')}
                      className={`py-2 px-2 rounded-lg text-[10.5px] sm:text-xs font-mono font-bold transition-all border ${
                        qualityPreset === '720p'
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Fast HD (720p)
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Upload Drop Area */}
              {!isProcessing && (
                <label
                  htmlFor="video-frame-file-input"
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`block border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-white bg-white/10 scale-[1.01]'
                      : 'border-white/15 hover:border-white/40 bg-zinc-900/40 hover:bg-zinc-900/70'
                  }`}
                >
                  <input
                    id="video-frame-file-input"
                    ref={videoInputRef}
                    type="file"
                    accept="video/*,.mp4,.mov,.webm,.m4v,.mkv,.avi"
                    onClick={(e) => {
                      (e.currentTarget as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processVideoFile(e.target.files[0]);
                      }
                    }}
                    className="sr-only"
                  />

                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-2 sm:mb-3">
                    <Video className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <h4 className="text-xs sm:text-base font-bold text-white mb-1 font-sans">
                    Tap to Choose {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Video File
                  </h4>
                  <p className="text-[10.5px] sm:text-xs text-zinc-400 max-w-md mx-auto mb-3 font-sans leading-relaxed">
                    Select {targetDevice === 'mobile' ? 'portrait or standard' : 'horizontal'} MP4, MOV, or WebM video. Automatically sliced into {targetFrameCount} frames.
                  </p>

                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-black text-[10.5px] sm:text-xs font-bold font-mono uppercase tracking-wider shadow-lg pointer-events-none">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Video</span>
                  </div>
                </label>
              )}

              {/* Live Extraction In-Progress Banner */}
              {isProcessing && (
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-white/10 text-center space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span className="font-bold text-white flex items-center gap-2 truncate pr-2 text-[11px] sm:text-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="truncate">{processingStatus}</span>
                    </span>
                    <span className="shrink-0 font-bold">{extractProgress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${extractProgress}%` }}
                    />
                  </div>

                  {/* Live Thumbnail Extracted */}
                  {liveExtractPreview && (
                    <div className="mt-2 flex flex-col items-center justify-center">
                      <span className="text-[9px] uppercase font-mono text-zinc-400 mb-1">Live Capture Monitor:</span>
                      <div className="w-36 sm:w-44 aspect-video rounded-lg overflow-hidden border border-white/20 shadow-xl bg-black">
                        <img src={liveExtractPreview} alt="Live frame" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      isCancelledRef.current = true;
                      setIsProcessing(false);
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 font-mono uppercase underline pt-1"
                  >
                    Cancel Extraction
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MANUAL IMAGE SEQUENCE UPLOAD */}
          {activeTab === 'images' && (
            <div className="space-y-3.5 sm:space-y-5">
              
              <label
                htmlFor="image-sequence-file-input"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`block border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-white bg-white/10 scale-[1.01]'
                    : 'border-white/15 hover:border-white/40 bg-zinc-900/40 hover:bg-zinc-900/70'
                }`}
              >
                <input
                  id="image-sequence-file-input"
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*,.webp,.png,.jpg,.jpeg,.avif"
                  onClick={(e) => {
                    (e.currentTarget as HTMLInputElement).value = '';
                  }}
                  onChange={(e) => handleImageFiles(e.target.files)}
                  className="sr-only"
                />

                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-2 sm:mb-3">
                  <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <h4 className="text-xs sm:text-base font-bold text-white mb-1 font-sans">
                  Tap to Select {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Image Frames
                </h4>
                <p className="text-[10.5px] sm:text-xs text-zinc-400 max-w-md mx-auto mb-3 font-sans">
                  Upload individual sequential frames (e.g. 24, 36, 60, or 120 WebP/PNG/JPG images).
                </p>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 font-mono pointer-events-none">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-sorted alphabetically &amp; numerically</span>
                </div>
              </label>

            </div>
          )}

          {/* TAB 3: ZERO-EGRESS DIRECT BUILD GUIDE & EXPORT */}
          {activeTab === 'zero_egress_guide' && (
            <div className="space-y-3.5 sm:space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 sm:p-4 flex items-start gap-2.5">
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-400 text-xs sm:text-sm mb-1 font-mono uppercase">
                    Zero Supabase Egress Guarantee
                  </h4>
                  <p className="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
                    When high-res videos or frame sequences are loaded directly from the project's static bundle (or IndexedDB offline storage), <strong>no Supabase egress bandwidth is consumed</strong> ($0 egress cost, unlimited visitors).
                  </p>
                </div>
              </div>

              {/* Direct Filesystem Paths */}
              <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 sm:p-4 space-y-2.5">
                <h4 className="font-bold text-white text-xs font-mono uppercase flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-white" />
                  <span>In-Build Static File Locations:</span>
                </h4>
                <div className="space-y-1.5 font-mono text-[10.5px]">
                  <div className="p-2 bg-black rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">Desktop 360 Frames:</span>
                    <code className="text-emerald-400">/public/frames/frame_0001.webp ... frame_0060.webp</code>
                  </div>
                  <div className="p-2 bg-black rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">Mobile 360 Frames:</span>
                    <code className="text-emerald-400">/public/frames_mobile/frame_0001.webp ...</code>
                  </div>
                  <div className="p-2 bg-black rounded border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-zinc-300">Local Hero Videos:</span>
                    <code className="text-emerald-400">/public/videos/hero-desktop.mp4 &amp; hero-mobile.mp4</code>
                  </div>
                </div>
              </div>

              {/* 1-Click Export Frame Pack */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-xs font-mono uppercase mb-0.5">
                    Export Sliced Frame Pack
                  </h4>
                  <p className="text-zinc-400 text-[10.5px]">
                    Download current {uploadedFrames.length} {targetDevice} frames as an asset pack for direct build insertion.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportFramePack}
                  disabled={uploadedFrames.length === 0 || isExporting}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white text-black font-bold font-mono text-[11px] uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Frames Pack</span>
                </button>
              </div>

            </div>
          )}

          {/* Uploaded / Extracted Sequence Preview & Interactive Player */}
          {uploadedFrames.length > 0 && !isProcessing && (
            <div className="bg-zinc-900/90 border border-white/10 rounded-xl p-3 sm:p-4 space-y-3 shadow-xl">
              
              <div className="flex flex-row items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div>
                  <span className="text-[11px] sm:text-xs font-bold text-white flex items-center gap-1.5 font-mono uppercase">
                    <span>{uploadedFrames.length} {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Frames</span>
                    <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      Ready
                    </span>
                  </span>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                    Frame {previewIdx + 1}/{uploadedFrames.length} ({Math.round((previewIdx / (uploadedFrames.length - 1 || 1)) * 360)}°)
                  </p>
                </div>

                {/* Preview Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-[10px] sm:text-xs font-bold font-mono uppercase transition-colors"
                  >
                    {isPlayingPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingPreview ? 'Pause' : 'Test Spin'}</span>
                  </button>
                </div>
              </div>

              {/* Main Active Frame Screen */}
              <div className={`relative ${targetDevice === 'mobile' ? 'aspect-[4/3] sm:aspect-video max-h-[220px]' : 'aspect-video max-h-[240px]'} bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center mx-auto w-full`}>
                <img
                  src={uploadedFrames[previewIdx]}
                  alt={`Frame ${previewIdx + 1}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[9px] font-mono text-zinc-300">
                  Frame #{String(previewIdx + 1).padStart(4, '0')} ({targetDevice})
                </div>
              </div>

              {/* Scrub Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Scrub 360 Sequence</span>
                  <span>{Math.round(((previewIdx + 1) / uploadedFrames.length) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={uploadedFrames.length - 1}
                  value={previewIdx}
                  onChange={(e) => {
                    setIsPlayingPreview(false);
                    setPreviewIdx(Number(e.target.value));
                  }}
                  className="w-full accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Filmstrip Thumbnails */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                {uploadedFrames.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setIsPlayingPreview(false);
                      setPreviewIdx(i);
                    }}
                    className={`relative shrink-0 w-12 h-8 sm:w-14 sm:h-9 rounded overflow-hidden border transition-all ${
                      previewIdx === i
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 text-[7px] font-mono bg-black/80 px-1 text-zinc-300">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* Pinned Action Buttons Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-900/95 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleResetToFactory}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10.5px] sm:text-xs border border-white/10 transition-colors font-mono uppercase"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Preset</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-lg bg-zinc-900 text-zinc-300 text-[10.5px] sm:text-xs hover:bg-zinc-800 font-mono uppercase border border-white/10 text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={uploadedFrames.length < 2 || isProcessing}
              onClick={handleApplyFrames}
              className="flex-[2] sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 disabled:pointer-events-none text-black font-bold text-[10.5px] sm:text-xs shadow-lg transition-all font-mono uppercase text-center"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Apply to {targetDevice === 'mobile' ? 'Mobile' : 'Desktop'} Hero</span>
            </button>
          </div>
        </div>

      </div>

    </div>,
    document.body
  );
};
