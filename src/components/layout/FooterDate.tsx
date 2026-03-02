/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Clock, Calendar } from 'lucide-react';

export default function FooterDate() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-slate-950 border-t border-slate-800/60 py-6 px-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] font-black uppercase tracking-widest">
          <Calendar size={14} className="text-blue-500/50" />
          {time.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] font-black uppercase tracking-widest">
          <Clock size={14} className="text-blue-500/50" />
          {time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">System Latency</div>
            <div className="text-[10px] font-mono font-bold text-emerald-500">14ms / STABLE</div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        </div>
        
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.2em]">
          Nexus ERP v2.4.0-Stable
        </div>
      </div>
    </footer>
  );
}
