import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  RotateCw, 
  Sparkles, 
  ArrowRight, 
  Compass, 
  Upload,
  MoveHorizontal
} from 'lucide-react';
import { loadCustomFrames, getFirstFrameUrl, clearCustomFrames } from '../lib/frameStore';
import { useVehicles } from '../context/VehicleContext';

interface HeroCanvasScrubProps {
  onExploreClick: () => void;
  onOpenFrameStudio?: () => void;
  showDealerControls?: boolean;
}

const DEFAULT_TOTAL_FRAMES = 96;

export const HeroCanvasScrub: React.FC<HeroCanvasScrubProps> = ({ 
  onExploreClick,
  onOpenFrameStudio,
  showDealerControls = false
}) => {
  const navigate = useNavigate();
  const { siteConfig } = useVehicles();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Direct DOM Refs for rigid, zero-stutter performance (no React re-renders during scroll)
  const phase1Ref = useRef<HTMLDivElement>(null);
  const phase4Ref = useRef<HTMLDivElement>(null);
  const hudBearingRef = useRef<HTMLSpanElement>(null);
  const hudFrameRef = useRef<HTMLSpanElement>(null);
  const scrubSliderRef = useRef<HTMLInputElement>(null);
  const scrubPercentRef = useRef<HTMLSpanElement>(null);
  const dragHintRef = useRef<HTMLDivElement>(null);

  // Target scroll progress ref (0 to 1)
  const targetProgressRef = useRef<number>(0);

  // Determine initial viewport device category
  const getDeviceCategory = () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop');

  // Loading & Mode State
  const initialDevice = getDeviceCategory();
  const [firstFrameSrc, setFirstFrameSrc] = useState<string>(`/frames/${initialDevice}/frame_0001.webp`);
  const [totalFrames, setTotalFrames] = useState(DEFAULT_TOTAL_FRAMES);
  const [isCustomSequence, setIsCustomSequence] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Frame assets & animation physics refs
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const firstFrameImgRef = useRef<HTMLImageElement | null>(null);
  const currentFrameRef = useRef<number>(0);
  const targetFrameRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isInteractingRef = useRef<boolean>(false);
  const hasInteractedRef = useRef<boolean>(false);
  const currentDeviceRef = useRef<'desktop' | 'mobile'>(initialDevice);

  // Drag physics tracking
  const pointerStartXRef = useRef<number>(0);
  const pointerStartFrameRef = useRef<number>(0);
  const lastPointerXRef = useRef<number>(0);
  const lastPointerTimeRef = useRef<number>(0);

  // 2. High-Performance Single-Frame Drawing (Zero Ghosting / Zero Multi-Frame Overlays)
  const drawInterpolatedFrame = useCallback((frameFloat: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const images = imagesRef.current;
    const numFrames = images.length;

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    // Solid dark showroom background fill to guarantee zero underlying image bleeding
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, cw, ch);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    const drawAspectCover = (img: HTMLImageElement): boolean => {
      if (!img || !img.complete || img.naturalWidth === 0) return false;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = cw / ch;

      let dw = cw;
      let dh = ch;
      let dx = 0;
      let dy = 0;

      // On portrait mobile viewports, fit to width so the entire car is visible and not cropped
      if (canvasAspect < 1.0) {
        dw = cw;
        dh = cw / imgAspect;
        dx = 0;
        dy = (ch - dh) / 2;
      } else if (canvasAspect > imgAspect) {
        dw = cw;
        dh = cw / imgAspect;
        dx = 0;
        dy = (ch - dh) / 2;
      } else {
        dh = ch;
        dw = ch * imgAspect;
        dx = (cw - dw) / 2;
        dy = 0;
      }

      ctx.globalAlpha = 1.0;
      ctx.drawImage(img, dx, dy, dw, dh);
      return true;
    };

    if (numFrames > 0) {
      let wrapped = frameFloat % numFrames;
      if (wrapped < 0) wrapped += numFrames;

      // Lock to exactly ONE single discrete frame index (closest frame) to ensure crisp, single-image rendering
      const exactIndex = Math.min(numFrames - 1, Math.max(0, Math.round(wrapped)));
      const activeImg = images[exactIndex];

      let rendered = false;
      if (activeImg && activeImg.complete && activeImg.naturalWidth > 0) {
        rendered = drawAspectCover(activeImg);
      }

      // Safe fallback if target frame is still decoding
      if (!rendered) {
        if (firstFrameImgRef.current && firstFrameImgRef.current.complete && firstFrameImgRef.current.naturalWidth > 0) {
          drawAspectCover(firstFrameImgRef.current);
        } else if (images[0] && images[0].complete && images[0].naturalWidth > 0) {
          drawAspectCover(images[0]);
        }
      }
    } else if (firstFrameImgRef.current && firstFrameImgRef.current.complete && firstFrameImgRef.current.naturalWidth > 0) {
      drawAspectCover(firstFrameImgRef.current);
    }
  }, []);

  // Synchronous preloader for first frame
  useEffect(() => {
    const f1 = new Image();
    f1.src = firstFrameSrc;
    f1.onload = () => {
      drawInterpolatedFrame(0);
    };
    firstFrameImgRef.current = f1;
    if (f1.complete && f1.naturalWidth > 0) {
      drawInterpolatedFrame(0);
    }
  }, [firstFrameSrc, drawInterpolatedFrame]);

  // Load appropriate frame sequence (Desktop vs Mobile)
  const loadDeviceSequence = useCallback((device: 'desktop' | 'mobile') => {
    currentDeviceRef.current = device;
    const initialUrl = `/frames/${device}/frame_0001.webp`;
    setFirstFrameSrc(initialUrl);

    // Check if custom sequences are saved in IndexedDB
    getFirstFrameUrl(device).then((url) => {
      if (url) {
        setFirstFrameSrc(url);
        drawInterpolatedFrame(0);
      }
    });

    const loadTargetSequence = async () => {
      let frames = await loadCustomFrames(device);
      if (!frames && device === 'mobile') {
        frames = await loadCustomFrames('desktop');
      }

      if (frames && frames.length > 0) {
        setIsCustomSequence(true);
        setTotalFrames(frames.length);
        setFirstFrameSrc(frames[0]);

        const customImages: HTMLImageElement[] = [];
        frames.forEach((src, idx) => {
          const img = new Image();
          img.src = src;
          const onFrameReady = () => {
            const activeIdx = Math.floor(currentFrameRef.current % frames.length);
            if (activeIdx === idx || idx === 0) {
              drawInterpolatedFrame(currentFrameRef.current);
            }
          };
          img.onload = () => {
            if ('decode' in img) {
              img.decode().then(onFrameReady).catch(onFrameReady);
            } else {
              onFrameReady();
            }
          };
          if (idx === 0 && img.complete && img.naturalWidth > 0) {
            drawInterpolatedFrame(0);
          }
          customImages.push(img);
        });
        imagesRef.current = customImages;
        drawInterpolatedFrame(currentFrameRef.current);
      } else {
        // Factory 96-frame sequence for the given device
        setIsCustomSequence(false);
        setTotalFrames(DEFAULT_TOTAL_FRAMES);
        const presetImages: HTMLImageElement[] = [];
        for (let i = 1; i <= DEFAULT_TOTAL_FRAMES; i++) {
          const img = new Image();
          const frameNum = String(i).padStart(4, '0');
          img.src = `/frames/${device}/frame_${frameNum}.webp`;
          const idx = i - 1;
          const onFrameReady = () => {
            const activeIdx = Math.floor(currentFrameRef.current % DEFAULT_TOTAL_FRAMES);
            if (activeIdx === idx || idx === 0) {
              drawInterpolatedFrame(currentFrameRef.current);
            }
          };
          img.onload = () => {
            if ('decode' in img) {
              img.decode().then(onFrameReady).catch(onFrameReady);
            } else {
              onFrameReady();
            }
          };
          if (img.complete && img.naturalWidth > 0 && i === 1) {
            drawInterpolatedFrame(0);
          }
          presetImages.push(img);
        }
        imagesRef.current = presetImages;
        drawInterpolatedFrame(currentFrameRef.current);
      }
    };

    loadTargetSequence();
  }, [drawInterpolatedFrame]);

  // 1. Immediately instantiate sequence on mount
  useEffect(() => {
    currentFrameRef.current = 0;
    targetFrameRef.current = 0;
    velocityRef.current = 0;

    const device = getDeviceCategory();
    loadDeviceSequence(device);

    const handleFramesUpdated = () => {
      loadDeviceSequence(currentDeviceRef.current);
    };

    window.addEventListener('apex_custom_frames_updated', handleFramesUpdated);
    return () => {
      window.removeEventListener('apex_custom_frames_updated', handleFramesUpdated);
    };
  }, [loadDeviceSequence]);

  // 3. Rigid Direct DOM Opacity Updates (NO translateY or transform transitions)
  // Eliminates rubber-banding and scroll stuttering
  const updateOverlays = useCallback((progress: number) => {
    // Phase 1: Brand & Hero Actions (0% -> 22%)
    if (phase1Ref.current) {
      if (progress <= 0.22) {
        const opacity = Math.max(0, Math.min(1, 1 - progress / 0.16));
        phase1Ref.current.style.opacity = String(opacity);
        phase1Ref.current.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
      } else {
        phase1Ref.current.style.opacity = '0';
        phase1Ref.current.style.visibility = 'hidden';
      }
    }

    // Phase 4: Final 360 Reveal Complete & Inventory CTA (74% -> 100%)
    if (phase4Ref.current) {
      if (progress >= 0.74) {
        const opacity = Math.max(0, Math.min(1, (progress - 0.74) / 0.14));
        phase4Ref.current.style.opacity = String(opacity);
        phase4Ref.current.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
      } else {
        phase4Ref.current.style.opacity = '0';
        phase4Ref.current.style.visibility = 'hidden';
      }
    }

    if (scrubPercentRef.current) {
      scrubPercentRef.current.textContent = `${Math.round(progress * 100)}%`;
    }
  }, []);

  // 4. Inertia physics animation loop for direct drag gestures
  useEffect(() => {
    let isRunning = true;

    const loop = (time: number) => {
      if (!isRunning) return;

      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const numFrames = totalFrames;

      // Handle inertia velocity when released after dragging
      if (!isInteractingRef.current && Math.abs(velocityRef.current) > 0.01) {
        targetFrameRef.current = (targetFrameRef.current + velocityRef.current * dt * 60) % numFrames;
        velocityRef.current *= Math.exp(-6.0 * dt); // Smooth friction decay
        currentFrameRef.current = targetFrameRef.current;
        drawInterpolatedFrame(currentFrameRef.current);
      }

      // Update HUD metrics directly on DOM elements for zero-overhead performance
      let normFrame = currentFrameRef.current % numFrames;
      if (normFrame < 0) normFrame += numFrames;
      
      const bearing = Math.round((normFrame / numFrames) * 360) % 360;
      const frameNum = Math.round(normFrame) + 1;

      if (hudBearingRef.current) {
        hudBearingRef.current.textContent = `${bearing}°`;
      }
      if (hudFrameRef.current) {
        hudFrameRef.current.textContent = `${String(frameNum).padStart(2, '0')}/${numFrames}`;
      }
      if (scrubSliderRef.current && !isInteractingRef.current) {
        scrubSliderRef.current.value = String(normFrame);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [drawInterpolatedFrame, totalFrames]);

  // 5. Responsive Resize Observer with DevicePixelRatio & Dynamic Device Switching
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Max 2x DPR for ultra performance
      const targetW = Math.floor(rect.width * dpr);
      const targetH = Math.floor(rect.height * dpr);

      // On iOS Safari, the dynamic address bar collapses/expands by 30-80px during scroll.
      // Reassigning canvas.width / canvas.height re-allocates and clears the HTML5 canvas buffer!
      // Only resize canvas if width changed or height changed substantially (> 120px)
      const wChanged = Math.abs(canvas.width - targetW) > 4;
      const hChanged = Math.abs(canvas.height - targetH) > 120;
      if (canvas.width === 0 || wChanged || hChanged) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      // Check if device category changed between mobile and desktop
      const newDevice = window.innerWidth < 768 ? 'mobile' : 'desktop';
      if (newDevice !== currentDeviceRef.current) {
        loadDeviceSequence(newDevice);
      } else {
        drawInterpolatedFrame(currentFrameRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [drawInterpolatedFrame, loadDeviceSequence]);

  // Global Pointer Release Listener to prevent interactions from getting stuck
  useEffect(() => {
    const handleGlobalPointerRelease = () => {
      if (isInteractingRef.current) {
        isInteractingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerRelease);
    window.addEventListener('pointercancel', handleGlobalPointerRelease);
    window.addEventListener('mouseup', handleGlobalPointerRelease);
    window.addEventListener('touchend', handleGlobalPointerRelease);
    window.addEventListener('touchcancel', handleGlobalPointerRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerRelease);
      window.removeEventListener('pointercancel', handleGlobalPointerRelease);
      window.removeEventListener('mouseup', handleGlobalPointerRelease);
      window.removeEventListener('touchend', handleGlobalPointerRelease);
      window.removeEventListener('touchcancel', handleGlobalPointerRelease);
    };
  }, []);

  // 6. Direct Synchronous Scroll Sync with ZERO play or dead-zone (Optimized RAF loop for iOS Safari)
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const container = containerRef.current;
          if (container) {
            // Document-relative scroll position is 100% stable across all browsers (including Brave & Safari)
            const scrollY = window.pageYOffset || window.scrollY || document.documentElement.scrollTop || 0;
            const rect = container.getBoundingClientRect();
            const containerTop = rect.top + scrollY;
            const containerHeight = container.offsetHeight;
            const viewportHeight = window.innerHeight;
            const totalScrollableDist = containerHeight - viewportHeight;

            if (totalScrollableDist > 0) {
              const rawProgress = (scrollY - containerTop) / totalScrollableDist;
              const progress = Math.max(0, Math.min(1, rawProgress));

              targetProgressRef.current = progress;

              const newFrame = progress * (totalFrames - 1);
              targetFrameRef.current = newFrame;
              currentFrameRef.current = newFrame;
              drawInterpolatedFrame(newFrame);
              updateOverlays(progress);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [totalFrames, updateOverlays, drawInterpolatedFrame]);

  // 7. Interactive Direct Drag-to-Rotate on Canvas (Touch-safe: Mouse drag on desktop, native scroll on mobile)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only capture drag on mouse interactions to ensure mobile touch vertical scroll remains 100% native and fluid
    if (e.pointerType === 'mouse') {
      isInteractingRef.current = true;
      setIsDragging(true);
      hasInteractedRef.current = true;

      if (dragHintRef.current) {
        dragHintRef.current.style.opacity = '0';
      }

      pointerStartXRef.current = e.clientX;
      pointerStartFrameRef.current = targetFrameRef.current;
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = performance.now();
      velocityRef.current = 0;

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractingRef.current || e.pointerType !== 'mouse') return;

    const deltaX = e.clientX - pointerStartXRef.current;
    // 9px of drag per frame gives precise natural tactile feel
    const frameDelta = -deltaX / 9;
    const newFrame = pointerStartFrameRef.current + frameDelta;
    targetFrameRef.current = newFrame;
    currentFrameRef.current = newFrame;
    drawInterpolatedFrame(newFrame);

    // Calculate instantaneous release velocity
    const now = performance.now();
    const dt = (now - lastPointerTimeRef.current) / 1000;
    if (dt > 0.005) {
      const dx = e.clientX - lastPointerXRef.current;
      velocityRef.current = -(dx / 9) / (dt * 60);
      lastPointerXRef.current = e.clientX;
      lastPointerTimeRef.current = now;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // 8. Manual Slider Scrub Handle
  const handleManualScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    isInteractingRef.current = true;
    const val = parseFloat(e.target.value);
    targetFrameRef.current = val;
    currentFrameRef.current = val;
    drawInterpolatedFrame(val);
    const progress = val / (totalFrames - 1);
    updateOverlays(progress);
  };

  const handleResetToPreset = async () => {
    await clearCustomFrames();
    const device = currentDeviceRef.current;
    loadDeviceSequence(device);
    targetFrameRef.current = 0;
    currentFrameRef.current = 0;
    velocityRef.current = 0;

    if (containerRef.current) {
      window.scrollTo({ top: containerRef.current.offsetTop, behavior: 'smooth' });
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full bg-[#050507] text-white select-none"
      style={{ height: '320vh' }}
    >
      {/* Sticky Canvas Viewport */}
      <div 
        className="sticky top-0 h-[100dvh] w-full overflow-hidden flex items-center justify-center"
      >
        
        {/* Immediate First Frame Poster - Always visible instantly before scrolling or loading */}
        <img 
          src={firstFrameSrc}
          alt="CYR Cars 360 Turntable Frame 1"
          loading="eager"
          decoding="sync"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

        {/* HTML5 Canvas for Apple-Style Frame Scrubbing Locked to Scroll & Interactive Drag */}
        <canvas 
          ref={canvasRef} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative z-[2] w-full h-full block ${showDealerControls ? 'cursor-grab active:cursor-grabbing touch-pan-y' : 'pointer-events-none md:pointer-events-auto md:cursor-grab md:active:cursor-grabbing'}`}
          style={{ touchAction: 'pan-y' }}
        />

        {/* Ambient Darkening & Vignette Overlay - Subtly reduced for vibrant vehicle clarity */}
        <div className="absolute inset-0 z-[3] bg-black/10 pointer-events-none" />
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-black/25 via-transparent to-black/40 pointer-events-none" />

        {/* Floating Interaction Hint (Dealer Mode Only) */}
        {showDealerControls && (
          <div 
            ref={dragHintRef}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-15 pointer-events-none transition-opacity duration-700 opacity-90 flex items-center gap-2 px-4 py-2 rounded-full bg-black/75 border border-white/20 backdrop-blur-xl text-[10.5px] font-sans font-semibold tracking-wider text-zinc-300 shadow-2xl uppercase"
          >
            <MoveHorizontal className="w-3.5 h-3.5 text-white animate-pulse" />
            <span>DRAG CANVAS OR SCROLL TO ROTATE 360°</span>
          </div>
        )}

        {/* Top Floating HUD Status Bar (Dealer Mode Only) */}
        {showDealerControls && (
          <div className="absolute top-20 left-4 right-4 sm:left-8 sm:right-8 md:left-12 md:right-12 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2.5 bg-black/70 backdrop-blur-xl px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="text-[11px] font-mono tracking-wider text-zinc-300">
                BEARING: <span ref={hudBearingRef} className="text-white font-bold">0°</span> // FRAME <span ref={hudFrameRef} className="text-zinc-100 font-bold">01/{totalFrames}</span>
                {isCustomSequence && (
                  <span className="text-white ml-1.5 font-sans font-bold">[CUSTOM]</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15 shadow-xl pointer-events-auto">
              {onOpenFrameStudio && (
                <button
                  onClick={onOpenFrameStudio}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 hover:bg-white/25 hover:border-white/60 text-white hover:text-white border border-white/30 transition-all shadow-sm uppercase tracking-wider font-sans"
                  title="Upload custom 360 frames"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>360° Studio</span>
                </button>
              )}

              <button
                onClick={handleResetToPreset}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors font-sans uppercase tracking-wider"
                title="Reset to factory showroom frames"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        )}

        {/* Phase 1: Action Section (0% - 22% Scroll) - Non-Intrusive Bottom Left */}
        <div 
          ref={phase1Ref}
          style={{ opacity: 1, visibility: 'visible' }}
          className="absolute inset-0 z-30 flex flex-col justify-end pb-20 sm:pb-24 md:pb-28 pb-[max(5.5rem,env(safe-area-inset-bottom,20px)+4.5rem)] px-4 sm:px-10 md:px-14 lg:px-16 pointer-events-none"
        >
          {/* Bottom Action Section with refined luxury buttons */}
          <div className="select-none max-w-xl pointer-events-none">
            <div className="flex flex-row flex-wrap items-center gap-2.5 sm:gap-4 mb-2.5 sm:mb-3.5">
              <Link
                to="/inventory"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/inventory');
                }}
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-2.5 sm:py-4 rounded-full bg-white hover:bg-zinc-100 text-black font-sans font-extrabold text-[11px] sm:text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_4px_24px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <span>Browse Inventory</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
              </Link>
              <Link
                to="/sell"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/sell');
                }}
                className="inline-flex items-center justify-center gap-2 px-4.5 sm:px-8 py-2.5 sm:py-4 rounded-full bg-black/85 hover:bg-white/20 hover:border-white/60 text-white hover:text-white font-sans font-bold text-[11px] sm:text-sm uppercase tracking-wider border border-white/30 transition-all backdrop-blur-md shadow-lg hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <span>Sell Your Car</span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5 text-[9.5px] sm:text-xs font-sans font-semibold text-zinc-400 uppercase tracking-widest pl-1">
              <MoveHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400" />
              <span>Scroll down to rotate 360°</span>
            </div>
          </div>
        </div>

        {/* Phase 4: Final Reveal (Last Frame) - Clean Minimalist View Inventory */}
        <div 
          ref={phase4Ref}
          className="absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-4 sm:p-6 pointer-events-none opacity-0 invisible"
        >
          <div className="select-none pointer-events-auto">
            <Link
              to="/inventory"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/inventory');
              }}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-9 py-3 sm:py-4 rounded-full bg-white hover:bg-zinc-100 text-black font-sans font-extrabold text-xs sm:text-sm uppercase tracking-widest transition-all duration-300 shadow-[0_4px_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
            >
              <span>View Inventory</span>
              <ArrowRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>

        {/* Bottom Interactive Scrub Control Bar & Progress Indicator (Dealer Mode Only) */}
        {showDealerControls && (
          <div className="absolute bottom-6 left-4 right-4 sm:left-8 sm:right-8 md:left-12 md:right-12 z-20 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/80 backdrop-blur-2xl px-5 py-3.5 rounded-2xl border border-white/15 shadow-2xl">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Compass className="w-4 h-4 text-white shrink-0" />
              <div className="flex-1 sm:w-48 md:w-60 flex flex-col">
                <div className="flex justify-between text-[10px] font-mono text-zinc-300 uppercase">
                  <span>360° Turntable Scrub</span>
                  <span ref={scrubPercentRef}>0%</span>
                </div>
                <input
                  ref={scrubSliderRef}
                  type="range"
                  min="0"
                  max={totalFrames - 1}
                  step="0.05"
                  defaultValue="0"
                  onChange={handleManualScrub}
                  onMouseUp={() => { isInteractingRef.current = false; }}
                  onTouchEnd={() => { isInteractingRef.current = false; }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto text-xs text-zinc-300">
              <span className="hidden md:inline font-mono text-[10.5px] text-zinc-400">
                [SMOOTH SUB-FRAME INTERPOLATION ENGINE]
              </span>
              <button
                id="btn-hero-skip-inventory"
                onClick={onExploreClick}
                className="inline-flex items-center gap-1.5 text-xs text-white hover:text-zinc-300 font-sans font-bold uppercase tracking-wider transition-colors ml-auto sm:ml-0"
              >
                <span>Explore Collection</span>
                <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
