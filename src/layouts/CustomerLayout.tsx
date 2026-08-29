import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, MessageCircle, Instagram, Twitter, Menu, X, Star, Upload, Image, Check, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';
import { SmartImage } from '../components/SmartImage';
import { getFirstFrameUrl } from '../lib/frameStore';

export default function CustomerLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notification, setNotification] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  
  const { siteConfig } = useVehicles();
  const { loginAsDealer } = useAuth();
  const isHomePage = location.pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string>('/frames/frame_0001.webp');

  useEffect(() => {
    const fetchFirstFrame = () => {
      getFirstFrameUrl().then((url) => {
        if (url) setFirstFrameUrl(url);
      });
    };
    fetchFirstFrame();
    window.addEventListener('apex_custom_frames_updated', fetchFirstFrame);
    return () => window.removeEventListener('apex_custom_frames_updated', fetchFirstFrame);
  }, []);

  // Custom multi-tap tracker for dealer console access on mobile (esp. Safari iOS)
  const tapHistoryRef = React.useRef<number[]>([]);
  const lastTapEventTimeRef = React.useRef<number>(0);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => setIsMenuOpen(false);

  const handleSecretLogin = () => {
    setNotification('Opening Dealer Login...');
    setTimeout(() => {
      navigate('/dealer-management');
      setNotification('');
    }, 600);
  };

  const handleCopyrightTap = (e: React.SyntheticEvent) => {
    const now = Date.now();
    // Debounce duplicate events (e.g. touchend followed immediately by synthetic click)
    if (now - lastTapEventTimeRef.current < 120) return;
    lastTapEventTimeRef.current = now;

    // Filter to taps that happened within the last 1500ms
    const recentTaps = [...tapHistoryRef.current.filter(t => now - t < 1500), now];
    tapHistoryRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      tapHistoryRef.current = [];
      handleSecretLogin();
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-zinc-300 relative bg-transparent">
      {/* Dynamic secret greeting/bypass notification */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[10000] bg-zinc-900 text-white font-semibold text-xs tracking-widest uppercase font-mono px-8 py-5 rounded-full shadow-2xl border border-zinc-800 flex items-center space-x-3 transition-all animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Global Background - Permanent First Frame Showroom Backdrop (Crystal Clear) */}
      <div className="fixed top-0 bottom-0 left-0 right-0 z-0 bg-[#050507] overflow-hidden pointer-events-none">
        <SmartImage 
          src={firstFrameUrl || siteConfig.homeHeroImage}
          alt="Showroom Car Backdrop"
          loading="eager"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>

      <div className="relative z-10 flex flex-col flex-grow min-h-screen">
        {/* Main Navbar - Fixed Frosted Glass Header Overlay */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'frost-nav-scrolled' 
            : 'frost-nav'
        } text-zinc-100`}>

          <div className="container mx-auto max-w-7xl px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center">
            
            {/* Left Side: Branding Logo or Text */}
            <Link to="/" className="flex items-center shrink-0 select-none group">
              <img 
                src="/logo.png" 
                alt="CYR Cars" 
                className="h-10 sm:h-12 md:h-14 w-auto max-w-[220px] object-contain transition-all duration-300 group-hover:scale-105" 
              />
            </Link>

            {/* Right/Middle Side: Frosted Glass Icons & Navigation Links matching user screenshot */}
            <div className="flex items-center space-x-3 sm:space-x-5 md:space-x-7">
              
              {/* Desktop Phone Number with Circular Frosted Icon */}
              <div className="hidden md:flex items-center space-x-3 text-xs tracking-wider font-sans text-zinc-200">
                <a 
                  href="tel:+919987773656" 
                  className="flex items-center group font-medium hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 rounded-full frost-pill flex items-center justify-center mr-2.5 shrink-0 text-zinc-200 group-hover:text-white">
                    <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
                  </div>
                  <span className="text-zinc-200 font-medium tracking-wide text-[13px] font-sans">+91 99877 73656</span>
                </a>
              </div>

              {/* Vertical Subtle Divider */}
              <div className="hidden md:block h-5 w-[1px] bg-white/20"></div>

              {/* Frosted Rounded Pill Social & Location Icon Buttons */}
              <div className="hidden md:flex items-center space-x-2.5">
                <a 
                  href="https://www.instagram.com/cashyourride/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full frost-pill flex items-center justify-center text-[#E4405F] hover:text-[#f77737] hover:border-[#E4405F]/50 transition-all"
                  title="Instagram @cashyourride"
                >
                  <Instagram className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
                <a 
                  href="https://wa.me/919987773656" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full frost-pill flex items-center justify-center text-[#25D366] hover:text-emerald-300 hover:border-[#25D366]/50 transition-all"
                  title="WhatsApp Assistant"
                >
                  <MessageCircle className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
                <a 
                  href="https://maps.google.com/?q=Hill+View+Road+Bandra+Mumbai" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-8 h-8 rounded-full frost-pill flex items-center justify-center text-[#EA4335] hover:text-red-400 hover:border-[#EA4335]/50 transition-all"
                  title="Showroom Location: Bandra Hill View Road"
                >
                  <MapPin className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
              </div>

              {/* Desktop Navigation Links matching exact typography & underline in screenshot */}
              <div className="hidden md:flex items-center space-x-7 lg:space-x-8 text-[12.5px] tracking-[0.14em] uppercase font-sans font-semibold">
                <Link 
                  to="/" 
                  className={`relative py-1.5 transition-all duration-300 ${
                    location.pathname === '/' 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  HOME
                  {location.pathname === '/' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></span>
                  )}
                </Link>
                <Link 
                  to="/inventory" 
                  className={`relative py-1.5 transition-all duration-300 ${
                    location.pathname.startsWith('/inventory') 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  INVENTORY
                  {location.pathname.startsWith('/inventory') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></span>
                  )}
                </Link>
                <Link 
                  to="/sell" 
                  className={`relative py-1.5 transition-all duration-300 ${
                    location.pathname === '/sell' 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  SELL CAR
                  {location.pathname === '/sell' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></span>
                  )}
                </Link>
                <Link 
                  to="/about" 
                  className={`relative py-1.5 transition-all duration-300 ${
                    location.pathname === '/about' 
                      ? 'text-white font-bold' 
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  ABOUT
                  {location.pathname === '/about' && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"></span>
                  )}
                </Link>
                <a 
                  href="#contact" 
                  className="relative py-1.5 text-zinc-400 hover:text-white transition-all duration-300"
                >
                  CONTACT
                </a>
              </div>

              {/* Mobile Quick Action Buttons: Call, WhatsApp, Instagram, Maps, & Menu Toggle */}
              <div className="flex md:hidden items-center space-x-1.5 sm:space-x-2">
                <a 
                  href="tel:+919987773656" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full frost-pill flex items-center justify-center text-zinc-200 hover:text-white transition-colors"
                  title="Call Showroom"
                >
                  <Phone className="w-3.5 h-3.5 stroke-[1.5]" />
                </a>
                <a 
                  href="https://wa.me/919987773656" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full frost-pill flex items-center justify-center text-[#25D366] hover:text-emerald-300 hover:border-[#25D366]/50 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
                <a 
                  href="https://www.instagram.com/cashyourride/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full frost-pill flex items-center justify-center text-[#E4405F] hover:text-[#f77737] hover:border-[#E4405F]/50 transition-colors"
                  title="Instagram @cashyourride"
                >
                  <Instagram className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
                <a 
                  href="https://maps.google.com/?q=Hill+View+Road+Bandra+Mumbai" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full frost-pill flex items-center justify-center text-[#EA4335] hover:text-red-400 hover:border-[#EA4335]/50 transition-colors"
                  title="Showroom Location: Bandra Hill View Road"
                >
                  <MapPin className="w-3.5 h-3.5 stroke-[1.8]" />
                </a>
                <button 
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full frost-pill flex items-center justify-center text-zinc-200 hover:text-white ml-0.5 transition-colors" 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Menu className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
              </div>

            </div>
          </div>

          {/* Mobile Navigation Drawer with Translucent Frosted Glass Styling */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-black/75 backdrop-blur-2xl border-b border-white/15 border-t border-white/10 px-5 py-5 flex flex-col space-y-2 shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 animate-fade-in">
              <Link 
                to="/" 
                onClick={closeMenu} 
                className={`px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold tracking-widest uppercase font-sans flex items-center justify-between ${
                  location.pathname === '/' 
                    ? 'bg-white/15 text-white font-bold border border-white/20' 
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>Home</span>
                {location.pathname === '/' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </Link>
              
              <Link 
                to="/inventory" 
                onClick={closeMenu} 
                className={`px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold tracking-widest uppercase font-sans flex items-center justify-between ${
                  location.pathname.startsWith('/inventory') 
                    ? 'bg-white/15 text-white font-bold border border-white/20' 
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>Inventory</span>
                {location.pathname.startsWith('/inventory') && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </Link>
              
              <Link 
                to="/sell" 
                onClick={closeMenu} 
                className={`px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold tracking-widest uppercase font-sans flex items-center justify-between ${
                  location.pathname === '/sell' 
                    ? 'bg-white/15 text-white font-bold border border-white/20' 
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>Sell Your Car</span>
                {location.pathname === '/sell' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </Link>
              
              <Link 
                to="/about" 
                onClick={closeMenu} 
                className={`px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold tracking-widest uppercase font-sans flex items-center justify-between ${
                  location.pathname === '/about' 
                    ? 'bg-white/15 text-white font-bold border border-white/20' 
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>About</span>
                {location.pathname === '/about' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </Link>
              
              <a 
                href="#contact" 
                onClick={closeMenu} 
                className="px-4 py-3 rounded-xl transition-all duration-200 text-xs font-semibold tracking-widest uppercase font-sans text-zinc-300 hover:bg-white/10 hover:text-white flex items-center justify-between"
              >
                <span>Contact</span>
              </a>

              {/* Mobile Menu Footer Details */}
              <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-sans text-zinc-400 px-2">
                <span>+91 99877 73656</span>
                <span>BANDRA, MUMBAI</span>
              </div>
            </div>
          )}
        </nav>

      {/* Main Content Area */}
      <main className={`flex-grow ${!isHomePage ? 'pt-20 sm:pt-24' : ''}`}>
        <Outlet />
      </main>

      {/* Footer - Clean Showroom Container */}
      <footer className="bg-black/60 border-t border-white/10 text-zinc-400 pt-10 sm:pt-14 pb-12 px-4 mt-0 relative overflow-hidden font-sans">
        {/* Ambient pulse */}
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-white/[0.015] rounded-full blur-[160px] pointer-events-none"></div>

        <div className="container mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-16 relative z-10 text-zinc-300">
          <div className="space-y-6 md:col-span-1">
            <div className="flex items-center inline-flex mb-4">
              <img 
                src="/logo.png" 
                alt="CYR Cars" 
                className="h-10 sm:h-12 w-auto object-contain max-w-[180px]" 
              />
            </div>
            <p className="text-sm tracking-wide leading-relaxed text-zinc-300 font-light font-sans">
              Exotic & Luxury Motorcars. Located at Hill View Road, Bandra, CYR Cars delivers uncompromising certification, transparent transactions, and bespoke automotive excellence.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <a href="https://www.instagram.com/cashyourride/" target="_blank" rel="noreferrer" className="p-2.5 rounded-full frost-pill hover:bg-[#E4405F] hover:text-white transition-all text-[#E4405F]" title="Instagram @cashyourride">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://wa.me/919987773656" target="_blank" rel="noreferrer" className="p-2.5 rounded-full frost-pill hover:bg-[#25D366] hover:text-white transition-all text-[#25D366]" title="WhatsApp">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="tel:+919987773656" className="p-2.5 rounded-full frost-pill hover:bg-white hover:text-black transition-all text-white" title="Call Showroom">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-white font-cinzel tracking-wider text-xs font-bold uppercase border-b border-white/10 pb-2">Quick Navigation</h3>
            <ul className="space-y-3.5 text-xs tracking-widest uppercase font-semibold font-sans text-zinc-300">
              <li><Link to="/inventory" className="hover:text-white transition-colors duration-300">Browse Collection</Link></li>
              <li><Link to="/sell" className="hover:text-white transition-colors duration-300">Sell Your Car</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors duration-300">About CYR Cars</Link></li>
              <li><a href="https://www.instagram.com/cashyourride/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors duration-300">Instagram @cashyourride ↗</a></li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-white font-cinzel tracking-wider text-xs font-bold uppercase border-b border-white/10 pb-2">Showroom & Inquiries</h3>
            <ul className="space-y-4 text-sm tracking-wide text-zinc-200 font-normal font-sans">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 text-white mr-3 shrink-0 mt-1" />
                <a href="https://maps.google.com/?q=Hill+View+Road+Bandra+Mumbai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors duration-300 leading-relaxed font-normal text-zinc-200 font-sans">
                  Hill View Road, Bandra, Mumbai, Maharashtra 400050
                </a>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 text-white mr-3 shrink-0" />
                <a href="tel:+919987773656" className="hover:text-white transition-colors duration-300 font-sans font-bold text-white">+91 99877 73656</a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 text-white mr-3 shrink-0" />
                <a href="mailto:contact@cyrcars.in" className="hover:text-white transition-colors duration-300 font-sans font-medium text-zinc-200">contact@cyrcars.in</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl mt-10 sm:mt-14 pt-6 border-t border-white/10 text-[10px] tracking-widest uppercase text-zinc-300 flex flex-col md:flex-row justify-between items-center font-sans font-semibold">
          <button 
            type="button"
            onClick={handleCopyrightTap}
            onTouchEnd={handleCopyrightTap}
            className="select-none text-zinc-300 cursor-pointer touch-manipulation hover:text-white outline-none active:text-white transition-colors bg-transparent border-0 p-0 text-left text-[10px] tracking-widest uppercase font-sans font-semibold"
          >
            &copy; 1986 - {new Date().getFullYear()} CYR Cars. Excellence on Hill View Road, Bandra, Mumbai.
          </button>
          <div className="flex space-x-6 mt-4 md:mt-0 text-zinc-300 font-sans items-center">
            <Link to="/dealer-management" className="text-white hover:text-zinc-300 font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 border border-white/20 px-2 py-0.5 rounded">
              Dealer Portal ↗
            </Link>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white flex items-center">Terms</a>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
