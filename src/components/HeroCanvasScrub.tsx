import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, 
  RotateCw, 
  Sparkles, 
  ShieldCheck, 
  Gauge, 
  ArrowRight, 
  Compass, 
  Upload,
  MoveHorizontal,
  Phone
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
  const phase2Ref = useRef<HTMLDivElement>(null);
  const phase3Ref = useRef<HTMLDivElement>(null);
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
          img.onload = () => {
            const activeIdx = Math.floor(currentFrameRef.current % frames.length);
            if (activeIdx === idx || idx === 0) {
              drawInterpolatedFrame(currentFrameRef.current);
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
          img.onload = () => {
            const activeIdx = Math.floor(currentFrameRef.current % DEFAULT_TOTAL_FRAMES);
            if (activeIdx === idx || idx === 0) {
              drawInterpolatedFrame(currentFrameRef.current);
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
    // Phase 1: Brand & Hero Statement (0% -> 22%)
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

    // Phase 2: Spec Highlights (16% -> 52%)
    if (phase2Ref.current) {
      if (progress >= 0.16 && progress <= 0.52) {
        let opacity = 0;
        if (progress < 0.26) {
          opacity = (progress - 0.16) / 0.10;
        } else if (progress > 0.42) {
          opacity = 1 - (progress - 0.42) / 0.10;
        } else {
          opacity = 1;
        }
        opacity = Math.max(0, Math.min(1, opacity));
        phase2Ref.current.style.opacity = String(opacity);
        phase2Ref.current.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
      } else {
        phase2Ref.current.style.opacity = '0';
        phase2Ref.current.style.visibility = 'hidden';
      }
    }

    // Phase 3: Certified Heritage (48% -> 78%)
    if (phase3Ref.current) {
      if (progress >= 0.48 && progress <= 0.78) {
        let opacity = 0;
        if (progress < 0.56) {
          opacity = (progress - 0.48) / 0.08;
        } else if (progress > 0.68) {
          opacity = 1 - (progress - 0.68) / 0.10;
        } else {
          opacity = 1;
        }
        opacity = Math.max(0, Math.min(1, opacity));
        phase3Ref.current.style.opacity = String(opacity);
        phase3Ref.current.style.visibility = opacity > 0.05 ? 'visible' : 'hidden';
      } else {
        phase3Ref.current.style.opacity = '0';
        phase3Ref.current.style.visibility = 'hidden';
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

      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);

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

  // 6. Direct Synchronous Scroll Sync with ZERO play or dead-zone (Optimized RAF loop)
  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const container = containerRef.current;
          if (container) {
            const rect = container.getBoundingClientRect();
            const totalScrollableDist = rect.height - window.innerHeight;

            if (totalScrollableDist > 0) {
              const rawProgress = -rect.top / totalScrollableDist;
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
      id="hero-section"
      ref={containerRef} 
      className="relative w-full bg-[#050507] text-white select-none"
      style={{ height: '360vh' }}
    >
      {/* Sticky Canvas Viewport */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
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
          className="relative z-[2] w-full h-full block cursor-grab active:cursor-grabbing touch-pan-y"
        />

        {/* Ambient Darkening & Vignette Overlay */}
        <div className="absolute inset-0 z-[3] bg-black/30 pointer-events-none" />
        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

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
                  id="btn-hero-upload-frames"
                  onClick={onOpenFrameStudio}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-white/10 hover:bg-white hover:text-black text-white border border-white/30 transition-all shadow-sm uppercase tracking-wider font-sans"
                  title="Upload custom 360 frames"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>360° Studio</span>
                </button>
              )}

              <button
                id="btn-hero-reset-view"
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

        {/* Phase 1: Clean Action Section (0% - 22% Scroll) - Non-Intrusive Bottom Left */}
        <div 
          ref={phase1Ref}
          id="hero-phase-1"
          className="absolute inset-0 z-30 flex flex-col justify-end pb-28 sm:pb-32 md:pb-36 px-6 sm:px-10 md:px-14 lg:px-16 pointer-events-none"
        >
          {/* Bottom Action Section with compact sleek buttons completely clear of the central car */}
          <div className="select-none max-w-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 mb-3">
              <Link
                to="/inventory"
                id="btn-hero-phase1-browse"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/inventory');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-black font-sans font-bold text-[10.5px] sm:text-[11.5px] uppercase tracking-wider transition-all duration-300 shadow-[0_2px_12px_rgba(255,255,255,0.25)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <span>Browse Inventory</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
              <a
                href="#contact"
                id="btn-hero-contact-us"
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById('contact');
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-black/80 hover:bg-white hover:text-black text-white font-sans font-semibold text-[10.5px] sm:text-[11.5px] uppercase tracking-wider border border-white/25 transition-all backdrop-blur-md hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <Phone className="w-3 h-3" />
                <span>Contact Us</span>
              </a>
            </div>
            <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-sans font-semibold text-zinc-400 uppercase tracking-widest">
              <MoveHorizontal className="w-3 h-3 text-zinc-400" />
              <span>Scroll down to rotate 360°</span>
            </div>
          </div>
        </div>

        {/* Phase 2: Performance & Curation Callout (25% - 55% Scroll) - Floating Typography Bottom Right */}
        <div 
          ref={phase2Ref}
          id="hero-phase-2"
          className="absolute inset-0 z-20 flex flex-col justify-end items-end pb-24 sm:pb-28 md:pb-32 px-6 sm:px-10 md:px-14 lg:px-16 pointer-events-none opacity-0 invisible"
        >
          <div className="max-w-xs sm:max-w-sm md:max-w-md text-right select-none pointer-events-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-sans font-bold tracking-[0.2em] uppercase text-sky-400 mb-1.5">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>DISCREET CURATION</span>
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-cinzel font-bold text-white tracking-tight mb-3 uppercase leading-tight">
              BESPOKE EXOTICS &amp; PERFORMANCE
            </h3>
            <div className="space-y-1.5 text-[11px] sm:text-xs text-zinc-300 font-sans">
              <div className="flex justify-end items-center gap-2 pb-1 border-b border-white/15">
                <span className="text-zinc-400 uppercase text-[9.5px] tracking-wider">Provenance:</span>
                <span className="text-white font-semibold">Single-Collector Certified</span>
              </div>
              <div className="flex justify-end items-center gap-2 pb-1 border-b border-white/15">
                <span className="text-zinc-400 uppercase text-[9.5px] tracking-wider">Telemetry:</span>
                <span className="text-white font-semibold">Verified Drivetrain Health</span>
              </div>
              <div className="flex justify-end items-center gap-2">
                <span className="text-zinc-400 uppercase text-[9.5px] tracking-wider">Delivery:</span>
                <span className="text-emerald-400 font-semibold">White-Glove Enclosed Transport</span>
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-400 uppercase tracking-widest mt-2.5 font-mono">
              Bandra Hill View Rd • Mumbai
            </p>
          </div>
        </div>

        {/* Phase 3: Concours Provenance Standards (55% - 80% Scroll) - Floating Typography Bottom Left */}
        <div 
          ref={phase3Ref}
          id="hero-phase-3"
          className="absolute inset-0 z-20 flex flex-col justify-end items-start pb-24 sm:pb-28 md:pb-32 px-6 sm:px-10 md:px-14 lg:px-16 pointer-events-none opacity-0 invisible"
        >
          <div className="max-w-xs sm:max-w-sm md:max-w-md text-left select-none pointer-events-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-sans font-bold tracking-[0.2em] uppercase text-emerald-400 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>CONCOURS STANDARDS</span>
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-white tracking-tight mb-3 uppercase leading-[1.1]">
              UNCOMPROMISING<br />PROVENANCE
            </h3>
            <div className="space-y-2 text-[11px] sm:text-xs text-zinc-200 font-sans">
              <div className="flex items-center gap-2.5 pb-1.5 border-b border-white/15">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Precision Paint Meter &amp; Structural Integrity Audit</span>
              </div>
              <div className="flex items-center gap-2.5 pb-1.5 border-b border-white/15">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Exotic ECU Diagnostics &amp; Dyno Telemetry Logs</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span>Concours Ceramic Detail &amp; Multi-Stage Paint Correction</span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-sans mt-3 leading-relaxed">
              Curating exclusively the finest 1% of luxury &amp; supercar acquisitions.
            </p>
          </div>
        </div>

        {/* Phase 4: Final Reveal & Inventory CTA (82% - 100% Scroll) - Centered Completion */}
        <div 
          ref={phase4Ref}
          id="hero-phase-4"
          className="absolute inset-0 z-30 flex flex-col justify-center items-center text-center p-6 md:p-12 pointer-events-none opacity-0 invisible"
        >
          <div className="max-w-xl text-center select-none pointer-events-auto drop-shadow-[0_2px_16px_rgba(0,0,0,0.95)]">
            <span className="text-xs sm:text-sm font-mono uppercase tracking-[0.25em] text-zinc-300 font-bold mb-2.5 block">
              SHOWCASE COMPLETE
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-cinzel font-bold text-white tracking-tight mb-3.5 uppercase">
              Explore Available Collection
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-zinc-200 mb-6 leading-relaxed font-sans max-w-md mx-auto">
              Discover our hand-picked collection of exotic supercars, high-performance sports cars, and luxury flagship motorcars on Hill View Road, Bandra, Mumbai.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3">
              <Link
                to="/inventory"
                id="btn-hero-browse-stock"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/inventory');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-white hover:bg-zinc-100 text-black font-sans font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
              >
                <span>Browse Full Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <a
                href="#contact"
                id="btn-hero-phase4-contact"
                onClick={(e) => {
                  e.stopPropagation();
                  const el = document.getElementById('contact');
                  if (el) {
                    e.preventDefault();
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 sm:px-6 sm:py-3 rounded-full bg-black/80 hover:bg-white hover:text-black text-white font-sans font-semibold text-[11px] sm:text-xs uppercase tracking-wider border border-white/25 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg backdrop-blur-md pointer-events-auto cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contact Us</span>
              </a>
            </div>
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
