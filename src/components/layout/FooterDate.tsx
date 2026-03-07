/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Clock, Calendar, Activity } from 'lucide-react';

export default function FooterDate() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="bg-slate-950/80 backdrop-blur-sm border-t border-slate-800/60 py-4 px-6 md:py-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 transition-all duration-300">
      {/* 日時表示セクション */}
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9px] md:text-[10px] font-black uppercase tracking-widest">
          <Calendar size={12} className="text-blue-500/50" />
          <span>
            {time.toLocaleDateString('ja-JP', { 
              year: 'numeric', 
              month: '2-digit', 
              day: '2-digit', 
              weekday: 'short' 
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9px] md:text-[10px] font-black uppercase tracking-widest">
          <Clock size={12} className="text-blue-500/50" />
          <span>
            {time.toLocaleTimeString('ja-JP', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })}
          </span>
        </div>
      </div>
      
      {/* システムステータスセクション */}
      <div className="flex items-center justify-between w-full md:w-auto gap-6 md:gap-8 border-t border-slate-800/40 pt-3 md:pt-0 md:border-t-0">
        <div className="flex items-center gap-2.5">
          <div className="text-left md:text-right leading-tight">
            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Latency</div>
            <div className="text-[9px] md:text-[10px] font-mono font-bold text-emerald-500 flex items-center gap-1.5">
              <Activity size={10} className="animate-pulse" />
              14ms / STABLE
            </div>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] hidden md:block" />
        </div>
        
        <div className="text-[8px] md:text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] whitespace-nowrap">
          Nexus Ver.3.0.0-PRO
        </div>
      </div>
    </footer>
  );
}