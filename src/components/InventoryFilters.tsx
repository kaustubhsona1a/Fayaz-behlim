import React, { useState } from 'react';
import { FilterState, Car } from '../types';
import { 
  Search, 
  X, 
  RotateCcw, 
  SlidersHorizontal, 
  DollarSign, 
  Calendar, 
  Gauge, 
  Fuel, 
  Sparkles,
  Check,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';

interface InventoryFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  availableCars: Car[];
}

export const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  availableCars
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Extract unique makes from inventory
  const allMakes: string[] = Array.from(new Set<string>(availableCars.map((c) => c.make))).sort();
  const allBodyTypes = ['Coupe', 'Sedan', 'SUV', 'Convertible', 'Wagon', 'Truck'] as const;
  const allFuelTypes = ['Gasoline', 'Electric', 'Hybrid', 'Plug-in Hybrid'] as const;
  const allTransmissions = ['Automatic', 'Dual-Clutch', 'Manual', 'Single-Speed'] as const;

  const handleMakeToggle = (make: string) => {
    const nextMakes = filters.makes.includes(make)
      ? filters.makes.filter((m) => m !== make)
      : [...filters.makes, make];
    onFilterChange({ ...filters, makes: nextMakes });
  };

  const handleBodyTypeToggle = (bt: string) => {
    const nextBodyTypes = filters.bodyTypes.includes(bt)
      ? filters.bodyTypes.filter((b) => b !== bt)
      : [...filters.bodyTypes, bt];
    onFilterChange({ ...filters, bodyTypes: nextBodyTypes });
  };

  const handleFuelToggle = (fuel: string) => {
    const nextFuel = filters.fuelTypes.includes(fuel)
      ? filters.fuelTypes.filter((f) => f !== fuel)
      : [...filters.fuelTypes, fuel];
    onFilterChange({ ...filters, fuelTypes: nextFuel });
  };

  const handleTransmissionToggle = (tx: string) => {
    const nextTx = filters.transmissions.includes(tx)
      ? filters.transmissions.filter((t) => t !== tx)
      : [...filters.transmissions, tx];
    onFilterChange({ ...filters, transmissions: nextTx });
  };

  // Quick preset handlers
  const applyPreset = (preset: 'under100k' | 'porsche' | 'electric' | 'highPower') => {
    switch (preset) {
      case 'under100k':
        onFilterChange({
          ...filters,
          priceMax: 100000,
          makes: [],
          fuelTypes: [],
          bodyTypes: []
        });
        break;
      case 'porsche':
        onFilterChange({
          ...filters,
          makes: ['Porsche'],
          priceMax: 300000
        });
        break;
      case 'electric':
        onFilterChange({
          ...filters,
          fuelTypes: ['Electric', 'Hybrid'],
          makes: []
        });
        break;
      case 'highPower':
        onFilterChange({
          ...filters,
          sortBy: 'featured'
        });
        break;
    }
  };

  const activeFilterCount = 
    (filters.searchQuery ? 1 : 0) +
    filters.makes.length +
    filters.bodyTypes.length +
    filters.fuelTypes.length +
    filters.transmissions.length +
    (filters.priceMax < 300000 ? 1 : 0) +
    (filters.mileageMax < 50000 ? 1 : 0) +
    (filters.yearMin > 2020 ? 1 : 0);

  return (
    <div id="filters-section" className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl mb-10">
      
      {/* Top Search & Results Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by make, model, engine, or VIN (e.g. GT3, Turbo, V8)..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl pl-12 pr-10 py-3.5 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 placeholder:text-slate-500 transition-all"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & Toggle Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Sort Dropdown */}
          <div className="relative flex items-center bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5">
            <ArrowUpDown className="w-4 h-4 text-sky-400 mr-2" />
            <span className="text-xs text-slate-400 mr-2 font-medium">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
              className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-4"
            >
              <option value="featured" className="bg-slate-900">Featured Vehicles</option>
              <option value="price_asc" className="bg-slate-900">Price: Low to High</option>
              <option value="price_desc" className="bg-slate-900">Price: High to Low</option>
              <option value="year_desc" className="bg-slate-900">Year: Newest First</option>
              <option value="mileage_asc" className="bg-slate-900">Mileage: Lowest First</option>
            </select>
          </div>

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold border transition-all ${
              isAdvancedOpen || activeFilterCount > 0
                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

        </div>
      </div>

      {/* Brand Selector Quick Chips */}
      <div className="py-4 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-medium text-slate-400 shrink-0 mr-2">Brand:</span>
        <button
          onClick={() => onFilterChange({ ...filters, makes: [] })}
          className={`text-xs font-medium px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
            filters.makes.length === 0
              ? 'bg-sky-500 text-slate-950 font-semibold shadow-md shadow-sky-500/20'
              : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Brands ({totalCount})
        </button>

        {allMakes.map((make) => {
          const isSelected = filters.makes.includes(make);
          const count = availableCars.filter((c) => c.make === make).length;
          return (
            <button
              key={make}
              onClick={() => handleMakeToggle(make)}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full shrink-0 transition-all ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 font-semibold shadow-md shadow-sky-500/20'
                  : 'bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 border border-slate-800'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              <span>{make}</span>
              <span className={`text-[10px] ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Filter Presets */}
      <div className="pt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 mr-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Quick Filters:
        </span>
        <button
          onClick={() => applyPreset('under100k')}
          className="text-xs px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          Under $100K
        </button>
        <button
          onClick={() => applyPreset('porsche')}
          className="text-xs px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          Porsche Specialists
        </button>
        <button
          onClick={() => applyPreset('electric')}
          className="text-xs px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
        >
          Electric & Hybrid
        </button>
      </div>

      {/* Expandable Advanced Multi-Facet Filter Tray */}
      {isAdvancedOpen && (
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-200">
          
          {/* Price Range Slider */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Max Price
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ${filters.priceMax.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="50000"
              max="300000"
              step="5000"
              value={filters.priceMax}
              onChange={(e) => onFilterChange({ ...filters, priceMax: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
              <span>$50K</span>
              <span>$150K</span>
              <span>$300K+</span>
            </div>
          </div>

          {/* Max Mileage Slider */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-3">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                Max Mileage
              </span>
              <span className="text-sky-400 font-mono font-bold text-sm">
                {filters.mileageMax.toLocaleString()} mi
              </span>
            </div>
            <input
              type="range"
              min="5000"
              max="50000"
              step="2500"
              value={filters.mileageMax}
              onChange={(e) => onFilterChange({ ...filters, mileageMax: Number(e.target.value) })}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2">
              <span>5K</span>
              <span>25K</span>
              <span>50K+</span>
            </div>
          </div>

          {/* Body Style Multi-select */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 block mb-3">
              Body Style
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {allBodyTypes.map((bt) => {
                const active = filters.bodyTypes.includes(bt);
                return (
                  <button
                    key={bt}
                    onClick={() => handleBodyTypeToggle(bt)}
                    className={`text-xs py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      active
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {bt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fuel & Powertrain */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-200 block mb-3 flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Powertrain
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {allFuelTypes.map((ft) => {
                const active = filters.fuelTypes.includes(ft);
                return (
                  <button
                    key={ft}
                    onClick={() => handleFuelToggle(ft)}
                    className={`text-xs py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      active
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-semibold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ft}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Results Header Count */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div>
          SHOWING <span className="text-white font-bold">{filteredCount}</span> OF{' '}
          <span className="text-white font-bold">{totalCount}</span> MOTOR VEHICLES
        </div>
        {filteredCount === 0 && (
          <button
            onClick={onResetFilters}
            className="text-sky-400 hover:underline font-sans"
          >
            Clear filters to view all inventory
          </button>
        )}
      </div>

    </div>
  );
};
