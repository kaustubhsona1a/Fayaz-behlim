import React, { useState } from 'react';
import { Car, TestDriveBooking } from '../types';
import { 
  X, 
  ShieldCheck, 
  Gauge, 
  Zap, 
  Calendar, 
  DollarSign, 
  Fuel, 
  Award, 
  Check, 
  Share2, 
  Printer, 
  FileText,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Calculator,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CarDetailModalProps {
  car: Car | null;
  onClose: () => void;
  onBookTestDrive: (booking: Omit<TestDriveBooking, 'id' | 'createdAt'>) => Promise<void>;
}

export const CarDetailModal: React.FC<CarDetailModalProps> = ({
  car,
  onClose,
  onBookTestDrive
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'calculator' | 'book'>('overview');
  
  // Finance Calculator state
  const [downPayment, setDownPayment] = useState<number>(car ? Math.round(car.price * 0.15) : 0);
  const [tradeInValue, setTradeInValue] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(6.49);
  const [termMonths, setTermMonths] = useState<number>(60);
  const [salesTaxRate, setSalesTaxRate] = useState<number>(7.25);

  // Booking Form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!car) return null;

  const images = car.images && car.images.length > 0 ? car.images : [car.thumbnail_url];

  // Financial calculations
  const taxAmount = (car.price - tradeInValue) * (salesTaxRate / 100);
  const totalFinanced = Math.max(0, car.price + taxAmount - downPayment - tradeInValue);
  const monthlyInterestRate = (interestRate / 100) / 12;
  const monthlyPayment = totalFinanced > 0 && monthlyInterestRate > 0
    ? (totalFinanced * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths)) / (Math.pow(1 + monthlyInterestRate, termMonths) - 1)
    : totalFinanced / termMonths;
  const totalLoanCost = (monthlyPayment * termMonths) + downPayment;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !customerPhone || !preferredDate) return;
    
    setIsSubmitting(true);
    try {
      await onBookTestDrive({
        carId: car.id,
        carName: `${car.year} ${car.make} ${car.model}`,
        customerName,
        customerEmail,
        customerPhone,
        preferredDate,
        preferredTime,
        comments: bookingNotes
      });
      setIsSubmitting(false);
      setBookingSuccess(true);
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const copyShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('carId', car.id);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
      
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>STOCK #{car.id.toUpperCase()}</span>
              <span>·</span>
              <span className="text-sky-400">VIN: {car.vin}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {car.year} {car.make} {car.model}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyShareLink}
              className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
              title="Copy shareable link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Gallery Showcase */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
              <img
                src={images[activeImgIdx]}
                alt={`${car.year} ${car.make} ${car.model}`}
                className="w-full h-full object-cover object-center"
              />

              {images.length > 1 && (
                <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between">
                  <button
                    onClick={() => setActiveImgIdx((prev) => (prev - 1 + images.length) % images.length)}
                    className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveImgIdx((prev) => (prev + 1) % images.length)}
                    className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-slate-300 border border-white/10">
                PHOTO {activeImgIdx + 1} OF {images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImgIdx(idx)}
                    className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      idx === activeImgIdx ? 'border-sky-400 scale-95' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex border-b border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'overview' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Vehicle Overview
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'specs' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Technical Specs
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'calculator' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Payment Calculator
            </button>
            <button
              onClick={() => setActiveTab('book')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'book' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Schedule VIP Test Drive
            </button>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Highlights row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Mileage</span>
                    <span className="text-base font-bold text-white">{car.mileage.toLocaleString()} mi</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Engine</span>
                    <span className="text-base font-bold text-sky-400">{car.horsepower} HP</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">0-60 MPH</span>
                    <span className="text-base font-bold text-emerald-400">{car.zero_to_sixty_sec || 3.5}s</span>
                  </div>
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Drivetrain</span>
                    <span className="text-base font-bold text-white">{car.drivetrain}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800/80">
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                    Dealer Description & Pedigree
                  </h4>
                  <p className="text-sm text-slate-300 leading-relaxed font-normal">
                    {car.description}
                  </p>
                </div>

                {/* Key Features & Options Checklist */}
                <div>
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    Factory Packages & Highlights
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {car.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CARFAX History Assurance */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-5 rounded-2xl flex items-start gap-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-bold text-emerald-300 mb-1">
                      CARFAX® Verified Clean Title
                    </h5>
                    <p className="text-xs text-emerald-200/80 leading-relaxed mb-2">
                      Zero reported accident damage, {car.num_owners || 1} registered private owner, regular dealership service intervals recorded.
                    </p>
                    <span className="text-[11px] font-mono text-emerald-400 underline cursor-pointer">
                      View Official Inspection & CARFAX Report PDF
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column: Pricing & Action Box */}
              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-mono text-slate-400 uppercase block mb-1">
                    Apex Listed Price
                  </span>
                  <div className="text-4xl font-extrabold text-white tracking-tight mb-2">
                    ${car.price.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400 mb-6">
                    Estimated payment: <span className="text-emerald-400 font-semibold font-mono">~${Math.round(monthlyPayment)}/mo</span>
                  </div>

                  <div className="space-y-3 font-mono text-xs text-slate-300 border-t border-b border-slate-800 py-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Exterior Color:</span>
                      <span className="text-white text-right">{car.exterior_color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Interior Trim:</span>
                      <span className="text-white text-right">{car.interior_color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transmission:</span>
                      <span className="text-white">{car.transmission}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fuel Type:</span>
                      <span className="text-white">{car.fuel_type}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('book')}
                    className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Book Test Drive</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('calculator')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Calculator className="w-4 h-4 text-sky-400" />
                    <span>Calculate Monthly Payment</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Technical Specs */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Engine & Performance */}
                <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800">
                  <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Engine & Drivetrain
                  </h4>
                  <div className="space-y-3 font-mono text-xs divide-y divide-slate-800">
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Engine Type</span>
                      <span className="text-white font-semibold">{car.engine}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Horsepower</span>
                      <span className="text-sky-400 font-semibold">{car.horsepower} HP</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Torque</span>
                      <span className="text-white">{car.torque_lb_ft || 350} lb-ft</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">0 - 60 MPH</span>
                      <span className="text-emerald-400 font-semibold">{car.zero_to_sixty_sec || 3.5} seconds</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Transmission</span>
                      <span className="text-white">{car.transmission}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Drivetrain</span>
                      <span className="text-white">{car.drivetrain}</span>
                    </div>
                  </div>
                </div>

                {/* Efficiency & Identification */}
                <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800">
                  <h4 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    Economy & Chassis
                  </h4>
                  <div className="space-y-3 font-mono text-xs divide-y divide-slate-800">
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">City / Highway Fuel Economy</span>
                      <span className="text-white">{car.mpg_city || 16} / {car.mpg_hwy || 22} MPG</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Body Configuration</span>
                      <span className="text-white">{car.body_type}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Exterior Finish</span>
                      <span className="text-white">{car.exterior_color}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Interior Upholstery</span>
                      <span className="text-white">{car.interior_color}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">VIN Identification</span>
                      <span className="text-white">{car.vin}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-slate-400">Mileage Recorded</span>
                      <span className="text-white">{car.mileage.toLocaleString()} mi</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 3: Finance Calculator */}
          {activeTab === 'calculator' && (
            <div className="bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-800">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Sliders */}
                <div className="lg:col-span-2 space-y-6">
                  <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-sky-400" />
                    Customize Your Financing Terms
                  </h4>

                  {/* Down Payment */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-semibold">Down Payment (Cash)</span>
                      <span className="text-sky-400 font-mono font-bold">${downPayment.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={car.price * 0.5}
                      step="1000"
                      value={downPayment}
                      onChange={(e) => setDownPayment(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  {/* Trade-In Value */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-semibold">Trade-in Allowance</span>
                      <span className="text-sky-400 font-mono font-bold">${tradeInValue.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60000"
                      step="1000"
                      value={tradeInValue}
                      onChange={(e) => setTradeInValue(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  {/* Term Months */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-semibold">Loan Duration (Months)</span>
                      <span className="text-sky-400 font-mono font-bold">{termMonths} Months</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[36, 48, 60, 72].map((m) => (
                        <button
                          key={m}
                          onClick={() => setTermMonths(m)}
                          className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                            termMonths === m
                              ? 'bg-sky-500 text-slate-950 border-sky-400'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {m} Mo
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* APR Interest Rate */}
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300 font-semibold">Estimated APR</span>
                      <span className="text-sky-400 font-mono font-bold">{interestRate}%</span>
                    </div>
                    <input
                      type="range"
                      min="3.0"
                      max="14.0"
                      step="0.1"
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase text-slate-400 block mb-1">
                      Estimated Monthly Payment
                    </span>
                    <div className="text-4xl font-extrabold text-emerald-400 tracking-tight mb-6">
                      ${Math.round(monthlyPayment).toLocaleString()}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-slate-300 border-t border-slate-800 pt-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vehicle Base Price:</span>
                        <span>${car.price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Estimated Sales Tax ({salesTaxRate}%):</span>
                        <span>${Math.round(taxAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Financed Amount:</span>
                        <span className="text-white font-semibold">${Math.round(totalFinanced).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Interest Paid:</span>
                        <span>${Math.round(Math.max(0, (monthlyPayment * termMonths) - totalFinanced)).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab('book')}
                    className="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                  >
                    Apply for Pre-Approval with this Term
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Book Test Drive Form */}
          {activeTab === 'book' && (
            <div className="bg-slate-900/80 p-6 sm:p-8 rounded-3xl border border-slate-800 max-w-2xl mx-auto">
              {bookingSuccess ? (
                <div className="text-center py-8 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="text-2xl font-bold text-white">VIP Test Drive Confirmed!</h4>
                  <p className="text-sm text-slate-300 max-w-md mx-auto">
                    Thank you, <span className="text-white font-semibold">{customerName}</span>. Your appointment for the{' '}
                    <span className="text-sky-400 font-semibold">{car.year} {car.make} {car.model}</span> is locked for{' '}
                    <span className="text-white font-semibold">{preferredDate} at {preferredTime}</span>.
                  </p>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-mono text-slate-400">
                    A confirmation SMS & calendar invite have been dispatched.
                  </div>
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      onClose();
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400"
                  >
                    Return to Inventory
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-white">Schedule Private Test Drive</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Experience this {car.make} {car.model} firsthand with our certified product concierge.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="(555) 000-0000"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Date *</label>
                      <input
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Time Slot *</label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="11:00 AM">11:00 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="03:30 PM">03:30 PM</option>
                        <option value="05:30 PM">05:30 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Special Inquiries / Trade-In Notes (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Have questions on trade-in value, ceramic coating, or delivery?"
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? 'Securing Slot...' : 'Confirm Test Drive Appointment'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
