import React, { useState } from 'react';
import { Car } from '../types';
import { 
  Gauge, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  Calendar, 
  Fuel, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  GitCompare
} from 'lucide-react';

interface CarCardProps {
  car: Car;
  onSelect: (car: Car) => void;
  onQuickBook: (car: Car) => void;
  isCompared: boolean;
  onToggleCompare: (car: Car) => void;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  onSelect,
  onQuickBook,
  isCompared,
  onToggleCompare
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const images = car.images && car.images.length > 0 ? car.images : [car.thumbnail_url];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  // Monthly payment calculation estimation (60 months, 6.5% APR, 15% down)
  const calculateEstimatedMonthly = (price: number) => {
    const principal = price * 0.85;
    const monthlyRate = 0.065 / 12;
    const months = 60;
    const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(payment);
  };

  const monthlyEst = calculateEstimatedMonthly(car.price);

  return (
    <div 
      onClick={() => onSelect(car)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex flex-col cursor-pointer"
    >
      {/* Top Image Showcase Container */}
      <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
        
        {/* Main Image with Smooth Lazy Loading */}
        <img
          src={images[activeImageIdx]}
          alt={`${car.year} ${car.make} ${car.model}`}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Gradient Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            {car.is_featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/90 text-slate-950 text-[10px] font-bold tracking-wide uppercase shadow-lg shadow-amber-500/20 backdrop-blur-md">
                <Sparkles className="w-3 h-3 fill-slate-950" />
                Featured
              </span>
            )}
            {car.carfax_clean && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Clean CARFAX
              </span>
            )}
          </div>

          {/* Compare Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompare(car);
            }}
            className={`pointer-events-auto p-2 rounded-full backdrop-blur-md transition-all ${
              isCompared
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/30'
                : 'bg-slate-950/70 text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
            title={isCompared ? 'Remove from comparison' : 'Add to compare'}
          >
            <GitCompare className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Carousel Navigation Arrows (visible on hover) */}
        {images.length > 1 && (
          <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              onClick={handlePrevImage}
              className="pointer-events-auto w-8 h-8 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-white flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="pointer-events-auto w-8 h-8 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-white flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dot Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeImageIdx ? 'w-5 bg-sky-400' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

      </div>

      {/* Card Body Info */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        
        <div>
          {/* Year & Make Header */}
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1">
            <span>{car.year} // {car.body_type.toUpperCase()}</span>
            <span className="text-slate-500">{car.vin.slice(0, 8)}...</span>
          </div>

          {/* Model Name */}
          <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-sky-400 transition-colors line-clamp-1 mb-2">
            {car.make} {car.model}
          </h3>

          {/* Engine & Color Subtitle */}
          <p className="text-xs text-slate-400 line-clamp-1 mb-4 font-normal">
            {car.engine} · {car.exterior_color}
          </p>

          {/* High-Impact Specs Grid */}
          <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-center mb-5">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Mileage</span>
              <span className="text-xs font-semibold text-slate-200">
                {car.mileage.toLocaleString()} mi
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Power</span>
              <span className="text-xs font-semibold text-sky-400">
                {car.horsepower} HP
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono block">Drivetrain</span>
              <span className="text-xs font-semibold text-slate-200">
                {car.drivetrain}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="pt-2 border-t border-slate-800/80">
          
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Purchase Price</span>
              <span className="text-2xl font-bold text-white tracking-tight">
                ${car.price.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-emerald-400 uppercase block">Est. Finance</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20">
                ~${monthlyEst}/mo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelect(car)}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>View Specs</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickBook(car);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-500/10 hover:bg-sky-500 hover:text-slate-950 text-sky-400 text-xs font-semibold border border-sky-500/30 transition-all duration-200"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Test Drive</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
