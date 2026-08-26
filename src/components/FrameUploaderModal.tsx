import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Layers, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  FolderOpen, 
  FileCode, 
  Film, 
  Play, 
  Pause,
  AlertCircle,
  Video,
  Sliders,
  Image as ImageIcon,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { saveCustomFrames, loadCustomFrames, clearCustomFrames } from '../lib/frameStore';
import confetti from 'canvas-confetti';

interface FrameUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFramesUpdated?: () => void;
}

type ExtractionQuality = '1080p' | '720p';

export const FrameUploaderModal: React.FC<FrameUploaderModalProps> = ({
  isOpen,
  onClose,
  onFramesUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'images' | 'code_guide'>('video');
  const [uploadedFrames, setUploadedFrames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [extractProgress, setExtractProgress] = useState<number>(0);
  const [currentExtractFrame, setCurrentExtractFrame] = useState<{ current: number; total: number } | null>(null);
  const [liveExtractPreview, setLiveExtractPreview] = useState<string | null>(null);
  
  // Extraction settings
  const [targetFrameCount, setTargetFrameCount] = useState<number>(60);
  const [qualityPreset, setQualityPreset] = useState<ExtractionQuality>('1080p');

  const [hasCustomSaved, setHasCustomSaved] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Check if custom frames already exist
  useEffect(() => {
    if (!isOpen) return;
    loadCustomFrames().then((frames) => {
      if (frames && frames.length > 0) {
        setUploadedFrames(frames);
        setHasCustomSaved(true);
      }
    });
  }, [isOpen]);

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

  // Helper to test if a canvas is solid black or unrendered
  const isCanvasBlackOrEmpty = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    try {
      const samplePoints = [
        [0.2, 0.2], [0.5, 0.2], [0.8, 0.2],
        [0.2, 0.5], [0.5, 0.5], [0.8, 0.5],
        [0.2, 0.8], [0.5, 0.8], [0.8, 0.8]
      ];
      let totalBrightness = 0;
      for (const [sx, sy] of samplePoints) {
        const px = Math.floor(sx * width);
        const py = Math.floor(sy * height);
        const data = ctx.getImageData(px, py, 1, 1).data;
        totalBrightness += (data[0] + data[1] + data[2]) / 3;
      }
      const avgBrightness = totalBrightness / samplePoints.length;
      return avgBrightness < 6; // Below 6 is solid black / blank
    } catch {
      return false;
    }
  };

  /**
   * Automated High-Speed Video to Frames Extractor
   * Uses HTML5 Video + Offscreen Canvas to sample frames evenly across the video
   */
  const processVideoFile = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please upload a valid video file (.mp4, .mov, .webm, .m4v)');
      return;
    }

    setIsProcessing(true);
    setExtractProgress(0);
    setLiveExtractPreview(null);
    isCancelledRef.current = false;
    setProcessingStatus('Initializing video decoder & metadata...');

    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    try {
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video. Codec may be unsupported in this browser.'));
      });

      const duration = video.duration;
      if (!duration || duration <= 0 || isNaN(duration)) {
        throw new Error('Invalid video duration.');
      }

      // Warm up decoder to ensure hardware frame buffer is ready
      try {
        await video.play();
        video.pause();
      } catch {
        // Autoplay may be restricted in some browsers, proceed
      }

      setProcessingStatus(`Analyzing video (${duration.toFixed(1)}s). Detecting visual start frame...`);

      // Determine dimensions based on quality preset
      const originalWidth = video.videoWidth || 1920;
      const originalHeight = video.videoHeight || 1080;
      const aspectRatio = originalWidth / originalHeight;

      let targetWidth = 1920;
      if (qualityPreset === '720p') {
        targetWidth = 1280;
      }
      // If original is smaller, don't upscale
      if (originalWidth < targetWidth) {
        targetWidth = originalWidth;
      }
      const targetHeight = Math.round(targetWidth / aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Could not initialize 2D canvas context.');
      }

      // Helper to reliably seek video to exact timestamp and wait for GPU paint
      const seekToTime = async (timeSec: number): Promise<void> => {
        return new Promise<void>((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };

          const onSeeked = () => {
            if ('requestVideoFrameCallback' in video) {
              (video as any).requestVideoFrameCallback(() => finish());
            } else {
              requestAnimationFrame(() => finish());
            }
          };

          // If time is already within 0.005s, seeked won't fire
          if (Math.abs(video.currentTime - timeSec) < 0.005) {
            if ('requestVideoFrameCallback' in video) {
              (video as any).requestVideoFrameCallback(() => finish());
            } else {
              requestAnimationFrame(() => finish());
            }
            return;
          }

          const timeoutId = setTimeout(finish, 600);
          video.addEventListener('seeked', () => {
            clearTimeout(timeoutId);
            onSeeked();
          }, { once: true });

          try {
            video.currentTime = timeSec;
          } catch {
            finish();
          }
        });
      };

      // 1. Detect start time: skip any black intro / fade-in frames so Frame 1 is ALWAYS visible
      let visualStartTime = 0;
      const maxLeadSearch = Math.min(duration * 0.35, 2.0);
      for (let t = 0; t <= maxLeadSearch; t += 0.04) {
        await seekToTime(t);
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        if (!isCanvasBlackOrEmpty(ctx, targetWidth, targetHeight)) {
          visualStartTime = t;
          break;
        }
      }

      // 2. Detect visual end time: skip trailing black frames
      let visualEndTime = Math.max(duration - 0.04, visualStartTime + 0.1);
      const minTrailSearch = Math.max(duration - 2.0, visualStartTime + 0.5);
      for (let t = duration - 0.04; t >= minTrailSearch; t -= 0.05) {
        await seekToTime(t);
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        if (!isCanvasBlackOrEmpty(ctx, targetWidth, targetHeight)) {
          visualEndTime = t;
          break;
        }
      }

      const effectiveDuration = visualEndTime - visualStartTime;
      const totalFrames = targetFrameCount;
      const extractedDataUrls: string[] = [];

      setProcessingStatus(`Visual range: ${visualStartTime.toFixed(2)}s to ${visualEndTime.toFixed(2)}s. Extracting ${totalFrames} frames...`);

      for (let i = 0; i < totalFrames; i++) {
        if (isCancelledRef.current) {
          throw new Error('Video extraction cancelled.');
        }

        // Calculate time offset evenly across visual range
        const targetTime = totalFrames > 1 
          ? visualStartTime + (i / (totalFrames - 1)) * effectiveDuration
          : visualStartTime;

        await seekToTime(targetTime);

        // Draw frame to canvas
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Check if extracted frame is unexpectedly black, if so retry with slight offset
        if (isCanvasBlackOrEmpty(ctx, targetWidth, targetHeight) && i === 0) {
          await seekToTime(visualStartTime + 0.1);
          ctx.clearRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        }

        // Convert to WebP data URL (or fallback to JPEG)
        let frameDataUrl = canvas.toDataURL('image/webp', 0.85);
        if (!frameDataUrl.startsWith('data:image/webp')) {
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }

        extractedDataUrls.push(frameDataUrl);

        // Update progress indicators
        const progressPct = Math.round(((i + 1) / totalFrames) * 100);
        setExtractProgress(progressPct);
        setCurrentExtractFrame({ current: i + 1, total: totalFrames });
        setLiveExtractPreview(frameDataUrl);
        setProcessingStatus(`Extracted frame ${i + 1} of ${totalFrames} (${progressPct}%)...`);

        // Yield slightly to prevent UI lockup
        await new Promise((r) => setTimeout(r, 8));
      }

      setUploadedFrames(extractedDataUrls);
      setPreviewIdx(0);
      setProcessingStatus('Extraction complete! Frame 1 verified.');
      setIsProcessing(false);

    } catch (err: any) {
      console.error('Video extraction error:', err);
      alert(err.message || 'An error occurred while extracting frames from the video.');
      setIsProcessing(false);
    } finally {
      URL.revokeObjectURL(videoUrl);
      video.remove();
    }
  };

  const handleImageFiles = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setIsProcessing(true);
    setProcessingStatus('Reading and sorting image files...');

    const imageFiles = Array.from(filesList).filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles === null || imageFiles.length === 0) {
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
      if (firstFile.type.startsWith('video/')) {
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

    await saveCustomFrames(uploadedFrames);
    setHasCustomSaved(true);
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
    if (confirm('Revert the 360 Studio reveal back to the default factory 60-frame studio render?')) {
      await clearCustomFrames();
      setUploadedFrames([]);
      setHasCustomSaved(false);
      if (onFramesUpdated) onFramesUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-wide uppercase">
                  360° Sequence &amp; Video Studio
                </h3>
                {hasCustomSaved && (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                    Custom Active
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-sans">
                Upload a video to automatically extract compressed 360° scroll frames, or upload manual images.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-white/10 px-4 sm:px-6 gap-3 sm:gap-6 bg-zinc-950 overflow-x-auto">
          <button
            onClick={() => setActiveTab('video')}
            className={`py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'video' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Auto-Extract From Video</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white text-black font-bold uppercase">Optimal</span>
          </button>

          <button
            onClick={() => setActiveTab('images')}
            className={`py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'images' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload Image Sequence</span>
          </button>

          <button
            onClick={() => setActiveTab('code_guide')}
            className={`py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'code_guide' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Filesystem Guide</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-6">
          
          {/* TAB 1: AUTO EXTRACT FROM VIDEO */}
          {activeTab === 'video' && (
            <div className="space-y-6">
              
              {/* Architecture & Optimal explanation banner */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 text-xs text-zinc-300 font-sans leading-relaxed">
                <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white uppercase tracking-wider text-[11px] font-mono flex items-center gap-2">
                    <span>Why Video-to-Frames Auto Extraction is Optimal</span>
                  </div>
                  <p className="text-zinc-300 text-[11.5px]">
                    Directly scrubbing raw MP4 files on mobile web triggers heavy seek latency and frame dropping because video decoders struggle scrubbing backwards. 
                    Our client-side engine <strong>automatically slices your video into lightweight, compressed WebP frames</strong> in ~2 seconds. This delivers <strong>flawless 60 FPS forward &amp; reverse touch scrubbing</strong> with zero lag!
                  </p>
                </div>
              </div>

              {/* Extraction Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 block mb-2 font-bold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-white" />
                    <span>Target Frame Count</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
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
                        className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all border ${
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
                  <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-300 block mb-2 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                    <span>Quality &amp; Resolution</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setQualityPreset('1080p')}
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border ${
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
                      className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border ${
                        qualityPreset === '720p'
                          ? 'bg-white text-black border-white shadow-md'
                          : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      Standard HD (720p)
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Upload Drop Area */}
              {!isProcessing && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => videoInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                    dragActive
                      ? 'border-white bg-white/10 scale-[1.01]'
                      : 'border-white/15 hover:border-white/40 bg-zinc-900/40 hover:bg-zinc-900/70'
                  }`}
                >
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,video/m4v,.mov,.mp4"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processVideoFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-4">
                    <Video className="w-7 h-7" />
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white mb-1 font-sans">
                    Drop your 360° Car or Turntable Video here
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 font-sans leading-relaxed">
                    Upload an MP4, MOV, or WebM clip of the car rotating or panning. The browser will slice and compress it into {targetFrameCount} pristine WebP frames automatically!
                  </p>

                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-xs font-bold font-mono uppercase tracking-wider shadow-lg">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Video File</span>
                  </div>
                </div>
              )}

              {/* Live Extraction In-Progress Banner */}
              {isProcessing && (
                <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 text-center space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span className="font-bold text-white flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      <span>{processingStatus}</span>
                    </span>
                    <span>{extractProgress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-150 ease-out"
                      style={{ width: `${extractProgress}%` }}
                    />
                  </div>

                  {/* Live Thumbnail Extracted */}
                  {liveExtractPreview && (
                    <div className="mt-4 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-mono text-zinc-400 mb-2">Live Frame Capture Monitor:</span>
                      <div className="w-48 aspect-[16/9] rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black">
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
                    className="text-xs text-red-400 hover:text-red-300 font-mono uppercase underline pt-2"
                  >
                    Cancel Extraction
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MANUAL IMAGE SEQUENCE UPLOAD */}
          {activeTab === 'images' && (
            <div className="space-y-6">
              
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => imageInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-white bg-white/10 scale-[1.01]'
                    : 'border-white/15 hover:border-white/40 bg-zinc-900/40 hover:bg-zinc-900/70'
                }`}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageFiles(e.target.files)}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-7 h-7" />
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white mb-1 font-sans">
                  Drop individual image sequence files here
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 font-sans">
                  Upload pre-rendered 360° frames (e.g. 24, 36, 60, or 120 images in WebP, PNG, or JPG).
                </p>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-white/10 text-[11px] text-zinc-300 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Naturally sorts file names alphabetically &amp; numerically</span>
                </div>
              </div>

            </div>
          )}

          {/* Uploaded / Extracted Sequence Preview & Interactive Player */}
          {uploadedFrames.length > 0 && !isProcessing && (
            <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-xs font-bold text-white flex items-center gap-2 font-mono uppercase">
                    <span>Active Sequence: {uploadedFrames.length} Frames</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Ready to Apply
                    </span>
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                    Viewing Frame: {previewIdx + 1} / {uploadedFrames.length} ({Math.round((previewIdx / (uploadedFrames.length - 1 || 1)) * 360)}°)
                  </p>
                </div>

                {/* Preview Controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold font-mono uppercase transition-colors"
                  >
                    {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{isPlayingPreview ? 'Pause' : 'Test 360 Spin'}</span>
                  </button>
                </div>
              </div>

              {/* Main Active Frame Screen */}
              <div className="relative aspect-[16/9] sm:aspect-[21/9] bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
                <img
                  src={uploadedFrames[previewIdx]}
                  alt={`Frame ${previewIdx + 1}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono text-zinc-300">
                  Frame #{String(previewIdx + 1).padStart(4, '0')}
                </div>
              </div>

              {/* Scrub Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
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
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {uploadedFrames.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setIsPlayingPreview(false);
                      setPreviewIdx(i);
                    }}
                    className={`relative shrink-0 w-16 h-10 rounded-lg overflow-hidden border transition-all ${
                      previewIdx === i
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 text-[8px] font-mono bg-black/80 px-1 text-zinc-300">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: CODE & FILESYSTEM GUIDE */}
          {activeTab === 'code_guide' && (
            <div className="space-y-6 text-xs text-zinc-300 leading-relaxed font-sans">
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                <FolderOpen className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1 font-mono uppercase">Direct Project Directory Location</h4>
                  <p className="text-zinc-300 text-xs">
                    All default frames are stored directly inside the public assets folder of this project:
                  </p>
                  <code className="inline-block mt-2 font-mono text-white bg-black px-2.5 py-1 rounded-lg border border-white/10">
                    /public/frames/frame_0001.webp ... frame_0060.webp
                  </code>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm font-mono uppercase">How to replace frames directly in the project files:</h4>
                <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                  <li>
                    <strong className="text-zinc-200">Prepare your image sequence:</strong> Render or export your 360-degree turntable frames from Blender, Cinema4D, KeyShot, or camera burst as WebP, PNG, or JPG images.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Format file names with 4-digit padding:</strong>
                    <div className="bg-zinc-900 border border-white/10 rounded-xl p-3 font-mono text-zinc-300 mt-1.5 space-y-1">
                      <div>frame_0001.webp (0° angle)</div>
                      <div>frame_0002.webp</div>
                      <div>...</div>
                      <div>frame_0060.webp (360° complete turn)</div>
                    </div>
                  </li>
                  <li>
                    <strong className="text-zinc-200">Upload or replace in the workspace:</strong> Put them inside <span className="text-white font-mono">/public/frames/</span>.
                  </li>
                </ol>
              </div>

              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>Pro Tip: Optimal Resolution &amp; Format</span>
                </div>
                <p className="text-zinc-400 text-xs">
                  For butter-smooth 60fps scrolling and instantaneous preloading, use <strong className="text-white">WebP</strong> format at <strong className="text-white">1920×1080px</strong> or <strong className="text-white">1600×900px</strong> with 75–80% quality (under 50KB per frame).
                </p>
              </div>

            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleResetToFactory}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs border border-white/10 transition-colors font-mono uppercase"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Factory Preset (60 Frames)
            </button>

            <div className="w-full sm:w-auto flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs hover:bg-zinc-800 font-mono uppercase border border-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={uploadedFrames.length < 2 || isProcessing}
                onClick={handleApplyFrames}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none text-black font-bold text-xs shadow-lg shadow-white/20 transition-all font-mono uppercase"
              >
                <Sparkles className="w-4 h-4" />
                Apply {uploadedFrames.length > 0 ? `(${uploadedFrames.length} Frames)` : ''} to Hero Canvas
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
