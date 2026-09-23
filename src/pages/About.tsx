import { Star, X, ChevronLeft, ChevronRight, MapPin, Clock, Bookmark, ShieldCheck, Sparkles, ExternalLink, FileCheck, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVehicles } from '../context/VehicleContext';
import { MOCK_REVIEWS } from '../data/mockData';
import React, { useState } from 'react';
import { SmartImage } from '../components/SmartImage';
import { DELIVERY_PLACEHOLDER_IMAGE } from '../constants/placeholders';

export default function About() {
  const { siteConfig } = useVehicles();
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  const deliveries = siteConfig.clientDeliveries || [];
  const heroShowcaseImage = siteConfig.aboutImage || (deliveries.length > 0 ? deliveries[0] : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80");

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deliveries.length === 0) return;
    setActivePhotoIndex((prev) => (prev !== null ? (prev + 1) % deliveries.length : 0));
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deliveries.length === 0) return;
    setActivePhotoIndex((prev) => (prev !== null ? (prev - 1 + deliveries.length) % deliveries.length : 0));
  };

  return (
    <div className="bg-transparent text-zinc-300 font-sans min-h-screen">
      {/* Top Header & Milestone Section */}
      <section className="pt-4 sm:pt-8 pb-6 sm:pb-8 bg-transparent relative z-10">
        <div className="container mx-auto max-w-7xl px-3.5 sm:px-6">
          
          {/* Header Title Block */}
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8 animate-fade-in">
            <span className="text-zinc-400 font-sans tracking-[0.25em] uppercase text-[10px] sm:text-xs font-semibold mb-1.5 block">
              About Us
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-sans tracking-tight text-white uppercase mb-2">
              CYR CARS
            </h1>
            
            {/* Established Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-white/[0.05] backdrop-blur-md text-zinc-300 text-[10px] sm:text-xs uppercase tracking-wider font-sans font-medium mb-3">
              <Bookmark className="w-3 h-3 text-white fill-white shrink-0" />
              <span>ESTD. 2020 • BANDRA, MUMBAI</span>
            </div>

            <p className="text-zinc-300 text-xs sm:text-sm md:text-base leading-relaxed font-normal max-w-xl mx-auto px-2">
              Mumbai's boutique destination for curated luxury, performance, and exotic motorcars on Hill View Road, Bandra.
            </p>
          </div>

          {/* Milestones Container Card */}
          <div className="frost-card rounded-2xl p-4 sm:p-6 shadow-xl border border-white/15 animate-fade-in">
            {/* Milestone Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4 text-xs font-sans tracking-wider uppercase">
              <div className="flex items-center gap-2 text-white font-bold">
                <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Our Journey</span>
              </div>
              <span className="text-zinc-400 text-[11px] font-mono">2020 – 2026</span>
            </div>

            {/* Milestones 4-Column Grid - Ultra Compact & Punchy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-black/40 border border-white/10 hover:border-white/25 rounded-xl p-3.5 transition-all">
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10 inline-block mb-2">2020</span>
                <h3 className="text-white font-bold text-xs uppercase tracking-wide mb-1">Founded in Bandra</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Established with a focus on pristine, low-mileage luxury vehicles.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 hover:border-white/25 rounded-xl p-3.5 transition-all">
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10 inline-block mb-2">2022</span>
                <h3 className="text-white font-bold text-xs uppercase tracking-wide mb-1">150-Point Standards</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Pioneered rigorous mechanical and telemetry certification audits.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 hover:border-white/25 rounded-xl p-3.5 transition-all">
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10 inline-block mb-2">2024</span>
                <h3 className="text-white font-bold text-xs uppercase tracking-wide mb-1">Collector Network</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Trusted by Mumbai's prominent auto enthusiasts and collectors.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 hover:border-white/25 rounded-xl p-3.5 transition-all">
                <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-white/10 inline-block mb-2">2026</span>
                <h3 className="text-white font-bold text-xs uppercase tracking-wide mb-1">Flagship Boutique</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Hundreds of verified handovers celebrated on Hill View Road.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Delivery Showcase Banner */}
      <section className="py-3 sm:py-6 bg-transparent relative z-10">
        <div className="container mx-auto max-w-7xl px-3.5 sm:px-6">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/15 aspect-[16/10] sm:aspect-[16/8] md:aspect-[21/8] w-full bg-black/60 group">
            <SmartImage 
              src={heroShowcaseImage} 
              alt="Where Performance Meets Prestige - CYR Cars Showroom" 
              fallbackSrc={DELIVERY_PLACEHOLDER_IMAGE}
              className="w-full h-full object-cover object-center brightness-90 group-hover:scale-[1.02] transition-all duration-700 ease-out"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8 pointer-events-none">
              <span className="text-zinc-300 font-sans font-bold text-[10px] sm:text-xs tracking-[0.2em] uppercase mb-1 block">
                Bandra Showroom
              </span>
              <h2 className="text-white font-sans text-lg sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
                Where Performance Meets Prestige
              </h2>
            </div>
          </div>
        </div>
      </section>

      {/* Story & Showroom Vitals Section */}
      <section className="py-6 sm:py-10 bg-transparent relative z-10">
        <div className="container mx-auto max-w-7xl px-3.5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
            
            {/* Left Column: Simplified Narrative & 4 Quality Pillars */}
            <div className="lg:col-span-7 space-y-4 animate-fade-in">
              <div>
                <span className="text-zinc-400 font-sans tracking-[0.2em] uppercase text-[10px] sm:text-xs font-semibold mb-1 block">
                  The Standard
                </span>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-sans font-bold text-white tracking-tight uppercase">
                  Curated With Precision
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed mt-2">
                  Every motorcar on our showroom floor at Hill View Road, Bandra is hand-selected and certified to the highest standards.
                </p>
              </div>

              {/* 4 Crisp Feature Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="frost-card p-3.5 rounded-xl flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">150-Point Audit</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">Drivetrain, electronics, and flood-free provenance.</p>
                  </div>
                </div>

                <div className="frost-card p-3.5 rounded-xl flex items-start gap-3">
                  <FileCheck className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Verified Provenance</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">100% genuine mileage and clean single-owner titles.</p>
                  </div>
                </div>

                <div className="frost-card p-3.5 rounded-xl flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Bespoke Title Transfer</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">Discreet, expedited VIP registration and ownership transfers.</p>
                  </div>
                </div>

                <div className="frost-card p-3.5 rounded-xl flex items-start gap-3">
                  <Truck className="w-4 h-4 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">Enclosed Logistics</h4>
                    <p className="text-zinc-400 text-[11px] leading-relaxed mt-0.5">Insured, white-glove transport directly to your doorstep.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Showroom Vitals Card */}
            <div className="lg:col-span-5 font-sans animate-fade-in">
              <div className="frost-card rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl border border-white/15">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-zinc-300 font-sans tracking-[0.2em] uppercase text-xs font-bold">
                    Showroom Vitals
                  </span>
                  <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                    <Star className="w-3.5 h-3.5 fill-white text-white" />
                    <span>4.3 ★ Google</span>
                  </div>
                </div>

                {/* Showroom Timings */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Visiting Hours</span>
                  </div>
                  <p className="text-zinc-300 text-xs font-mono font-medium">
                    Monday – Sunday: 10:00 AM – 8:30 PM
                  </p>
                </div>

                <div className="border-t border-white/10" />

                {/* Showroom Location */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    <span>Location</span>
                  </div>
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Hill View Road, Bandra, Mumbai, MH 400050
                  </p>
                </div>

                <div className="pt-1">
                  <a 
                    href="https://share.google/KqZdV8L9UzqY2RkUH" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/50 text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Get Directions & Reviews</span>
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Client Deliveries Section (Patron Archive) */}
      {deliveries.length > 0 && (
        <section className="py-8 sm:py-14 bg-transparent border-t border-white/10 relative z-10">
          <div className="container mx-auto max-w-7xl px-3.5 sm:px-6">
            <div className="text-center mb-6 sm:mb-10 animate-fade-in">
              <span className="text-zinc-400 tracking-[0.2em] uppercase text-[10px] sm:text-xs font-bold mb-1.5 block font-sans">
                Deliveries
              </span>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-sans font-bold text-white tracking-tight uppercase mb-2">
                Memories on the Road
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
                Recent vehicle handovers and celebrations at our Bandra showroom.
              </p>
            </div>

            {/* Photo Wall Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 pt-1">
              {deliveries.map((img, i) => {
                const captions = [
                  "Milestone Handover",
                  "Premium Acquisition",
                  "Driving Dream Home",
                  "Exceptional Delivery",
                  "Bespoke Handover",
                  "Pure Motoring Passion"
                ];

                const currentCaption = captions[i % captions.length];

                return (
                  <div 
                    key={i} 
                    id={`patron-card-${i}`}
                    onClick={() => setActivePhotoIndex(i)}
                    className="group relative frost-card p-3 sm:p-3.5 rounded-2xl transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between hover:-translate-y-1"
                  >
                    {/* Photo Canvas Frame with Zoom Effect */}
                    <div className="relative overflow-hidden rounded-xl bg-black/50 aspect-[4/3] w-full">
                      <SmartImage 
                        src={img} 
                        alt={`Client Delivery ${i + 1}`} 
                        fallbackSrc={DELIVERY_PLACEHOLDER_IMAGE}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out"
                      />
                      
                      <div className="absolute top-2.5 right-2.5 frost-pill text-white text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-sm select-none font-sans">
                        ✓ DELIVERED
                      </div>
                    </div>

                    {/* Metadata & Caption */}
                    <div className="pt-2.5 px-1 flex items-center justify-between">
                      <p className="font-sans text-white text-xs sm:text-sm font-semibold tracking-wide select-none group-hover:text-zinc-200 transition-colors">
                        {currentCaption}
                      </p>
                      <span className="text-[10px] font-sans text-zinc-400 uppercase tracking-wider">
                        Bandra, Mumbai
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {activePhotoIndex !== null && (
        <div 
          id="patron-lightbox-backdrop"
          onClick={() => setActivePhotoIndex(null)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in p-4 md:p-8"
        >
          {/* Top Control Bar */}
          <div className="absolute top-5 inset-x-0 px-6 flex justify-between items-center text-zinc-300 font-sans text-xs z-10 max-w-7xl mx-auto">
            <div>
              <span className="text-white font-bold">CYR CARS</span>
              <span className="mx-2 font-light text-zinc-400">|</span>
              <span className="text-zinc-300">PATRON ARCHIVE {activePhotoIndex + 1} OF {deliveries.length}</span>
            </div>
            
            <button 
              onClick={() => setActivePhotoIndex(null)}
              className="p-3 bg-black border border-white/20 rounded-full text-zinc-200 hover:text-white hover:border-white transition-all flex items-center justify-center cursor-pointer shadow-lg hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Visual Centerpiece */}
          <div className="relative w-full max-w-5xl aspect-[16/10] md:max-h-[70vh] flex items-center justify-center group/lightbox my-auto">
            <button
              onClick={handlePrevPhoto}
              className="absolute left-4 p-4 rounded-2xl bg-black/70 border border-white/20 hover:border-white hover:bg-black text-white transition-all transform -translate-x-12 opacity-0 group-hover/lightbox:translate-x-0 group-hover/lightbox:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <SmartImage 
              src={deliveries[activePhotoIndex]} 
              alt="Archival Patron Delivery" 
              fallbackSrc={DELIVERY_PLACEHOLDER_IMAGE}
              className="w-full h-full object-contain max-h-[70vh] rounded-2xl shadow-2xl border border-white/20 select-none bg-black/50"
            />

            <button
              onClick={handleNextPhoto}
              className="absolute right-4 p-4 rounded-2xl bg-black/70 border border-white/20 hover:border-white hover:bg-black text-white transition-all transform translate-x-12 opacity-0 group-hover/lightbox:translate-x-0 group-hover/lightbox:opacity-100 z-20 cursor-pointer hidden md:flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Navigation Buttons */}
          <div className="flex md:hidden items-center justify-center gap-6 mt-6 z-10">
            <button
              onClick={handlePrevPhoto}
              className="px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-sans text-xs font-bold tracking-widest uppercase flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> PREV
            </button>
            <button
              onClick={handleNextPhoto}
              className="px-6 py-3 rounded-full bg-white text-black font-sans text-xs font-bold tracking-widest uppercase flex items-center gap-2"
            >
              NEXT <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <section className="py-8 sm:py-14 bg-transparent border-t border-white/10 font-sans relative z-10">
        <div className="container mx-auto max-w-7xl px-3.5 sm:px-6">
          <div className="text-center mb-6 sm:mb-10">
            <span className="text-zinc-400 tracking-[0.2em] uppercase text-[10px] sm:text-xs font-semibold mb-1.5 block font-sans">Verified Feedback</span>
            <h2 className="text-xl sm:text-3xl md:text-4xl font-sans font-bold text-white tracking-wide mb-2 uppercase">Google Reviews</h2>
            <p className="text-zinc-400 text-xs max-w-xl mx-auto tracking-wide">
              Direct ratings from verified clients and collectors across Mumbai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 lg:gap-6">
            {MOCK_REVIEWS.map((review) => {
              return (
                <div key={review.id} className="frost-card p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-1">
                        {[...Array(review.rating)].map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-white text-white" />
                        ))}
                      </div>
                    </div>
                    <p className="text-zinc-200 text-xs leading-relaxed mb-4 font-normal font-sans">"{review.text}"</p>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-xs shrink-0">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-xs tracking-wide">{review.name}</h3>
                      <p className="text-[10px] text-zinc-300 mt-0.5">{review.date}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 sm:mt-8 flex justify-center px-4">
            <a 
              href="https://share.google/KqZdV8L9UzqY2RkUH" 
              target="_blank" 
              rel="noreferrer" 
              className="group flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-zinc-100 text-black font-sans font-bold rounded-full text-[10.5px] sm:text-xs tracking-wider uppercase transition-all duration-300 shadow-md active:scale-95 max-w-[240px] sm:max-w-none w-full sm:w-auto"
            >
              <Star className="w-3.5 h-3.5 fill-current text-black shrink-0" />
              <span>View Google Reviews</span>
              <span className="text-xs font-light transition-transform duration-300 group-hover:translate-x-1">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 bg-transparent text-center border-t border-white/10 relative z-10 animate-fade-in overflow-hidden font-sans">
        <div className="container mx-auto max-w-2xl px-4 relative z-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-sans font-bold text-white mb-2 tracking-wide uppercase">Experience Bespoke Curation</h2>
          <p className="text-zinc-300 mb-5 font-normal tracking-wide text-xs sm:text-sm">We welcome you to inspect our verified, certified pre-owned luxury and performance motorcars in Mumbai.</p>
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3.5 justify-center text-[11px] sm:text-xs tracking-wider uppercase font-sans font-bold max-w-[240px] sm:max-w-none mx-auto">
            <Link to="/inventory" className="bg-white text-black hover:bg-zinc-200 px-5 sm:px-7 py-2.5 sm:py-3 transition-all duration-300 rounded-full shadow-md text-center">
              Browse Collection
            </Link>
            <Link to="/sell" className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/50 text-white hover:text-white px-5 sm:px-7 py-2.5 sm:py-3 transition-all duration-300 rounded-full shadow-sm text-center">
              Consign Your Car
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
