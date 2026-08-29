import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Car } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-6">
        <Car className="w-8 h-8 text-zinc-400" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-widest uppercase mb-3">
        404
      </h1>
      <p className="text-zinc-400 text-sm font-mono uppercase tracking-wider mb-8 max-w-md">
        The showroom page or vehicle you are looking for does not exist or has been moved.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-lg font-mono text-xs uppercase tracking-widest font-bold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Showroom
        </Link>
        <Link
          to="/inventory"
          className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 px-6 py-3 rounded-lg font-mono text-xs uppercase tracking-widest font-bold transition-all"
        >
          Browse Inventory
        </Link>
      </div>
    </div>
  );
}
