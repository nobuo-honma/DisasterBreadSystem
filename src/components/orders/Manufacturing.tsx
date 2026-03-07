/**
 * Manufacturing.tsx - Production Planning & Calendar System
 * * 機能概要:
 * 1. 受注データに基づいた製造分割計画の作成
 * 2. カレンダー形式でのスケジュール可視化
 * 3. ドラッグ&ドロップによる日程調整
 * 4. 製造完了時の在庫自動連携
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  CheckCircle2, Package, Trash2, Printer, Loader2,
  Gauge, MapPin, Plus, AlertTriangle, ChevronDown, 
  Save, GripVertical, Factory, X, Calendar as CalendarIcon,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { orderService } from '../../services/orderService';
import { masterService } from '../../services/masterService';
import { manufacturingService } from '../../services/manufacturingService';
import { TOrder, MProduct, MDestination, TMfgPlan } from '../../types';

// ─── 型定義 ──────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';
interface ToastMsg { id: number; type: ToastType; message: string; }

interface CalendarEntry {
  order: TOrder;
  plan: TMfgPlan;
  planIndex: number;
}

// ─── 共通コンポーネント: Toast ───────────────────────────────
const Toast = ({ toasts, onRemove }: { toasts: ToastMsg[], onRemove: (id: number) => void }) => (
  <div className="fixed top-6 right-6 z-[100] space-y-3 pointer-events-none">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div key={t.id} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
          className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 pointer-events-auto border backdrop-blur-md ${
            t.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100' :
            t.type === 'error' ? 'bg-rose-900/90 border-rose-500/50 text-rose-100' : 'bg-slate-900/90 border-slate-500/50 text-slate-100'
          }`}>
          {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-black tracking-wider uppercase">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-4 opacity-50 hover:opacity-100"><X size={14} /></button>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ─── 共通コンポーネント: StatusBadge ──────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    '完了': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    '製造中': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    '計画': 'bg-slate-800 text-slate-400 border-slate-700',
  }[status] || 'bg-slate-800 text-slate-400';

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-tighter ${styles}`}>
      {status}
    </span>
  );
};

// ─── 共通コンポーネント: 製造実績入力モーダル ───────────────────
const ProductionResultModal = ({ order, plan, onSave, onCancel }: { 
  order: TOrder, plan: TMfgPlan, onSave: (data: any) => Promise<void>, onCancel: () => void 
}) => {
  const [lot, setLot] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-4xl p-10 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-8 text-orange-500">
          <div className="p-3 bg-orange-500/10 rounded-2xl"><ClipboardCheck size={24} /></div>
          <div>
            <h3 className="text-xl font-black text-white uppercase italic">Complete Production</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Register Manufacturing Results</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
            <p className="text-[9px] text-slate-600 font-black uppercase mb-1">Target Product</p>
            <p className="text-sm font-bold text-slate-200">{order.product_name_at_order}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Manufacturing Lot Number</label>
            <input type="text" value={lot} onChange={e => setLot(e.target.value)} placeholder="例: 260307-A"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-sm font-mono text-white outline-none focus:border-orange-600 transition-all" />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onCancel} className="flex-1 py-4 rounded-2xl text-[10px] font-black text-slate-500 hover:bg-slate-800 transition-all uppercase">Cancel</button>
            <button onClick={() => { setIsSaving(true); onSave({ mfg_lot: lot }).finally(() => setIsSaving(false)); }}
              disabled={!lot || isSaving}
              className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 rounded-2xl text-[10px] font-black text-white transition-all shadow-lg shadow-orange-900/20 uppercase">
              {isSaving ? 'Registering...' : 'Register Result'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─── 共通コンポーネント: ステータス切替ポップオーバー ──────────────
const StatusPopover = ({ current, onSelect, onClose }: { current: string, onSelect: (s: string) => void, onClose: () => void }) => (
  <div className="absolute top-full right-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1 overflow-hidden animate-in fade-in zoom-in duration-150">
    {['計画', '製造中', '完了'].map(s => (
      <button key={s} onClick={(e) => { e.stopPropagation(); onSelect(s); onClose(); }}
        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black transition-colors ${current === s ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        {s}
      </button>
    ))}
  </div>
);
// ─── メインコンポーネント: Manufacturing ─────────────────────────
export default function Manufacturing() {
  // 1. 状態管理（State Management）
  const [viewMode, setViewMode] = useState<'editor' | 'calendar'>('editor');
  const [orders, setOrders] = useState<TOrder[]>([]);
  const [products, setProducts] = useState<MProduct[]>([]);
  const [destinations, setDestinations] = useState<MDestination[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<TMfgPlan[]>([]);
  const [allPlans, setAllPlans] = useState<Record<string, TMfgPlan[]>>({});
  
  // カレンダー制御
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // ドラッグ&ドロップ / モーダル
  const [dragging, setDragging] = useState<CalendarEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{ order: TOrder; plan: TMfgPlan } | null>(null);

  // 通知（Toast）
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const seq = useRef(0);

  // 2. データフェッチ（Data Fetching）
  const addToast = useCallback((type: ToastType, msg: string) => {
    const id = ++seq.current;
    setToasts(p => [...p, { id, type, message: msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [ro, rp, rd, rpm] = await Promise.all([
          orderService.getOrders(),
          masterService.getProducts(),
          masterService.getDestinations(),
          manufacturingService.getAllPlans(),
        ]);
        setOrders(ro ?? []);
        setProducts(rp ?? []);
        setDestinations(rd ?? []);
        
        const map: Record<string, TMfgPlan[]> = {};
        for (const d of (rpm ?? [])) {
          if (!map[d.order_code]) map[d.order_code] = [];
          map[d.order_code].push(d);
        }
        setAllPlans(map);
      } catch { addToast('error', 'データの取得に失敗しました'); }
      finally { setLoading(false); }
    })();
  }, [addToast]);

  // 3. ユーティリティ・計算（Calculations）
  const generatePlanCode = (orderCode: string, index: number) => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PLN-${orderCode}-${date}-${String(index + 1).padStart(2, '0')}`;
  };

  const currentProduct = useMemo(() => 
    products.find(p => p.product_code === selectedOrder?.product_code), 
  [products, selectedOrder]);

  const metrics = useMemo(() => {
    if (!selectedOrder || !currentProduct) return { totalWeight: 0, plannedWeight: 0, remainingWeight: 0, progress: 0 };
    const unitsPerKg = currentProduct.units_per_kg || 1;
    const totalWeight = (selectedOrder.quantity_cs * currentProduct.units_per_cs) / unitsPerKg;
    const plannedWeight = plans.reduce((s, p) => s + (Number(p.amount_kg) || 0), 0);
    return { 
      totalWeight, 
      plannedWeight, 
      remainingWeight: totalWeight - plannedWeight, 
      progress: totalWeight > 0 ? Math.min((plannedWeight / totalWeight) * 100, 100) : 0 
    };
  }, [selectedOrder, currentProduct, plans]);

  const calcCs = useCallback((weight: number | string) => {
    if (!currentProduct || !currentProduct.units_per_cs) return 0;
    const unitsPerKg = currentProduct.units_per_kg || 1;
    return Math.floor((Number(weight) * unitsPerKg) / currentProduct.units_per_cs);
  }, [currentProduct]);

  // 4. イベントハンドラー（Handlers）
  const handleSavePlans = async () => {
    if (!selectedOrder) return;
    setIsSubmitting(true);
    try {
      await manufacturingService.savePlans(selectedOrder.order_code, plans);
      setAllPlans(prev => ({ ...prev, [selectedOrder.order_code]: plans }));
      addToast('success', '製造計画を保存しました');
    } catch { addToast('error', '保存に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusChange = useCallback(async (entry: CalendarEntry) => {
    const { order, plan, planIndex } = entry;
    if (!plan.id) { addToast('warning', 'DB保存前の計画は変更できません'); return; }
    
    try {
      await manufacturingService.updatePlanStatus(plan.id, plan.status);
      setAllPlans(prev => {
        const arr = [...(prev[order.order_code] ?? [])];
        arr[planIndex] = plan;
        return { ...prev, [order.order_code]: arr };
      });
      if (plan.status === '完了') setResultModal({ order, plan });
      addToast('success', `ステータスを更新しました: ${plan.status}`);
    } catch { addToast('error', '更新に失敗しました'); }
  }, [addToast]);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault(); setDragOver(null);
    if (!dragging || dragging.plan.scheduled_date === targetDate) return;
    
    const { order, plan, planIndex } = dragging;
    try {
      await manufacturingService.updatePlanDate(plan.id, targetDate);
      setAllPlans(prev => {
        const arr = [...(prev[order.order_code] ?? [])];
        arr[planIndex] = { ...plan, scheduled_date: targetDate };
        return { ...prev, [order.order_code]: arr };
      });
      addToast('success', '日程を移動しました');
    } catch { addToast('error', '移動に失敗しました'); }
    setDragging(null);
  }, [dragging, addToast]);

  // カレンダーロジック
  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const last = new Date(calYear, calMonth + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: last }, (_, i) => 
      `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
    )];
  }, [calYear, calMonth]);

  const calEntries = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {};
    orders.forEach(order => {
      (allPlans[order.order_code] ?? []).forEach((plan, planIndex) => {
        if (!plan.scheduled_date) return;
        if (!map[plan.scheduled_date]) map[plan.scheduled_date] = [];
        map[plan.scheduled_date].push({ order, plan, planIndex });
      });
    });
    return map;
  }, [orders, allPlans]);

  // 5. JSX 描画（Rendering）
  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-500 font-mono text-[10px] tracking-[0.5em] uppercase animate-pulse">Initializing System...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-orange-500/30">
      <Toast toasts={toasts} onRemove={id => setToasts(p => p.filter(t => t.id !== id))} />
      
      {resultModal && (
        <ProductionResultModal 
          order={resultModal.order} 
          plan={resultModal.plan} 
          onSave={async (data) => {
            console.log('Result Saved:', data);
            setResultModal(null);
          }} 
          onCancel={() => setResultModal(null)} 
        />
      )}

      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-slate-800/60 pb-10">
        <div className="space-y-4">
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 w-fit backdrop-blur-md">
            {(['editor', 'calendar'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-10 py-2.5 rounded-lg text-[10px] font-black tracking-widest transition-all uppercase ${viewMode === m ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-500 hover:text-slate-300'}`}>
                {m === 'editor' ? 'Plan Editor' : 'Calendar'}
              </button>
            ))}
          </div>
          <h1 className="text-5xl font-black tracking-tighter italic text-white uppercase leading-none">
            Manufacturing <span className="text-slate-700 text-2xl font-light not-italic">Ops.</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {viewMode === 'editor' && selectedOrder && (
            <button onClick={handleSavePlans} disabled={isSubmitting}
              className="group flex items-center gap-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-30 px-8 py-4 rounded-2xl text-[11px] font-black transition-all shadow-xl shadow-orange-900/10 active:scale-95">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} className="group-hover:rotate-12 transition-transform" />}
              <span>COMMIT PLANS</span>
            </button>
          )}
          <button onClick={() => window.print()} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-500 hover:text-white hover:border-slate-600 transition-all">
            <Printer size={20} />
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Sidebar: Order List (Editor Mode Only) */}
        {viewMode === 'editor' && (
          <aside className="lg:col-span-4 space-y-4 animate-in slide-in-from-left duration-500">
            <div className="bg-slate-900/40 border border-slate-800/60 rounded-[2.5rem] p-6 backdrop-blur-xl">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <Package size={14} className="text-orange-500" /> Pending Orders
              </h2>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
                {orders.map(o => (
                  <button key={o.id} onClick={() => setSelectedOrder(o)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 ${selectedOrder?.id === o.id ? 'bg-orange-500/10 border-orange-500/50 shadow-2xl scale-[1.02]' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                    <div className="flex justify-between items-start mb-3 font-mono text-[10px]">
                      <span className="text-slate-500">{o.request_delivery_date}</span>
                      <span className="text-orange-400 font-black">{o.quantity_cs} CS</span>
                    </div>
                    <p className="text-sm font-black text-white leading-tight uppercase italic mb-3">{o.product_name_at_order}</p>
                    <div className="flex items-center justify-between opacity-60">
                      <div className="flex items-center gap-1.5 text-[9px] font-bold">
                        <MapPin size={10} /> <span className="truncate max-w-[100px]">{o.destination_code}</span>
                      </div>
                      <StatusBadge status={allPlans[o.order_code]?.every(p => p.status === '完了') ? '完了' : '計画'} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={viewMode === 'editor' ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {viewMode === 'editor' ? (
            selectedOrder ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Order Summary Card */}
                <div className="bg-linear-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-4xl p-10 shadow-3xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none rotate-12"><Factory size={200} /></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-black text-white mb-2 uppercase italic">{selectedOrder.product_name_at_order}</h2>
                    <p className="text-[11px] font-black text-slate-500 tracking-[0.4em] mb-10 uppercase">{selectedOrder.order_code}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                      {[
                        { label: 'Target Weight', value: `${metrics.totalWeight.toFixed(1)}kg` },
                        { label: 'Planned', value: `${metrics.plannedWeight.toFixed(1)}kg` },
                        { label: 'Remaining', value: `${Math.max(0, metrics.remainingWeight).toFixed(1)}kg`, highlight: metrics.remainingWeight < 0 },
                        { label: 'Calculated CS', value: `${calcCs(metrics.plannedWeight)}cs` }
                      ].map(stat => (
                        <div key={stat.label} className="bg-slate-950/60 border border-slate-800/80 p-5 rounded-3xl">
                          <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">{stat.label}</p>
                          <p className={`text-xl font-black font-mono tracking-tighter ${stat.highlight ? 'text-rose-500' : 'text-white'}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        <span>Planning Progress</span>
                        <span className="text-orange-500 font-mono">{metrics.progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.progress}%` }} className="h-full bg-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Input Rows */}
                <div className="space-y-3">
                  {plans.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl items-center hover:bg-slate-900/60 transition-colors">
                      <div className="col-span-3">
                        <input type="date" value={p.scheduled_date} 
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, scheduled_date: e.target.value } : x))}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs font-mono text-slate-300 focus:border-orange-600 outline-none transition-all" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" value={p.amount_kg || ''} placeholder="0kg"
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, amount_kg: Number(e.target.value) } : x))}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs font-mono text-orange-400 text-right font-black focus:border-orange-600 outline-none transition-all" />
                      </div>
                      <div className="col-span-1 text-center text-[10px] font-mono font-black text-slate-600">{calcCs(p.amount_kg)}cs</div>
                      <div className="col-span-2">
                        <select value={p.status} 
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value as any } : x))}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-[10px] font-black text-slate-400 outline-none cursor-pointer">
                          <option>計画</option><option>製造中</option><option>完了</option>
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input type="text" value={p.remarks || ''} placeholder="Add remarks..."
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, remarks: e.target.value } : x))}
                          className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs text-slate-400 placeholder:text-slate-800 focus:border-orange-600 outline-none transition-all" />
                      </div>
                      <button onClick={() => setPlans(prev => prev.filter((_, j) => j !== i))} className="col-span-1 flex justify-center text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setPlans(prev => [...prev, { id: '', plan_code: generatePlanCode(selectedOrder.order_code, prev.length), order_code: selectedOrder.order_code, product_code: selectedOrder.product_code, scheduled_date: selectedOrder.request_delivery_date, amount_kg: 0, amount_cs: 0, status: '計画', remarks: '' }])}
                    className="w-full py-5 border-2 border-dashed border-slate-800 rounded-4xl text-[10px] font-black text-slate-600 hover:text-orange-500 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all flex items-center justify-center gap-3 uppercase tracking-[0.3em]">
                    <Plus size={16} /> Add Split Row
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-[70vh] flex flex-col items-center justify-center border-2 border-dashed border-slate-800/40 rounded-[4rem] text-slate-700 space-y-4">
                <Factory size={64} className="opacity-10" />
                <p className="text-[11px] font-black uppercase tracking-[0.6em] opacity-40">Please Select an Order to View Planning Interface</p>
              </div>
            )
          ) : (
            /* Calendar View */
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/60 backdrop-blur-xl">
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <button onClick={() => setCalMonth(m => m === 0 ? 11 : m - 1)} className="px-6 py-4 text-slate-500 hover:text-white hover:bg-slate-800 transition-all font-black text-xl border-r border-slate-800">‹</button>
                  <span className="px-12 py-4 text-sm font-black text-white font-mono tracking-[0.3em] uppercase min-w-[240px] text-center">{calYear} / {String(calMonth + 1).padStart(2, '0')}</span>
                  <button onClick={() => setCalMonth(m => m === 11 ? 0 : m + 1)} className="px-6 py-4 text-slate-500 hover:text-white hover:bg-slate-800 transition-all font-black text-xl border-l border-slate-800">›</button>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-950/50 rounded-xl border border-slate-800/50">
                    <CalendarIcon size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Schedule</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, i) => (
                  <div key={d} className={`text-center py-4 text-[10px] font-black tracking-[0.4em] rounded-t-2xl ${i === 0 ? 'text-rose-500 bg-rose-950/20' : i === 6 ? 'text-blue-500 bg-blue-950/20' : 'text-slate-600 bg-slate-900/40'}`}>{d}</div>
                ))}
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`e-${idx}`} className="min-h-[180px] bg-slate-950/10 rounded-3xl" />;
                  const entries = calEntries[date] ?? [];
                  const isToday = date === todayStr;
                  const dayNum = date.split('-')[2];

                  return (
                    <div key={date} 
                      onDragOver={e => { e.preventDefault(); setDragOver(date); }} 
                      onDragLeave={() => setDragOver(null)} 
                      onDrop={e => handleDrop(e, date)}
                      className={`min-h-[180px] p-4 border rounded-4xl transition-all duration-300 relative group overflow-hidden ${isToday ? 'bg-orange-600/5 border-orange-500/50 ring-1 ring-orange-500/20' : 'bg-slate-900/20 border-slate-800/60 hover:border-slate-700'} ${dragOver === date ? 'scale-95 ring-4 ring-blue-500 bg-blue-500/10 border-blue-500' : ''}`}>
                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <span className={`text-sm font-black font-mono ${isToday ? 'text-orange-500' : 'text-slate-600 group-hover:text-slate-400 transition-colors'}`}>{dayNum}</span>
                        {entries.length > 0 && <span className="text-[9px] font-black text-slate-700 bg-slate-800/50 px-2 py-0.5 rounded-full">{entries.length} JOBS</span>}
                      </div>
                      <div className="space-y-2 relative z-10">
                        {entries.map((entry, ei) => (
                          <div key={ei} draggable onDragStart={() => setDragging(entry)}
                            className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-orange-500/50 transition-all">
                            <p className="text-[9px] font-black text-white truncate uppercase italic mb-1">{entry.order.product_name_at_order}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono text-orange-500 font-bold">{Number(entry.plan.amount_kg).toLocaleString()}kg</span>
                              <StatusBadge status={entry.plan.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .bg-slate-950, .bg-slate-900 { background: white !important; border-color: #ddd !important; }
          .text-white, .text-slate-200 { color: black !important; }
        }
      `}</style>
    </div>
  );
}