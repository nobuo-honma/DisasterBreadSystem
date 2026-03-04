/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useCallback, useRef, DragEvent, Key } from 'react';
import {
  CheckCircle2, Package, Trash2, Printer, Loader2,
  Gauge, MessageSquare, MapPin, Plus, AlertTriangle,
  ChevronRight, X, ChevronDown, FlaskConical, Save,
  GripVertical, RotateCcw, Factory,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { orderService } from '../../services/orderService';
import { masterService } from '../../services/masterService';
import { manufacturingService } from '../../services/manufacturingService';
import { TOrder, MProduct, MDestination, TMfgPlan, TProductStock } from '../../types';

// ─── 型定義 ───────────────────────────────────────────────────────
interface CalendarEntry {
  order: TOrder;
  plan: TMfgPlan;
  planIndex: number;
}

interface ProductionResultInput {
  mfg_lot: string;
  expiry_date: string;
  stock_cs: number;
  stock_p: number;
  remarks: string;
}

// ─── Toast ────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';
interface ToastMsg { id: number; type: ToastType; message: string; }

function Toast({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-60 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} style={{ animation: 'slideIn .2s ease-out' }} className={`
          flex items-center gap-3 px-4 py-3 rounded-xl border text-[11px] font-bold
          shadow-2xl backdrop-blur pointer-events-auto
          ${t.type === 'success' ? 'bg-emerald-950 border-emerald-700/60 text-emerald-300' : ''}
          ${t.type === 'error' ? 'bg-rose-950   border-rose-700/60   text-rose-300' : ''}
          ${t.type === 'warning' ? 'bg-amber-950  border-amber-700/60  text-amber-300' : ''}
        `}>
          {t.type === 'success' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X size={11} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── ステータスバッジ ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    '計画': 'bg-slate-800    text-slate-400  border-slate-700',
    '製造中': 'bg-amber-950   text-amber-400  border-amber-800',
    '完了': 'bg-emerald-950 text-emerald-400 border-emerald-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black border ${cls[status] || 'bg-slate-800 text-slate-400 border-slate-700'}`}>
      {status}
    </span>
  );
}

// ─── ステータスポップオーバー ─────────────────────────────────────
function StatusPopover({ current, onSelect, onClose }: {
  current: string;
  onSelect: (s: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const opts: { s: string; cls: string }[] = [
    { s: '計画', cls: 'hover:bg-slate-700/60  text-slate-300' },
    { s: '製造中', cls: 'hover:bg-amber-900/50  text-amber-300' },
    { s: '完了', cls: 'hover:bg-emerald-900/50 text-emerald-300' },
  ];
  return (
    <div ref={ref} className="absolute z-50 top-full left-0 mt-1 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}>
      <p className="px-3 py-1.5 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800">ステータス</p>
      {opts.map(({ s, cls }) => (
        <button key={s} disabled={s === current} onClick={() => { onSelect(s); onClose(); }}
          className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors flex items-center gap-2 ${cls} ${s === current ? 'opacity-30 cursor-default' : ''}`}>
          {s === current && <CheckCircle2 size={9} />}
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── ロット番号生成ロジック ───────────────────────────────────────
const DAY_CODES = [
  'ア', 'イ', 'ウ', 'エ', 'オ',   // 1〜5
  'カ', 'キ', 'ク', 'ケ', 'コ',   // 6〜10
  'サ', 'シ', 'ス', 'セ', 'ソ',   // 11〜15
  'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',   // 16〜20
  'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',   // 21〜25
  'マ', 'ミ', 'ム', 'メ', 'モ',   // 26〜30
  'ヤ',                       // 31
];
const MONTH_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

function getDayCode(day: number): string {
  return DAY_CODES[day - 1];
}

function getMonthCode(month: number): string {
  return MONTH_CODES[month - 1] ?? String(month);
}

function generateLotNumber(productCode: string, date: string, serialSuffix = '00'): string {
  if (!date) return '';

  const [yearStr, monthStr, dayStr] = date.split('-');
  const yy = yearStr.slice(-2);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const dd = String(day).padStart(2, '0');
  const mc = getMonthCode(month);
  const dc = getDayCode(day);

  const code = productCode.toUpperCase();

  if (code === 'YC50' || code === 'YO50') {
    const brand = code === 'YC50' ? 'YC' : 'YO';
    return `${dd}${mc}${yy} ${brand}`;
  }

  if (code === 'MA' || code.startsWith('MA-') || code === 'FD' || code.startsWith('FD-')) {
    const brand = code.startsWith('MA') ? 'MA' : 'FD';
    return `${yy}${brand}${serialSuffix}`;
  }

  return `${dc}${mc}${yy}${productCode}`;
}

// ─── 製造実績入力モーダル ─────────────────────────────────────────
function ProductionResultModal({ order, plan, onSave, onCancel }: {
  order: TOrder;
  plan: TMfgPlan;
  onSave: (input: ProductionResultInput) => Promise<void>;
  onCancel: () => void;
}) {
  const isMAorFD = /^(MA|FD)/i.test(order.product_code);
  const [serial, setSerial] = useState('00');
  const [form, setForm] = useState<ProductionResultInput>({
    mfg_lot: generateLotNumber(order.product_code, plan.scheduled_date ?? '', '00'),
    expiry_date: '',
    stock_cs: 0,
    stock_p: 0,
    remarks: `製造実績 ${plan.scheduled_date} / ${order.order_code}`,
  });
  const [saving, setSaving] = useState(false);
  const up = (k: keyof ProductionResultInput, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  const handleSerialChange = (v: string) => {
    setSerial(v);
    up('mfg_lot', generateLotNumber(order.product_code, plan.scheduled_date ?? '', v.padStart(2, '0')));
  };

  const lotPreview = (() => {
    const code = order.product_code.toUpperCase();
    if (code === 'YC50' || code === 'YO50') return 'dd月コードyy 品種（例: 05C26 YC）';
    if (/^(MA|FD)/i.test(code)) return 'yy品種連番（例: 26MA01）';
    return '日コード月コードyy製品コード（例: アC26PRD）';
  })();

  const handleSave = async () => {
    if (!form.mfg_lot || !form.expiry_date) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ animation: 'fadeIn .2s ease-out' }}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-linear-to-r from-emerald-900/50 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <FlaskConical size={13} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">製造完了 — 実績入力</span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{order.product_name_at_order}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{order.order_code}　/　{plan.scheduled_date}</p>
          </div>
          <button onClick={onCancel} className="text-slate-600 hover:text-white transition-colors mt-1"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-0.5">製造重量</p>
              <p className="text-sm font-black text-orange-400 font-mono">{Number(plan.amount_kg).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-0.5">受注数量</p>
              <p className="text-sm font-black text-slate-200 font-mono">{order.quantity_cs} CS</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">製造ロット番号 *</label>
              <span className="text-[9px] text-slate-600 font-mono">{lotPreview}</span>
            </div>
            <div className="flex gap-2 items-center">
              <input type="text" value={form.mfg_lot} onChange={e => up('mfg_lot', e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[13px] font-mono font-black text-emerald-300 outline-none focus:border-emerald-500 transition-colors tracking-widest"
                placeholder="自動生成" />
              {isMAorFD && (
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <label className="text-[8px] font-black text-slate-600 uppercase">連番</label>
                  <input type="text" value={serial} maxLength={2}
                    onChange={e => handleSerialChange(e.target.value.replace(/\D/g, ''))}
                    className="w-14 bg-slate-950 border border-amber-800/60 rounded-lg px-2 py-2.5 text-[13px] font-mono font-black text-amber-300 text-center outline-none focus:border-amber-500 transition-colors" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">賞味期限 *</label>
            <input type="date" value={form.expiry_date} onChange={e => up('expiry_date', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] font-mono text-white outline-none focus:border-emerald-500 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">実績数量（CS）</label>
              <input type="number" min={0} value={form.stock_cs || ''} onChange={e => up('stock_cs', Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] font-mono text-right text-white outline-none focus:border-emerald-500 transition-colors" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">実績数量（P）</label>
              <input type="number" min={0} value={form.stock_p || ''} onChange={e => up('stock_p', Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] font-mono text-right text-white outline-none focus:border-emerald-500 transition-colors" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">備考</label>
            <input type="text" value={form.remarks} onChange={e => up('remarks', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] text-white placeholder:text-slate-700 outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">* 必須項目</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-white transition-colors">スキップ</button>
            <button onClick={handleSave} disabled={saving || !form.mfg_lot || !form.expiry_date}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl text-[11px] font-black transition-colors shadow-lg shadow-emerald-900/30">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? '登録中...' : '製品在庫に登録'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── カレンダーカード ─────────────────────────────────────────────
interface PlanCardProps {
  key?: Key;
  entry: CalendarEntry;
  onStatusChange: (entry: CalendarEntry) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, entry: CalendarEntry) => void;
}

function PlanCard({ entry, onStatusChange, onDragStart }: PlanCardProps) {
  const { plan } = entry;
  const [showPopover, setShowPopover] = useState(false);

  const borderCls =
    plan.status === '完了' ? 'border-emerald-700/60 border-l-emerald-500 bg-emerald-950/20' :
      plan.status === '製造中' ? 'border-amber-700/60   border-l-amber-500   bg-amber-950/20' :
        'border-slate-700/60   border-l-orange-500  bg-slate-900/60';

  return (
    <div draggable onDragStart={e => { e.stopPropagation(); onDragStart(e, entry); }}
      className={`relative border border-l-2 pl-1.5 py-1 pr-1 rounded-sm cursor-grab active:cursor-grabbing select-none group transition-all hover:brightness-125 ${borderCls}`}>
      <div className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-30 transition-opacity">
        <GripVertical size={9} className="text-slate-400" />
      </div>
      <p className="text-[9px] font-black text-white leading-tight truncate pr-3">{entry.order.product_name_at_order}</p>
      <span className="text-[9px] font-black text-orange-400 font-mono">{Number(plan.amount_kg).toLocaleString()}kg</span>
      {plan.remarks && (
        <div className="flex items-start gap-0.5 mt-0.5">
          <MessageSquare size={7} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-[8px] text-blue-400 leading-tight break-all">{plan.remarks}</p>
        </div>
      )}
      <div className="relative mt-1">
        <button onClick={e => { e.stopPropagation(); setShowPopover(v => !v); }}
          className="flex items-center gap-1 hover:opacity-100 opacity-90 transition-opacity">
          <StatusBadge status={plan.status} />
          <ChevronDown size={8} className="text-slate-600" />
        </button>
        {showPopover && (
          <StatusPopover
            current={plan.status}
            onSelect={newStatus => onStatusChange({ ...entry, plan: { ...plan, status: newStatus as TMfgPlan['status'] } })}
            onClose={() => setShowPopover(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function Manufacturing() {
  const [viewMode, setViewMode] = useState<'editor' | 'calendar'>('editor');
  const [orders, setOrders] = useState<TOrder[]>([]);
  const [products, setProducts] = useState<MProduct[]>([]);
  const [destinations, setDestinations] = useState<MDestination[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans] = useState<TMfgPlan[]>([]);
  const [allPlans, setAllPlans] = useState<Record<string, TMfgPlan[]>>({});

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const [dragging, setDragging] = useState<CalendarEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<{ order: TOrder; plan: TMfgPlan } | null>(null);

  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const seq = useRef(0);
  const addToast = useCallback((type: ToastType, msg: string) => {
    const id = ++seq.current;
    setToasts(p => [...p, { id, type, message: msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

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

  const generatePlanCode = (orderCode: string, index: number): string => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `PLN-${orderCode}-${date}-${String(index + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!selectedOrder) { setPlans([]); return; }
    const ex = allPlans[selectedOrder.order_code];
    setPlans(ex?.length ? ex : [{
      id: '',
      plan_code: generatePlanCode(selectedOrder.order_code, 0),
      order_code: selectedOrder.order_code,
      product_code: selectedOrder.product_code,
      scheduled_date: selectedOrder.request_delivery_date,
      amount_kg: 0,
      amount_cs: 0,
      status: '計画',
      remarks: ''
    }]);
  }, [selectedOrder, allPlans]);

  const currentProduct = useMemo(() => products.find(p => p.product_code === selectedOrder?.product_code), [products, selectedOrder]);

  const metrics = useMemo(() => {
    if (!selectedOrder || !currentProduct) return { totalWeight: 0, plannedWeight: 0, remainingWeight: 0, progress: 0 };
    const unitsPerKg = currentProduct.units_per_kg || 1;
    const totalWeight = (selectedOrder.quantity_cs * currentProduct.units_per_cs) / unitsPerKg;
    const plannedWeight = plans.reduce((s, p) => s + (Number(p.amount_kg) || 0), 0);
    return { totalWeight, plannedWeight, remainingWeight: totalWeight - plannedWeight, progress: totalWeight > 0 ? Math.min((plannedWeight / totalWeight) * 100, 100) : 0 };
  }, [selectedOrder, currentProduct, plans]);

  const calcCs = useCallback((weight: number | string) => {
    if (!currentProduct || !currentProduct.units_per_cs) return 0;
    const unitsPerKg = currentProduct.units_per_kg || 1;
    return Math.floor((Number(weight) * unitsPerKg) / currentProduct.units_per_cs);
  }, [currentProduct]);

  const destName = useCallback((code: string) => destinations.find(d => d.destination_code === code)?.destination_name || code, [destinations]);
  const flavor = (remarks: string) => remarks?.match(/味:([^|]+)/)?.[1]?.trim() || '通常';
  const orderStatus = (code: string): string | null => {
    const ps = allPlans[code]; if (!ps?.length) return null;
    if (ps.every(p => p.status === '完了')) return '完了';
    if (ps.some(p => p.status === '製造中')) return '製造中';
    return '計画';
  };

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

    // 未保存プランへのステータス変更をブロック
    if (!plan.id) {
      addToast('warning', '先にDB保存してからステータスを変更してください');
      return;
    }

    const newStatus = plan.status;
    setAllPlans(prev => {
      const arr = [...(prev[order.order_code] ?? [])];
      if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], status: newStatus };
      return { ...prev, [order.order_code]: arr };
    });
    try {
      await manufacturingService.updatePlanStatus(plan.id, newStatus);
      addToast('success', `ステータスを「${newStatus}」に変更しました`);
      if (newStatus === '完了') setResultModal({ order, plan: { ...plan, status: newStatus } });
    } catch {
      addToast('error', 'ステータスの更新に失敗しました');
    }
  }, [addToast]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, entry: CalendarEntry) => {
    setDragging(entry);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>, targetDate: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.plan.scheduled_date === targetDate) return;
    const { order, plan, planIndex } = dragging;
    setAllPlans(prev => {
      const arr = [...(prev[order.order_code] ?? [])];
      if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], scheduled_date: targetDate };
      return { ...prev, [order.order_code]: arr };
    });
    try {
      await manufacturingService.updatePlanDate(plan.id, targetDate);
      addToast('success', `製造日を ${targetDate} に変更しました`);
    } catch {
      addToast('error', '日付変更に失敗しました');
    }
    setDragging(null);
  }, [dragging, addToast]);

  const handleSaveResult = useCallback(async (input: ProductionResultInput) => {
    if (!resultModal) return;
    try {
      await manufacturingService.saveProductionResult({
        product_code: resultModal.order.product_code,
        mfg_lot: input.mfg_lot,
        expiry_date: input.expiry_date,
        stock_cs: input.stock_cs,
        stock_p: input.stock_p,
      });
      addToast('success', `製品在庫に登録しました（${input.mfg_lot}）`);
    } catch { addToast('error', '製品在庫の登録に失敗しました'); }
    finally { setResultModal(null); }
  }, [resultModal, addToast]);

  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const last = new Date(calYear, calMonth + 1, 0).getDate();
    return [
      ...Array<null>(first).fill(null),
      ...Array.from({ length: last }, (_, i) =>
        `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
    ];
  }, [calYear, calMonth]);

  const calEntries = useMemo<Record<string, CalendarEntry[]>>(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const order of orders) {
      (allPlans[order.order_code] ?? []).forEach((plan, planIndex) => {
        if (!plan.scheduled_date) return;
        if (!map[plan.scheduled_date]) map[plan.scheduled_date] = [];
        map[plan.scheduled_date].push({ order, plan, planIndex });
      });
    }
    return map;
  }, [orders, allPlans]);

  const prevMonth = () => calMonth === 0 ? (setCalYear(y => y - 1), setCalMonth(11)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalYear(y => y + 1), setCalMonth(0)) : setCalMonth(m => m + 1);
  const isCurMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
      <p className="text-slate-500 text-[11px] font-black tracking-[0.4em] uppercase">Loading Production Data</p>
    </div>
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      <Toast toasts={toasts} onRemove={removeToast} />
      {resultModal && <ProductionResultModal order={resultModal.order} plan={resultModal.plan} onSave={handleSaveResult} onCancel={() => setResultModal(null)} />}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/60 pb-8">
        <div className="space-y-1">
          <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800 gap-0.5 mb-2">
            {(['editor', 'calendar'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-8 py-2 rounded text-[10px] font-black tracking-wider transition-all ${viewMode === m ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                {m === 'editor' ? '計画編集' : 'カレンダー'}
              </button>
            ))}
          </div>
          <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400 italic">
            製造計画 <span className="text-slate-600 text-xl font-light">/ Manufacturing</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {viewMode === 'editor' && selectedOrder && (
            <button onClick={handleSavePlans} disabled={isSubmitting}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-6 py-3 rounded-2xl text-[10px] font-black transition-colors shadow-lg shadow-orange-900/20">
              {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              {isSubmitting ? '保存中...' : 'DB 保存'}
            </button>
          )}
          <button onClick={() => window.print()} className="p-3 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
            <Printer size={18} />
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        {viewMode === 'editor' && (
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">受注一覧</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                {orders.map(o => {
                  const st = orderStatus(o.order_code);
                  const selected = selectedOrder?.id === o.id;
                  return (
                    <button key={o.id} onClick={() => setSelectedOrder(o)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all ${selected ? 'bg-orange-500/10 border-orange-500/50 shadow-lg shadow-orange-900/10' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-mono text-slate-600">{o.request_delivery_date}</span>
                        <span className="text-[10px] font-black text-orange-400">{o.quantity_cs} cs</span>
                      </div>
                      <p className="text-sm font-black text-white leading-tight mb-2">{flavor(o.remarks || '')}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[9px] text-slate-600">
                          <MapPin size={10} /><span className="truncate max-w-[120px]">{destName(o.destination_code)}</span>
                        </div>
                        {st && <StatusBadge status={st} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        <main className={viewMode === 'editor' ? 'lg:col-span-8' : 'lg:col-span-12'}>
          {viewMode === 'editor' ? (
            !selectedOrder ? (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Factory size={48} className="opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest opacity-40">受注を選択してください</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-white mb-1">{flavor(selectedOrder.remarks || '')}</h2>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedOrder.product_name_at_order}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-600 uppercase mb-1">出荷先</p>
                      <p className="text-sm font-bold text-slate-300">{destName(selectedOrder.destination_code)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { label: '受注数量', value: `${selectedOrder.quantity_cs} cs`, alert: false },
                      { label: '必要総量', value: `${metrics.totalWeight.toFixed(0)} kg`, alert: false },
                      { label: '計画済み', value: `${metrics.plannedWeight.toFixed(0)} kg`, alert: false },
                      { label: '残り', value: `${Math.max(0, metrics.remainingWeight).toFixed(0)} kg`, alert: metrics.remainingWeight < 0 },
                    ].map(m => (
                      <div key={m.label} className={`bg-slate-950/50 rounded-2xl p-4 border ${m.alert ? 'border-rose-700/60' : 'border-slate-800'}`}>
                        <p className="text-[9px] text-slate-600 uppercase mb-1">{m.label}</p>
                        <p className={`text-xl font-black font-mono ${m.alert ? 'text-rose-400' : 'text-white'}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Gauge size={12} /> 計画進捗率</span>
                      <span className="font-mono text-slate-400">{metrics.progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.progress}%` }}
                        className={`h-full rounded-full transition-all duration-700 ${metrics.remainingWeight <= 0 ? 'bg-emerald-500' : metrics.progress >= 80 ? 'bg-amber-500' : 'bg-orange-600'}`} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {plans.map((p, i) => (
                    <div key={i} className={`grid grid-cols-12 gap-3 border rounded-2xl p-4 items-center transition-all bg-slate-900/40
                      ${p.status === '完了' ? 'border-emerald-800/50 bg-emerald-950/10' : p.status === '製造中' ? 'border-amber-800/50 bg-amber-950/10' : 'border-slate-800 hover:border-slate-700'}`}>
                      <input type="date" value={p.scheduled_date}
                        onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, scheduled_date: e.target.value } : x))}
                        className="col-span-3 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono text-slate-300 outline-none focus:border-orange-600" />
                      <input type="number" value={p.amount_kg || ''} min={0} placeholder="0"
                        onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, amount_kg: Number(e.target.value) } : x))}
                        className="col-span-2 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs font-mono text-orange-400 outline-none focus:border-orange-600 text-right" />
                      <div className="col-span-1 text-center">
                        <span className="text-[10px] font-mono text-slate-500">{Number(p.amount_kg) > 0 ? `${calcCs(p.amount_kg)}cs` : '—'}</span>
                      </div>
                      <select value={p.status}
                        onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value as TMfgPlan['status'] } : x))}
                        className="col-span-2 bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-xs outline-none focus:border-orange-600 text-slate-300">
                        <option>計画</option><option>製造中</option><option>完了</option>
                      </select>
                      <input type="text" value={p.remarks || ''} placeholder="現場指示・メモ"
                        onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, remarks: e.target.value } : x))}
                        className="col-span-3 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-slate-400 placeholder:text-slate-700 outline-none focus:border-orange-600" />
                      <button onClick={() => setPlans(prev => prev.filter((_, j) => j !== i))}
                        className="col-span-1 flex justify-center text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setPlans(prev => [...prev, {
                    id: '',
                    plan_code: generatePlanCode(selectedOrder.order_code, prev.length),
                    order_code: selectedOrder.order_code,
                    product_code: selectedOrder.product_code,
                    scheduled_date: selectedOrder.request_delivery_date,
                    amount_kg: 0,
                    amount_cs: 0,
                    status: '計画',
                    remarks: ''
                  }])}
                    className="w-full py-4 border-2 border-dashed border-slate-800 rounded-2xl text-[10px] font-black text-slate-600 hover:bg-slate-900/40 hover:text-slate-400 transition-all flex items-center justify-center gap-2">
                    <Plus size={14} /> 計画行を追加
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-6">
              <header className="flex justify-between items-center">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <button onClick={prevMonth} className="px-5 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-black text-lg border-r border-slate-800">‹</button>
                  <span className="px-8 py-3 text-sm font-black text-white font-mono tracking-wider min-w-[160px] text-center">{calYear}年 {calMonth + 1}月</span>
                  <button onClick={nextMonth} className="px-5 py-3 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-black text-lg border-l border-slate-800">›</button>
                </div>
              </header>
              <div className="grid grid-cols-7 gap-1">
                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                  <div key={d} className={`text-center py-3 text-[10px] font-black tracking-widest rounded-t-xl ${i === 0 ? 'text-rose-400 bg-rose-950/20' : i === 6 ? 'text-blue-400 bg-blue-950/20' : 'text-slate-500 bg-slate-900/40'}`}>{d}</div>
                ))}
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`e-${idx}`} className="min-h-[140px] bg-slate-950/10 rounded-xl" />;
                  const dow = new Date(date).getDay();
                  const entries = calEntries[date] ?? [];
                  const isToday = date === todayStr;
                  const isDrop = dragOver === date;
                  return (
                    <div key={date} onDragOver={e => { e.preventDefault(); setDragOver(date); }} onDragLeave={() => setDragOver(null)} onDrop={e => handleDrop(e, date)}
                      className={`min-h-[140px] p-2 border rounded-xl transition-all duration-150 ${dow === 0 ? 'bg-rose-950/5 border-rose-900/20' : dow === 6 ? 'bg-blue-950/5 border-blue-900/20' : 'bg-slate-950/20 border-slate-800/40'} ${isToday ? 'ring-2 ring-orange-500/30 border-orange-500/30' : ''} ${isDrop ? 'ring-2 ring-blue-500 bg-blue-950/20' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-black font-mono ${isToday ? 'text-orange-400' : dow === 0 ? 'text-rose-600' : dow === 6 ? 'text-blue-600' : 'text-slate-500'}`}>{date.split('-')[2]}</span>
                        {entries.length > 0 && <span className="text-[9px] text-slate-600 font-mono">{entries.length}件</span>}
                      </div>
                      <div className="space-y-1">
                        {entries.map((entry, ei) => <PlanCard key={ei} entry={entry} onStatusChange={handleStatusChange} onDragStart={handleDragStart} />)}
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
        @keyframes slideIn { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          #calendar-print-area, #calendar-print-area * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
}
