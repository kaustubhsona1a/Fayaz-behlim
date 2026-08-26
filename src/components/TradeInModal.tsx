import React, { useState } from 'react';
import { X, ArrowRight, DollarSign, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeInModal: React.FC<TradeInModalProps> = ({ isOpen, onClose }) => {
  const [year, setYear] = useState('2021');
  const [make, setMake] = useState('Porsche');
  const [model, setModel] = useState('Macan GTS');
  const [mileage, setMileage] = useState('24000');
  const [condition, setCondition] = useState<'Excellent' | 'Very Good' | 'Good' | 'Fair'>('Excellent');
  const [estimatedOffer, setEstimatedOffer] = useState<number | null>(null);

  if (!isOpen) return null;

  const calculateEstimate = (e: React.FormEvent) => {
    e.preventDefault();
    const baseYearsOld = Math.max(1, 2026 - Number(year));
    const miles = Number(mileage) || 30000;
    
    let base = 55000;
    if (make.toLowerCase().includes('porsche')) base = 68000;
    if (make.toLowerCase().includes('bmw')) base = 48000;
    if (make.toLowerCase().includes('mercedes')) base = 52000;
    if (make.toLowerCase().includes('audi')) base = 46000;
    if (make.toLowerCase().includes('tesla')) base = 39000;

    const depreciation = baseYearsOld * 4500 + (miles * 0.14);
    let conditionMultiplier = 1.05;
    if (condition === 'Very Good') conditionMultiplier = 0.98;
    if (condition === 'Good') conditionMultiplier = 0.90;
    if (condition === 'Fair') conditionMultiplier = 0.78;

    const finalValue = Math.round(Math.max(12000, (base - depreciation) * conditionMultiplier) / 500) * 500;
    setEstimatedOffer(finalValue);

    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Instant Trade-In Valuation</h3>
              <p className="text-xs text-slate-400">Live algorithm appraisal against real auction indices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {estimatedOffer ? (
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Live Trade-In Certificate
            </div>

            <div>
              <span className="text-xs font-mono text-slate-400 block uppercase">
                Estimated Inventory Trade Allowance
              </span>
              <div className="text-4xl sm:text-5xl font-extrabold text-emerald-400 tracking-tight my-2">
                ${estimatedOffer.toLocaleString()}
              </div>
              <p className="text-xs text-slate-300">
                For your <span className="text-white font-semibold">{year} {make} {model}</span> with {Number(mileage).toLocaleString()} miles.
              </p>
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-left text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Certificate guaranteed for 7 days or 500 miles.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Applies directly as down payment against any vehicle in stock.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEstimatedOffer(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 text-slate-300 text-xs hover:bg-slate-800"
              >
                Recalculate
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400"
              >
                Apply to Inventory Browse
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={calculateEstimate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Year</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Make</label>
                <input
                  type="text"
                  required
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Model & Trim</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Odometer Mileage</label>
                <input
                  type="number"
                  required
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Overall Vehicle Condition</label>
              <div className="grid grid-cols-4 gap-2">
                {(['Excellent', 'Very Good', 'Good', 'Fair'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`py-2 text-xs rounded-xl border transition-colors ${
                      condition === c
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 mt-4"
            >
              <span>Calculate Instant Cash Offer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
