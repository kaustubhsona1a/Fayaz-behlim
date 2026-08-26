import React from 'react';
import { Car } from '../types';
import { X, GitCompare, ArrowRight, Gauge, DollarSign, Fuel, ShieldCheck } from 'lucide-react';

interface CompareDrawerProps {
  comparedCars: Car[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelectCar: (car: Car) => void;
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  comparedCars,
  onRemove,
  onClear,
  onSelectCar
}) => {
  if (comparedCars.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-2xl p-4 sm:p-6 animate-in slide-in-from-bottom-6 duration-300">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Vehicle Comparison ({comparedCars.length}/3)
            </h4>
          </div>
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {comparedCars.map((car) => (
            <div
              key={car.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 relative flex items-center gap-3.5"
            >
              <button
                onClick={() => onRemove(car.id)}
                className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-slate-950 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <img
                src={car.thumbnail_url}
                alt={car.model}
                className="w-16 h-12 object-cover rounded-xl shrink-0"
              />

              <div className="min-w-0 flex-1">
                <h5 className="text-xs font-bold text-white truncate">
                  {car.year} {car.make} {car.model}
                </h5>
                <div className="text-xs text-sky-400 font-mono font-bold">
                  ${car.price.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{car.horsepower} HP</span>
                  <span>·</span>
                  <span>{car.mileage.toLocaleString()} mi</span>
                </div>
              </div>

              <button
                onClick={() => onSelectCar(car)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-300 transition-colors"
                title="View full specs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
