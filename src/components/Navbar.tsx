import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  Clock, 
  Compass, 
  Car as CarIcon, 
  GitCompare, 
  Sliders, 
  DollarSign,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onOpenAdmin: () => void;
  onOpenTradeIn: () => void;
  onOpenFrameStudio: () => void;
  compareCount: number;
  onScrollToInventory: () => void;
  onScrollToHero: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAdmin,
  onOpenTradeIn,
  onOpenFrameStudio,
  compareCount,
  onScrollToInventory,
  onScrollToHero
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl py-3.5'
          : 'bg-gradient-to-b from-black/80 to-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={onScrollToHero}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20 group-hover:shadow-sky-400/40 transition-shadow">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-sky-400 text-base tracking-tighter">
                ▲
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold tracking-widest text-white uppercase font-mono">
                APEX
              </span>
              <span className="text-xs font-light text-sky-400 tracking-wider">
                MOTORS
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wide block">
              CERTIFIED LUXURY & GT
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
          <button
            onClick={onScrollToHero}
            className="hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>360° Studio Reveal</span>
          </button>

          <button
            onClick={onScrollToInventory}
            className="hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <CarIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Inventory</span>
          </button>

          <button
            onClick={onOpenFrameStudio}
            className="hover:text-sky-400 text-sky-300/90 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Custom 360 Frames</span>
          </button>

          <button
            onClick={onOpenTradeIn}
            className="hover:text-sky-400 transition-colors flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instant Trade-In</span>
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="hidden sm:flex items-center gap-3">
          
          {/* Showroom Open Hours Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Showroom Open Today (9AM-8PM)</span>
          </div>

          {/* Direct Concierge Call */}
          <a
            href="tel:18005552739"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-sky-400" />
            <span>(800) 555-APEX</span>
          </a>

          {/* Admin Management Console Button */}
          <button
            onClick={onOpenAdmin}
            className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500 hover:text-slate-950 text-sky-400 text-xs font-semibold border border-sky-500/30 transition-all"
            title="Dealership Management & Supabase Schema"
          >
            Admin Portal
          </button>

        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={onOpenAdmin}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/30"
          >
            Admin
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 p-6 space-y-4 animate-in slide-in-from-top-4">
          <button
            onClick={() => { onScrollToHero(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-sky-400 flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-sky-400" />
            360° Studio Reveal
          </button>
          <button
            onClick={() => { onScrollToInventory(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-sky-400 flex items-center gap-2"
          >
            <CarIcon className="w-4 h-4 text-sky-400" />
            Inventory
          </button>
          <button
            onClick={() => { onOpenFrameStudio(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 text-sm text-sky-400 hover:text-sky-300 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            Custom 360 Frames Studio
          </button>
          <button
            onClick={() => { onOpenTradeIn(); setMobileMenuOpen(false); }}
            className="w-full text-left py-2 text-sm text-slate-200 hover:text-emerald-400 flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Instant Trade-In Valuation
          </button>
          <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
            <a
              href="tel:18005552739"
              className="py-2.5 text-center rounded-xl bg-slate-900 text-slate-200 text-xs font-semibold border border-slate-800"
            >
              Call Showroom: (800) 555-APEX
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};
