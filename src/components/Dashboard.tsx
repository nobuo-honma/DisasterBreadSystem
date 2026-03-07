/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { BookOpen, AlertTriangle, Package, History, Activity, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { dashboardService } from '../services/dashboardService';
import type { TItemStock, TMfgPlan, TStocktakingLog } from '../types';

export default function Dashboard() {
  const [data, setData] = useState<{
    alerts: TItemStock[];
    todayPlans: TMfgPlan[];
    stocktakingLogs: TStocktakingLog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await dashboardService.getDashboardData();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの同期に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 在庫アラートの重要度によるソート (欠品 > 在庫少)
  const sortedAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return [...data.alerts].sort((a, b) => 
      a.stock_status === '欠品' ? -1 : 1
    );
  }, [data?.alerts]);

  if (loading && !data) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-slate-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-2 border-blue-600/30 border-t-blue-500 mb-6 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
        />
        <p className="animate-pulse font-black tracking-[0.3em] text-[10px] uppercase text-slate-500">
          Synchronizing Neural Interface...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/60 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-1 w-8 bg-blue-600 rounded-full" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Central Command</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
            Dashboard <span className="text-slate-600 text-2xl font-light not-italic ml-2">Overview</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={fetchData}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all"
            title="再読み込み"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-black text-white transition-all shadow-lg shadow-blue-900/20 group">
            <BookOpen size={16} />
            操作マニュアル
            <ExternalLink size={12} className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center gap-3"
        >
          <AlertTriangle size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">{error}</span>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: ALERTS & PLANS */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 在庫不足アラート */}
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-4xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="px-8 py-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Critical Stock Alerts</h2>
              </div>
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                {sortedAlerts.length} ISSUES
              </span>
            </div>
            
            <div className="p-6">
              {sortedAlerts.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="mx-auto mb-4 text-slate-800" size={48} />
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest italic">All Inventory Levels Stable</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <AnimatePresence>
                    {sortedAlerts.map((a) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={a.id}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                          a.stock_status === '欠品' 
                            ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40' 
                            : 'bg-slate-950/40 border-slate-800 hover:border-amber-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${a.stock_status === '欠品' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{a.stock_status}</span>
                            <span className="text-sm font-black text-white tracking-tight">{a.item_code}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] text-slate-600 font-bold uppercase mb-0.5">Physical Stock</div>
                          <div className={`text-lg font-black font-mono ${a.stock_status === '欠品' ? 'text-rose-500' : 'text-amber-500'}`}>
                            {a.available_stock} <span className="text-[10px] text-slate-500">qty</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>

          {/* 本日の予定 */}
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-4xl shadow-2xl overflow-hidden backdrop-blur-md transition-all hover:border-slate-700/50">
            <div className="px-8 py-6 border-b border-slate-800/50 flex items-center gap-3 bg-slate-800/20">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Production Schedule</h2>
            </div>
            <div className="p-6">
              {!data?.todayPlans.length ? (
                <div className="py-16 text-center text-slate-600 text-xs font-bold uppercase tracking-widest italic opacity-40">
                  No plans scheduled for today
                </div>
              ) : (
                <div className="grid gap-4">
                  {data.todayPlans.map((p) => (
                    <div key={p.id} className="group flex items-center gap-5 p-5 rounded-2xl border border-slate-800/60 bg-slate-950/20 hover:bg-blue-600/5 transition-all">
                      <div className="bg-blue-600/10 p-3 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                        <Package className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black text-blue-500/80 bg-blue-500/10 px-2 rounded leading-none py-1 uppercase">{p.plan_code}</span>
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{p.status}</span>
                        </div>
                        <div className="text-md font-black text-slate-200 truncate tracking-tight">{p.product_code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-white font-mono">{p.amount_kg}<span className="text-[10px] text-slate-500 ml-1">kg</span></div>
                        <div className="text-[9px] font-black text-slate-600 uppercase">Target Mass</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: LOGS */}
        <div className="lg:col-span-5">
          <section className="bg-slate-900/40 border border-slate-800/50 rounded-4xl shadow-2xl overflow-hidden backdrop-blur-md flex flex-col h-full sticky top-6">
            <div className="px-8 py-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-800/20">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-slate-500" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity Log</h2>
              </div>
              <span className="text-[9px] font-black text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase">Realtime</span>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[700px] custom-scrollbar">
              {!data?.stocktakingLogs.length ? (
                <div className="py-32 text-center opacity-30 italic text-xs font-bold text-slate-500 uppercase tracking-widest">
                  History Stream Empty
                </div>
              ) : (
                <div className="space-y-2">
                  {data.stocktakingLogs.map((l) => (
                    <div key={l.id} className="flex items-center p-4 rounded-2xl hover:bg-white/2 transition-colors border border-transparent hover:border-slate-800/60">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-200 truncate">{l.item_code}</div>
                        <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase">
                          {new Date(l.adjusted_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} • 
                          <span className="ml-1 opacity-60">Manual Adj.</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-600 line-through decoration-slate-700">{l.before_stock}</span>
                            <ChevronRight size={12} className="text-slate-700" />
                            <span className="text-blue-400">{l.after_stock}</span>
                          </div>
                          <div className={`text-[10px] font-black mt-1 px-2 py-0.5 rounded ${
                            l.after_stock > l.before_stock ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                          }`}>
                            {l.after_stock > l.before_stock ? `+${l.after_stock - l.before_stock}` : l.after_stock - l.before_stock}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}