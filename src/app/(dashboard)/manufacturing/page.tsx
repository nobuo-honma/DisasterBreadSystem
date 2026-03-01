'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2, Package, Trash2, Printer, Loader2,
  Gauge, MessageSquare, MapPin, Plus, AlertTriangle,
  ChevronRight, X, ChevronDown, FlaskConical, Save,
  GripVertical, RotateCcw, Factory,
} from 'lucide-react';

// ─── 型定義 ───────────────────────────────────────────────────────
interface Order {
  id: string;
  order_code: string;
  request_delivery_date: string;
  product_code: string;
  product_name_at_order: string;
  quantity_cs: number;
  remarks: string;
  destination_code: string;
}
interface Product {
  product_code: string;
  product_name?: string;
  units_per_cs: number;
  units_per_kg: number;
}
interface Destination {
  destination_code: string;
  destination_name: string;
}
interface Plan {
  id?: string;
  plan_code?: string;
  order_code?: string;
  product_code?: string;
  date: string;
  weight_kg: number | string;
  remarks: string;
  status: '計画' | '製造中' | '完了';
}
interface CalendarEntry {
  order: Order;
  plan: Plan;
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
    <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} style={{ animation: 'slideIn .2s ease-out' }} className={`
          flex items-center gap-3 px-4 py-3 rounded-xl border text-[11px] font-bold
          shadow-2xl backdrop-blur pointer-events-auto
          ${t.type === 'success' ? 'bg-emerald-950 border-emerald-700/60 text-emerald-300' : ''}
          ${t.type === 'error'   ? 'bg-rose-950   border-rose-700/60   text-rose-300'      : ''}
          ${t.type === 'warning' ? 'bg-amber-950  border-amber-700/60  text-amber-300'     : ''}
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
function StatusBadge({ status }: { status: Plan['status'] }) {
  const cls: Record<Plan['status'], string> = {
    '計画':   'bg-slate-800    text-slate-400  border-slate-700',
    '製造中': 'bg-amber-950   text-amber-400  border-amber-800',
    '完了':   'bg-emerald-950 text-emerald-400 border-emerald-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black border ${cls[status]}`}>
      {status}
    </span>
  );
}

// ─── ステータスポップオーバー ─────────────────────────────────────
function StatusPopover({ current, onSelect, onClose }: {
  current: Plan['status'];
  onSelect: (s: Plan['status']) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  const opts: { s: Plan['status']; cls: string }[] = [
    { s: '計画',   cls: 'hover:bg-slate-700/60  text-slate-300' },
    { s: '製造中', cls: 'hover:bg-amber-900/50  text-amber-300' },
    { s: '完了',   cls: 'hover:bg-emerald-900/50 text-emerald-300' },
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
/**
 * 日コード：各行5文字ずつ、ア行〜マ行 + ヤ = 31文字
 *   ア行: ア(1)  イ(2)  ウ(3)  エ(4)  オ(5)
 *   カ行: カ(6)  キ(7)  ク(8)  ケ(9)  コ(10)
 *   サ行: サ(11) シ(12) ス(13) セ(14) ソ(15)
 *   ナ行: ナ(16) ニ(17) ヌ(18) ネ(19) ノ(20)
 *   ハ行: ハ(21) ヒ(22) フ(23) ヘ(24) ホ(25)
 *   マ行: マ(26) ミ(27) ム(28) メ(29) モ(30)
 *   ヤ:   ヤ(31)
 * 月コード：A(1)〜L(12)
 */
// 日コード：各行5文字 × 6行 + ヤ = 31文字
// ア行(1-5) カ行(6-10) サ行(11-15) ナ行(16-20) ハ行(21-25) マ行(26-30) ヤ(31)
const DAY_CODES = [
  'ア','イ','ウ','エ','オ',   // 1〜5
  'カ','キ','ク','ケ','コ',   // 6〜10
  'サ','シ','ス','セ','ソ',   // 11〜15
  'ナ','ニ','ヌ','ネ','ノ',   // 16〜20
  'ハ','ヒ','フ','ヘ','ホ',   // 21〜25
  'マ','ミ','ム','メ','モ',   // 26〜30
  'ヤ',                       // 31
];
const MONTH_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

function getDayCode(day: number): string {
  return DAY_CODES[day - 1];
}

function getMonthCode(month: number): string {
  // month: 1〜12
  return MONTH_CODES[month - 1] ?? String(month);
}

function generateLotNumber(productCode: string, date: string, serialSuffix = '00'): string {
  if (!date) return '';

  const [yearStr, monthStr, dayStr] = date.split('-');
  const yy    = yearStr.slice(-2);          // 西暦下2桁
  const month = parseInt(monthStr, 10);     // 1〜12
  const day   = parseInt(dayStr, 10);       // 1〜31
  const dd    = String(day).padStart(2, '0');
  const mc    = getMonthCode(month);         // A〜L
  const dc    = getDayCode(day);             // ア〜ヤ or 2桁数字

  const code = productCode.toUpperCase();

  // ── YC50 / YO50 ──
  // フォーマット: dd月コードyy YC or dd月コードyy YO
  if (code === 'YC50' || code === 'YO50') {
    const brand = code === 'YC50' ? 'YC' : 'YO';
    return `${dd}${mc}${yy} ${brand}`;
  }

  // ── MA / FD（年度品）──
  // フォーマット: YY年度MA連番 or YY年度FD連番（連番は手動入力のため00をデフォルト）
  if (code === 'MA' || code.startsWith('MA-') || code === 'FD' || code.startsWith('FD-')) {
    const brand = code.startsWith('MA') ? 'MA' : 'FD';
    return `${yy}${brand}${serialSuffix}`;
  }

  // ── その他 ──
  // フォーマット: 日コード月コードyy製品コード
  return `${dc}${mc}${yy}${productCode}`;
}

// ─── 製造実績入力モーダル ─────────────────────────────────────────
function ProductionResultModal({ order, plan, onSave, onCancel }: {
  order: Order;
  plan: Plan;
  onSave: (input: ProductionResultInput) => Promise<void>;
  onCancel: () => void;
}) {
  const isMAorFD = /^(MA|FD)/i.test(order.product_code);
  const [serial, setSerial] = useState('00'); // MA/FD用連番
  const [form, setForm] = useState<ProductionResultInput>({
    mfg_lot: generateLotNumber(order.product_code, plan.date ?? '', '00'),
    expiry_date: '',
    stock_cs: 0,
    stock_p: 0,
    remarks: `製造実績 ${plan.date} / ${order.order_code}`,
  });
  const [saving, setSaving] = useState(false);
  const up = (k: keyof ProductionResultInput, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  // 連番変更時にロット番号を再生成
  const handleSerialChange = (v: string) => {
    setSerial(v);
    up('mfg_lot', generateLotNumber(order.product_code, plan.date ?? '', v.padStart(2, '0')));
  };

  // ロット番号のプレビュー説明
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

        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <FlaskConical size={13} className="text-emerald-400" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">製造完了 — 実績入力</span>
            </div>
            <h2 className="text-xl font-black text-white leading-tight">{order.product_name_at_order}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{order.order_code}　/　{plan.date}</p>
          </div>
          <button onClick={onCancel} className="text-slate-600 hover:text-white transition-colors mt-1"><X size={18} /></button>
        </div>

        {/* フォーム */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* 参考情報 */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-0.5">製造重量</p>
              <p className="text-sm font-black text-orange-400 font-mono">{Number(plan.weight_kg).toLocaleString()} kg</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-0.5">受注数量</p>
              <p className="text-sm font-black text-slate-200 font-mono">{order.quantity_cs} CS</p>
            </div>
          </div>

          {/* ロット */}
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
            {/* ロットルール凡例 */}
            <div className="rounded-lg bg-slate-950/80 border border-slate-800 px-3 py-2.5">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">ロット番号ルール</p>
              <div className="space-y-1 mb-2">
                {[
                  { codes: ['YC50', 'YO50'], rule: 'dd月コードyy 品種', example: '05C26 YC' },
                  { codes: ['MA', 'FD'],     rule: 'yy品種連番（手動入力）', example: '26MA01' },
                  { codes: ['other'],         rule: '日コード月コードyy品目コード', example: 'アC26PRD001' },
                ].map(r => {
                  const isActive =
                    (r.codes.includes('YC50') && ['YC50','YO50'].includes(order.product_code.toUpperCase())) ||
                    (r.codes.includes('MA') && /^(MA|FD)/i.test(order.product_code)) ||
                    (r.codes.includes('other') && !['YC50','YO50'].includes(order.product_code.toUpperCase()) && !/^(MA|FD)/i.test(order.product_code));
                  return (
                    <div key={r.rule} className={`flex items-center gap-2 transition-opacity ${isActive ? 'opacity-100' : 'opacity-25'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                      <span className="text-[9px] font-black text-slate-400">{r.codes.join(' / ')}</span>
                      <span className="text-[9px] text-slate-600">→ {r.rule}</span>
                      <span className="text-[9px] font-mono text-slate-700 ml-auto">例: {r.example}</span>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <p className="text-[8px] font-black text-slate-700 mb-1">日コード（タ行除くア〜ヤ）</p>
                  <p className="text-[8px] font-mono text-slate-600 leading-relaxed break-all">
                    {DAY_CODES.map((c, i) => `${c}=${i+1}`).join(' ')}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-700 mb-1">月コード（A〜L）</p>
                  <p className="text-[8px] font-mono text-slate-600 leading-relaxed">
                    {MONTH_CODES.map((c, i) => `${c}=${i+1}月`).join(' ')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 賞味期限 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">賞味期限 *</label>
            <input type="date" value={form.expiry_date} onChange={e => up('expiry_date', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] font-mono text-white outline-none focus:border-emerald-500 transition-colors" />
          </div>

          {/* 在庫数 */}
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

          {/* 備考 */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">備考</label>
            <input type="text" value={form.remarks} onChange={e => up('remarks', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-[12px] text-white placeholder:text-slate-700 outline-none focus:border-emerald-500 transition-colors" />
          </div>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <p className="text-[10px] text-slate-600">
            * 必須項目。スキップすると在庫は登録されません。
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="px-5 py-2 rounded-xl text-[11px] font-black text-slate-500 hover:text-white transition-colors">
              スキップ
            </button>
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
function PlanCard({ entry, onStatusChange, onDragStart }: {
  entry: CalendarEntry;
  onStatusChange: (entry: CalendarEntry) => void;
  onDragStart: (e: React.DragEvent, entry: CalendarEntry) => void;
}) {
  const { plan } = entry;
  const [showPopover, setShowPopover] = useState(false);

  const borderCls =
    plan.status === '完了'   ? 'border-emerald-700/60 border-l-emerald-500 bg-emerald-950/20' :
    plan.status === '製造中' ? 'border-amber-700/60   border-l-amber-500   bg-amber-950/20' :
                               'border-slate-700/60   border-l-orange-500  bg-slate-900/60';

  return (
    <div draggable onDragStart={e => { e.stopPropagation(); onDragStart(e, entry); }}
      className={`relative border border-l-2 pl-1.5 py-1 pr-1 rounded-sm cursor-grab active:cursor-grabbing select-none group transition-all hover:brightness-125 ${borderCls}`}>

      {/* グリップ */}
      <div className="absolute right-0.5 top-0.5 opacity-0 group-hover:opacity-30 transition-opacity">
        <GripVertical size={9} className="text-slate-400" />
      </div>

      <p className="text-[9px] font-black text-white leading-tight truncate pr-3">
        {entry.order.product_name_at_order}
      </p>
      <span className="text-[9px] font-black text-orange-400 font-mono">
        {Number(plan.weight_kg).toLocaleString()}kg
      </span>
      {plan.remarks && (
        <div className="flex items-start gap-0.5 mt-0.5">
          <MessageSquare size={7} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-[8px] text-blue-400 leading-tight break-all">{plan.remarks}</p>
        </div>
      )}

      {/* ステータスボタン */}
      <div className="relative mt-1">
        <button onClick={e => { e.stopPropagation(); setShowPopover(v => !v); }}
          className="flex items-center gap-1 hover:opacity-100 opacity-90 transition-opacity">
          <StatusBadge status={plan.status} />
          <ChevronDown size={8} className="text-slate-600" />
        </button>
        {showPopover && (
          <StatusPopover
            current={plan.status}
            onSelect={newStatus => onStatusChange({ ...entry, plan: { ...plan, status: newStatus } })}
            onClose={() => setShowPopover(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function ManufacturingPage() {
  const [viewMode, setViewMode]         = useState<'editor' | 'calendar'>('editor');
  const [orders, setOrders]             = useState<Order[]>([]);
  const [products, setProducts]         = useState<Product[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading]           = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans]               = useState<Plan[]>([]);
  const [allPlans, setAllPlans]         = useState<Record<string, Plan[]>>({});

  // カレンダー月
  const today    = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // D&D
  const [dragging, setDragging] = useState<CalendarEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // 製造実績モーダル
  const [resultModal, setResultModal] = useState<{ order: Order; plan: Plan } | null>(null);

  // Toast
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const seq = useRef(0);
  const addToast = useCallback((type: ToastType, msg: string) => {
    const id = ++seq.current;
    setToasts(p => [...p, { id, type, message: msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  const supabase = useMemo(() => createClient(), []);

  // ─── データ取得 ────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      try {
        const [ro, rp, rd, rpm] = await Promise.all([
          supabase.from('t_orders').select('*').order('request_delivery_date', { ascending: true }),
          supabase.from('m_products').select('*'),
          supabase.from('m_destinations').select('*'),
          supabase.from('t_mfg_plans').select('*').order('scheduled_date', { ascending: true }),
        ]);
        setOrders(ro.data ?? []);
        setProducts(rp.data ?? []);
        setDestinations(rd.data ?? []);
        const map: Record<string, Plan[]> = {};
        for (const d of (rpm.data ?? [])) {
          if (!map[d.order_code]) map[d.order_code] = [];
          map[d.order_code].push({
            id: d.id, plan_code: d.plan_code, order_code: d.order_code, product_code: d.product_code,
            date: d.scheduled_date, weight_kg: d.amount_kg, remarks: d.remarks ?? '', status: d.status,
          });
        }
        setAllPlans(map);
      } catch { addToast('error', 'データの取得に失敗しました'); }
      finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // 受注選択
  useEffect(() => {
    if (!selectedOrder) { setPlans([]); return; }
    const ex = allPlans[selectedOrder.order_code];
    setPlans(ex?.length ? ex : [{ date: selectedOrder.request_delivery_date, weight_kg: '', remarks: '', status: '計画' }]);
  }, [selectedOrder, allPlans]);

  // ─── ユーティリティ ────────────────────────────────────────────
  const currentProduct = useMemo(() => products.find(p => p.product_code === selectedOrder?.product_code), [products, selectedOrder]);

  const metrics = useMemo(() => {
    if (!selectedOrder || !currentProduct) return { totalWeight: 0, plannedWeight: 0, remainingWeight: 0, progress: 0 };
    const upc = Number(currentProduct.units_per_cs), upk = Number(currentProduct.units_per_kg);
    const totalWeight = upk > 0 && upc > 0 ? (selectedOrder.quantity_cs * upc) / upk : 0;
    const plannedWeight = plans.reduce((s, p) => s + (Number(p.weight_kg) || 0), 0);
    return { totalWeight, plannedWeight, remainingWeight: totalWeight - plannedWeight, progress: totalWeight > 0 ? Math.min((plannedWeight / totalWeight) * 100, 100) : 0 };
  }, [selectedOrder, currentProduct, plans]);

  const calcCs = useCallback((weight: number | string, prod?: Product) => {
    const p = prod ?? currentProduct;
    if (!p || !Number(p.units_per_cs)) return 0;
    return Math.floor((Number(weight) * Number(p.units_per_kg)) / Number(p.units_per_cs));
  }, [currentProduct]);

  const destName = useCallback((code: string) => destinations.find(d => d.destination_code === code)?.destination_name || code, [destinations]);
  const flavor   = (remarks: string) => remarks?.match(/味:([^|]+)/)?.[1]?.trim() || '通常';
  const orderStatus = (code: string): Plan['status'] | null => {
    const ps = allPlans[code]; if (!ps?.length) return null;
    if (ps.every(p => p.status === '完了')) return '完了';
    if (ps.some(p => p.status === '製造中')) return '製造中';
    return '計画';
  };

  // ─── 計画保存（編集ビュー） ────────────────────────────────────
  const handleSavePlans = async () => {
    if (!selectedOrder || !supabase) return;
    for (let i = 0; i < plans.length; i++) {
      if (!plans[i].date) { addToast('warning', `${i + 1}行目: 日付が未入力`); return; }
      if (Number(plans[i].weight_kg) <= 0) { addToast('warning', `${i + 1}行目: 重量を入力してください`); return; }
    }
    setIsSubmitting(true);
    try {
      await supabase.from('t_mfg_plans').delete().eq('order_code', selectedOrder.order_code);
      const valid = plans.filter(p => p.date && Number(p.weight_kg) > 0);
      if (valid.length) {
        const { error } = await supabase.from('t_mfg_plans').insert(valid.map((p, i) => ({
          plan_code: `PLAN-${selectedOrder.order_code}-${String(i).padStart(3, '0')}`,
          order_code: selectedOrder.order_code, product_code: selectedOrder.product_code,
          scheduled_date: p.date, amount_kg: Number(p.weight_kg), remarks: p.remarks, status: p.status,
          updated_at: new Date().toISOString(),
        })));
        if (error) throw error;
      }
      setAllPlans(prev => ({ ...prev, [selectedOrder.order_code]: valid }));
      addToast('success', '製造計画を保存しました');
    } catch { addToast('error', '保存に失敗しました'); }
    finally { setIsSubmitting(false); }
  };

  // ─── カレンダー：ステータス変更 ───────────────────────────────
  const handleStatusChange = useCallback(async (entry: CalendarEntry) => {
    if (!supabase) return;
    const { order, plan, planIndex } = entry;
    const newStatus = plan.status;

    // 楽観的更新
    setAllPlans(prev => {
      const arr = [...(prev[order.order_code] ?? [])];
      if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], status: newStatus };
      return { ...prev, [order.order_code]: arr };
    });

    try {
      if (plan.id) {
        const { error } = await supabase.from('t_mfg_plans')
          .update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', plan.id);
        if (error) throw error;
      }
      addToast('success', `ステータスを「${newStatus}」に変更しました`);

      // 完了 → 実績モーダル
      if (newStatus === '完了') {
        setResultModal({ order, plan: { ...plan, status: newStatus } });
      }
    } catch {
      // ロールバック
      setAllPlans(prev => {
        const arr = [...(prev[order.order_code] ?? [])];
        if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], status: plan.status };
        return { ...prev, [order.order_code]: arr };
      });
      addToast('error', 'ステータスの更新に失敗しました');
    }
  }, [supabase, addToast]);

  // ─── カレンダー：D&D ──────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, entry: CalendarEntry) => {
    setDragging(entry);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragging || dragging.plan.date === targetDate || !supabase) return;
    const { order, plan, planIndex } = dragging;

    setAllPlans(prev => {
      const arr = [...(prev[order.order_code] ?? [])];
      if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], date: targetDate };
      return { ...prev, [order.order_code]: arr };
    });

    try {
      if (plan.id) {
        const { error } = await supabase.from('t_mfg_plans')
          .update({ scheduled_date: targetDate, updated_at: new Date().toISOString() }).eq('id', plan.id);
        if (error) throw error;
      }
      addToast('success', `製造日を ${targetDate} に変更しました`);
    } catch {
      setAllPlans(prev => {
        const arr = [...(prev[order.order_code] ?? [])];
        if (arr[planIndex]) arr[planIndex] = { ...arr[planIndex], date: plan.date };
        return { ...prev, [order.order_code]: arr };
      });
      addToast('error', '日付変更に失敗しました');
    }
    setDragging(null);
  }, [dragging, supabase, addToast]);

  // ─── 製造実績：製品在庫登録 ────────────────────────────────────
  const handleSaveResult = useCallback(async (input: ProductionResultInput) => {
    if (!supabase || !resultModal) return;
    try {
      const { error } = await supabase.from('t_product_stock').insert({
        product_code: resultModal.order.product_code,
        mfg_lot:      input.mfg_lot,
        expiry_date:  input.expiry_date,
        stock_cs:     input.stock_cs,
        stock_p:      input.stock_p,
        remarks:      input.remarks,
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      });
      if (error) throw error;
      addToast('success', `製品在庫に登録しました（${input.mfg_lot}）`);
    } catch { addToast('error', '製品在庫の登録に失敗しました'); }
    finally { setResultModal(null); }
  }, [supabase, resultModal, addToast]);

  // ─── カレンダー計算 ────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1).getDay();
    const last  = new Date(calYear, calMonth + 1, 0).getDate();
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
        if (!plan.date) return;
        if (!map[plan.date]) map[plan.date] = [];
        map[plan.date].push({ order, plan, planIndex });
      });
    }
    return map;
  }, [orders, allPlans]);

  const prevMonth = () => calMonth === 0 ? (setCalYear(y => y - 1), setCalMonth(11)) : setCalMonth(m => m - 1);
  const nextMonth = () => calMonth === 11 ? (setCalYear(y => y + 1), setCalMonth(0)) : setCalMonth(m => m + 1);
  const isCurMonth = calYear === today.getFullYear() && calMonth === today.getMonth();

  // ─── ローディング ─────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
      <p className="text-slate-500 text-[11px] font-black tracking-[0.4em] uppercase">Loading Production Data</p>
    </div>
  );

  // ─── UI ───────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 製造実績モーダル */}
      {resultModal && (
        <ProductionResultModal
          order={resultModal.order} plan={resultModal.plan}
          onSave={handleSaveResult} onCancel={() => setResultModal(null)}
        />
      )}

      {/* ヘッダー */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 print:hidden">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-sm flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="text-[11px] font-black text-white tracking-[0.2em] uppercase">Manufacturing Planner</span>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800 gap-0.5">
            {(['editor', 'calendar'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-8 py-2 rounded text-[10px] font-black tracking-wider transition-all ${viewMode === m ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                {m === 'editor' ? '計画編集' : 'カレンダー'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {viewMode === 'editor' && selectedOrder && (
              <button onClick={handleSavePlans} disabled={isSubmitting}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 px-5 py-2 rounded-md text-[10px] font-black transition-colors">
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {isSubmitting ? '保存中...' : 'DB 保存'}
              </button>
            )}
            <button onClick={() => window.print()} title="印刷"
              className="p-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white">
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-49px)] overflow-hidden">

        {/* サイドバー */}
        {viewMode === 'editor' && (
          <aside className="w-72 shrink-0 border-r border-slate-800 overflow-y-auto bg-slate-950 print:hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">受注一覧</span>
              <span className="text-[9px] font-mono text-slate-600">{orders.length} 件</span>
            </div>
            <div className="p-2 space-y-1">
              {orders.map(o => {
                const st = orderStatus(o.order_code);
                const selected = selectedOrder?.id === o.id;
                return (
                  <button key={o.id} onClick={() => setSelectedOrder(o)}
                    className={`w-full text-left p-3 rounded-md border transition-all ${selected ? 'bg-slate-800 border-orange-500/60 shadow-lg shadow-orange-900/20' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'}`}>
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[9px] font-mono text-slate-600">{o.request_delivery_date}</span>
                      <span className="text-[10px] font-black text-orange-400">{o.quantity_cs} cs</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[12px] font-black text-white leading-tight flex-1 truncate">{flavor(o.remarks)}</p>
                      {selected && <ChevronRight size={10} className="text-orange-400 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[9px] text-slate-600">
                        <MapPin size={8} /><span className="truncate max-w-[120px]">{destName(o.destination_code)}</span>
                      </div>
                      {st && <StatusBadge status={st} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* メイン */}
        <main className="flex-1 overflow-y-auto">

          {/* ── 計画編集ビュー ── */}
          {viewMode === 'editor' && (
            <div className="p-4">
              {!selectedOrder ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-700">
                  <Factory size={40} className="mb-4 opacity-20" />
                  <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-40">受注を選択してください</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* ヘッダー */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-2xl font-black text-white mb-1">{flavor(selectedOrder.remarks)}</h2>
                        <p className="text-[10px] text-slate-500">{selectedOrder.product_name_at_order}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-slate-600 uppercase mb-0.5">出荷先</p>
                        <p className="text-[11px] font-bold text-slate-300">{destName(selectedOrder.destination_code)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: '受注数量', value: `${selectedOrder.quantity_cs} cs`, alert: false },
                        { label: '必要総量', value: `${metrics.totalWeight.toFixed(0)} kg`, alert: false },
                        { label: '計画済み', value: `${metrics.plannedWeight.toFixed(0)} kg`, alert: false },
                        { label: '残り',     value: `${Math.max(0, metrics.remainingWeight).toFixed(0)} kg`, alert: metrics.remainingWeight < 0 },
                      ].map(m => (
                        <div key={m.label} className={`bg-slate-950 rounded-md p-3 border ${m.alert ? 'border-rose-700/60' : 'border-slate-800'}`}>
                          <p className="text-[9px] text-slate-600 uppercase mb-1">{m.label}</p>
                          <p className={`text-lg font-black font-mono ${m.alert ? 'text-rose-400' : 'text-white'}`}>{m.value}</p>
                          {m.alert && <p className="text-[9px] text-rose-400">超過</p>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                        <span className="flex items-center gap-1"><Gauge size={10} /> 計画進捗率</span>
                        <span className="font-mono font-bold text-slate-400">{metrics.progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div style={{ width: `${metrics.progress}%` }}
                          className={`h-full rounded-full transition-all duration-700 ${metrics.remainingWeight <= 0 ? 'bg-emerald-500' : metrics.progress >= 80 ? 'bg-amber-500' : 'bg-orange-600'}`} />
                      </div>
                    </div>
                  </div>

                  {/* 計画行ヘッダー */}
                  <div className="grid grid-cols-12 gap-2 px-1">
                    {['日付','重量 (kg)','CS換算','ステータス','現場備考',''].map((h, i) => (
                      <div key={h} className={`text-[9px] font-black text-slate-600 uppercase tracking-wider ${['col-span-3','col-span-2','col-span-1','col-span-2','col-span-3','col-span-1'][i]}`}>{h}</div>
                    ))}
                  </div>

                  {/* 計画行 */}
                  <div className="space-y-1.5">
                    {plans.map((p, i) => (
                      <div key={i} className={`grid grid-cols-12 gap-2 border rounded-md p-2.5 items-center transition-all bg-slate-900
                        ${p.status==='完了'?'border-emerald-800/50 bg-emerald-950/20':p.status==='製造中'?'border-amber-800/50 bg-amber-950/20':'border-slate-800 hover:border-slate-700'}`}>
                        <input type="date" value={p.date}
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))}
                          className="col-span-3 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] font-mono text-slate-300 outline-none focus:border-orange-600 transition-colors" />
                        <input type="number" value={p.weight_kg} min={0} placeholder="0"
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, weight_kg: e.target.value } : x))}
                          className="col-span-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] font-mono text-orange-400 outline-none focus:border-orange-600 transition-colors" />
                        <div className="col-span-1 text-center">
                          <span className="text-[10px] font-mono text-slate-500">{Number(p.weight_kg) > 0 ? `${calcCs(p.weight_kg)}cs` : '—'}</span>
                        </div>
                        <select value={p.status}
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, status: e.target.value as Plan['status'] } : x))}
                          className="col-span-2 bg-slate-950 border border-slate-800 px-2 py-2 rounded text-[11px] outline-none focus:border-orange-600 cursor-pointer">
                          <option>計画</option><option>製造中</option><option>完了</option>
                        </select>
                        <input type="text" value={p.remarks} placeholder="現場指示・メモ"
                          onChange={e => setPlans(prev => prev.map((x, j) => j === i ? { ...x, remarks: e.target.value } : x))}
                          className="col-span-3 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] text-slate-400 placeholder:text-slate-700 outline-none focus:border-orange-600 transition-colors" />
                        <button onClick={() => setPlans(prev => prev.filter((_, j) => j !== i))}
                          className="col-span-1 flex justify-center text-slate-700 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-950/30">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setPlans(prev => [...prev, { date: selectedOrder.request_delivery_date, weight_kg: '', remarks: '', status: '計画' }])}
                    className="w-full py-3 border border-dashed border-slate-800 rounded-md text-[10px] font-black text-slate-600 hover:bg-slate-900 hover:text-slate-400 transition-all flex items-center justify-center gap-2">
                    <Plus size={12} /> 計画行を追加
                  </button>

                  {plans.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-md p-3 flex justify-end items-center gap-6">
                      <span className="text-[9px] text-slate-600 uppercase">計画合計</span>
                      <span className="text-[13px] font-black font-mono text-orange-400">
                        {plans.reduce((s, p) => s + (Number(p.weight_kg) || 0), 0).toLocaleString()} kg
                      </span>
                      <span className="text-slate-700">|</span>
                      <span className="text-[13px] font-black font-mono text-slate-400">
                        {plans.reduce((s, p) => s + calcCs(p.weight_kg), 0).toLocaleString()} cs
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── カレンダービュー ── */}
          {viewMode === 'calendar' && (
            <div id="calendar-print-area" className="p-4 print:p-0">

              {/* ヘッダー */}
              <header className="flex justify-between items-center mb-4 print:mb-3">
                <div>
                  <h1 className="text-3xl font-black text-white print:text-black leading-none">
                    {calYear}年 {calMonth + 1}月 製造予定表
                  </h1>
                  <div className="flex items-center gap-3 mt-1 print:hidden">
                    <span className="text-[9px] text-orange-500 uppercase font-black tracking-widest">Production Schedule</span>
                    <span className="text-[9px] text-slate-600">・</span>
                    <span className="text-[9px] text-slate-600">バッジをクリック → ステータス変更　/　カードをドラッグ → 製造日変更</span>
                  </div>
                </div>

                {/* 月切り替え */}
                <div className="flex items-center gap-2 print:hidden">
                  {!isCurMonth && (
                    <button onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-400 transition-all">
                      <RotateCcw size={11} /> 今月
                    </button>
                  )}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <button onClick={prevMonth}
                      className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-black text-sm border-r border-slate-800">
                      ‹
                    </button>
                    <span className="px-5 py-2 text-[11px] font-black text-white font-mono tracking-wider min-w-[120px] text-center">
                      {calYear}年 {calMonth + 1}月
                    </span>
                    <button onClick={nextMonth}
                      className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-black text-sm border-l border-slate-800">
                      ›
                    </button>
                  </div>
                </div>
              </header>

              {/* 凡例 */}
              <div className="flex items-center gap-3 mb-3 print:hidden">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">凡例:</span>
                {(['計画', '製造中', '完了'] as Plan['status'][]).map(s => <StatusBadge key={s} status={s} />)}
              </div>

              {/* 曜日 */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {['日','月','火','水','木','金','土'].map((d, i) => (
                  <div key={d} className={`text-center py-2 text-[10px] font-black tracking-widest
                    ${i===0?'text-rose-400 bg-rose-900/30':i===6?'text-blue-400 bg-blue-900/30':'text-slate-500 bg-slate-900'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* グリッド */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`e-${idx}`} className="min-h-[130px] bg-slate-950/20" />;
                  const dow      = new Date(date).getDay();
                  const entries  = calEntries[date] ?? [];
                  const isToday  = date === todayStr;
                  const isDrop   = dragOver === date;

                  return (
                    <div key={date}
                      onDragOver={e => { e.preventDefault(); setDragOver(date); }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                      onDrop={e => handleDrop(e, date)}
                      className={`min-h-[130px] p-1.5 border transition-all duration-150
                        ${dow===0?'bg-rose-950/10 border-rose-900/30':dow===6?'bg-blue-950/10 border-blue-900/30':'bg-slate-950/40 border-slate-800/60'}
                        ${isToday ? 'ring-1 ring-inset ring-orange-500/50' : ''}
                        ${isDrop  ? 'ring-2 ring-inset ring-blue-500 bg-blue-950/20 border-blue-700/50' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[13px] font-black font-mono leading-none
                          ${isToday?'text-orange-400':dow===0?'text-rose-600':dow===6?'text-blue-600':'text-slate-500'}`}>
                          {date.split('-')[2]}
                        </span>
                        <div className="flex items-center gap-1">
                          {isToday && <span className="text-[7px] font-black text-orange-500 print:hidden">TODAY</span>}
                          {isDrop  && <span className="text-[7px] font-black text-blue-400 animate-pulse print:hidden">DROP HERE</span>}
                          {entries.length > 0 && <span className="text-[8px] text-slate-600 font-mono print:hidden">{entries.length}件</span>}
                        </div>
                      </div>
                      <div className="space-y-1">
                        {entries.map((entry, ei) => (
                          <PlanCard
                            key={`${entry.order.order_code}-${ei}`}
                            entry={entry}
                            onStatusChange={handleStatusChange}
                            onDragStart={handleDragStart}
                          />
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

      <style jsx global>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(16px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body * { visibility: hidden !important; }
          #calendar-print-area, #calendar-print-area * { visibility: visible !important; }
          #calendar-print-area { position: absolute !important; inset: 0; width: 100%; background: white !important; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}