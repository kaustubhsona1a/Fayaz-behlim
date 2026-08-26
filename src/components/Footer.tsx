import React from 'react';
import { ShieldCheck, MapPin, Phone, Mail, Clock, Award, CheckCircle2 } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        
        {/* Brand & Guarantee */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-white text-lg tracking-widest uppercase">
              APEX MOTORS
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Northern California’s destination for collector-grade pre-owned sports cars, luxury grand tourers, and performance icons. 150-point certified.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>CARFAX Advantage® Dealer</span>
          </div>
        </div>

        {/* Location & Showroom */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Showroom & Gallery
          </h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>4200 Apex Boulevard, Performance District, Silicon Valley, CA 94025</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Direct Concierge: (800) 555-APEX</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span>concierge@apexmotors.com</span>
            </div>
          </div>
        </div>

        {/* Showroom Hours */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Operating Hours
          </h4>
          <div className="space-y-2 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Monday – Friday:</span>
              <span className="text-slate-200">9:00 AM – 8:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Saturday:</span>
              <span className="text-slate-200">10:00 AM – 7:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span>Sunday:</span>
              <span className="text-slate-200">11:00 AM – 5:00 PM (By Appt)</span>
            </div>
          </div>
        </div>

        {/* Certified Standards */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            The Apex Promise
          </h4>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              150-Point Master Mechanical Certification
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              Nationwide Enclosed Transport Available
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              7-Day / 500-Mile Exchange Guarantee
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
              Competitive Tier-1 Financing Options
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <span>© {new Date().getFullYear()} Apex Motors LLC. All rights reserved.</span>
        <div className="flex gap-6">
          <span className="hover:text-slate-400 cursor-pointer">Privacy Policy</span>
          <span className="hover:text-slate-400 cursor-pointer">Terms of Purchase</span>
          <span className="hover:text-slate-400 cursor-pointer">CARFAX Disclaimer</span>
        </div>
      </div>
    </footer>
  );
};
