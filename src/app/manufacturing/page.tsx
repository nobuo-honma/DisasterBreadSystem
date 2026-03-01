'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CheckCircle2, Package, Truck, Trash2, Printer, Loader2,
  List, Gauge, MessageSquare, MapPin, Plus, AlertTriangle,
  ChevronRight, X
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
  units_per_cs: number;
  units_per_kg: number;
}
interface Destination {
  destination_code: string;
  destination_name: string;
}
interface Plan {
  id?: string;
  date: string;
  weight_kg: number | string;
  remarks: string;
  status: '計画' | '製造中' | '完了';
}
// カレンダー用：受注ごとにまとめた計画
interface CalendarEntry {
  order: Order;
  plan: Plan;
}

// ─── Toast ────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';
interface ToastMsg { id: number; type: ToastType; message: string; }

function Toast({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-md border text-[11px] font-bold
            shadow-2xl backdrop-blur-sm pointer-events-auto animate-slideIn
            ${t.type === 'success' ? 'bg-green-950 border-green-700 text-green-300' : ''}
            ${t.type === 'error'   ? 'bg-red-950   border-red-700   text-red-300'  : ''}
            ${t.type === 'warning' ? 'bg-amber-950 border-amber-700 text-amber-300': ''}
          `}
        >
          {t.type === 'success' && <CheckCircle2 size={14} />}
          {t.type === 'error'   && <AlertTriangle size={14} />}
          {t.type === 'warning' && <AlertTriangle size={14} />}
          <span>{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-60 hover:opacity-100"><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── ステータスバッジ ──────────────────────────────────────────────
function StatusBadge({ status }: { status: Plan['status'] }) {
  const map: Record<Plan['status'], string> = {
    '計画':  'bg-slate-800 text-slate-400 border-slate-700',
    '製造中':'bg-amber-950 text-amber-400 border-amber-800',
    '完了':  'bg-green-950 text-green-400 border-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black border ${map[status]}`}>
      {status}
    </span>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function ManufacturingPage() {
  const [viewMode, setViewMode]       = useState<'editor' | 'calendar'>('editor');
  const [orders, setOrders]           = useState<Order[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading]         = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plans, setPlans]             = useState<Plan[]>([]);
  // カレンダー用：全受注の全計画 { order_code -> Plan[] }
  const [allPlans, setAllPlans]       = useState<Record<string, Plan[]>>({});
  const [toasts, setToasts]           = useState<ToastMsg[]>([]);
  const [toastId, setToastId]         = useState(0);

  const supabase = useMemo(() => createClient(), []);
  const today = new Date();

  // ─── Toast helper ─────────────────────────────────────────────
  const addToast = useCallback((type: ToastType, message: string) => {
    const id = toastId + 1;
    setToastId(id);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, [toastId]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── 初期データ取得 ────────────────────────────────────────────
  useEffect(() => {
    const initData = async () => {
      if (!supabase) return;
      try {
        const [resOrders, resProducts, resDest, resAllPlans] = await Promise.all([
          supabase.from('t_orders').select('*').order('request_delivery_date', { ascending: true }),
          supabase.from('m_products').select('*'),
          supabase.from('m_destinations').select('*'),
          supabase.from('t_mfg_plans').select('*').order('scheduled_date', { ascending: true }),
        ]);

        setOrders(resOrders.data ?? []);
        setProducts(resProducts.data ?? []);
        setDestinations(resDest.data ?? []);

        // 全計画をorder_codeごとに整理
        const planMap: Record<string, Plan[]> = {};
        for (const d of (resAllPlans.data ?? [])) {
          const key = d.order_code as string;
          if (!planMap[key]) planMap[key] = [];
          planMap[key].push({
            id: d.id,
            date: d.scheduled_date,
            weight_kg: d.amount_kg,
            remarks: d.remarks || '',
            status: d.status as Plan['status'],
          });
        }
        setAllPlans(planMap);
      } catch (err) {
        addToast('error', 'データの取得に失敗しました');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ─── 受注選択時：計画ロード ────────────────────────────────────
  useEffect(() => {
    if (!selectedOrder) { setPlans([]); return; }
    const existing = allPlans[selectedOrder.order_code];
    if (existing && existing.length > 0) {
      setPlans(existing);
    } else {
      setPlans([{ date: selectedOrder.request_delivery_date, weight_kg: '', remarks: '', status: '計画' }]);
    }
  }, [selectedOrder, allPlans]);

  // ─── 計算ユーティリティ ────────────────────────────────────────
  const currentProduct = useMemo(
    () => products.find(p => p.product_code === selectedOrder?.product_code),
    [selectedOrder, products]
  );

  const metrics = useMemo(() => {
    if (!selectedOrder || !currentProduct) return { totalWeight: 0, plannedWeight: 0, remainingWeight: 0, progress: 0 };
    const upc = Number(currentProduct.units_per_cs);
    const upk = Number(currentProduct.units_per_kg);
    const totalWeight = upk > 0 && upc > 0 ? (selectedOrder.quantity_cs * upc) / upk : 0;
    const plannedWeight = plans.reduce((sum, p) => sum + (Number(p.weight_kg) || 0), 0);
    const progress = totalWeight > 0 ? Math.min((plannedWeight / totalWeight) * 100, 100) : 0;
    return { totalWeight, plannedWeight, remainingWeight: totalWeight - plannedWeight, progress };
  }, [selectedOrder, currentProduct, plans]);

  const calcCsFromWeight = useCallback((weight: number | string, product?: Product) => {
    const prod = product ?? currentProduct;
    if (!prod || Number(prod.units_per_cs) === 0) return 0;
    return Math.floor((Number(weight) * Number(prod.units_per_kg)) / Number(prod.units_per_cs));
  }, [currentProduct]);

  const getDestinationName = useCallback(
    (code: string) => destinations.find(d => d.destination_code === code)?.destination_name || code,
    [destinations]
  );

  const extractFlavor = (remarks: string) => remarks?.match(/味:([^|]+)/)?.[1]?.trim() || '通常';

  // ─── バリデーション ────────────────────────────────────────────
  const validatePlans = (): string | null => {
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (!p.date) return `${i + 1}行目: 日付が未入力です`;
      if (!p.weight_kg || Number(p.weight_kg) <= 0) return `${i + 1}行目: 重量を入力してください`;
    }
    return null;
  };

  // ─── DB保存 ───────────────────────────────────────────────────
  const handleRegisterPlan = async () => {
    if (!selectedOrder || !supabase) return;
    const err = validatePlans();
    if (err) { addToast('warning', err); return; }

    setIsSubmitting(true);
    try {
      await supabase.from('t_mfg_plans').delete().eq('order_code', selectedOrder.order_code);
      const validPlans = plans.filter(p => p.date && Number(p.weight_kg) > 0);
      const insertData = validPlans.map((p, i) => ({
        plan_code: `PLAN-${selectedOrder.order_code}-${String(i).padStart(3, '0')}`,
        order_code: selectedOrder.order_code,
        product_code: selectedOrder.product_code,
        scheduled_date: p.date,
        amount_kg: Number(p.weight_kg),
        remarks: p.remarks,
        status: p.status,
        updated_at: new Date().toISOString(),
      }));
      if (insertData.length > 0) {
        const { error } = await supabase.from('t_mfg_plans').insert(insertData);
        if (error) throw error;
      }

      // ローカルのallPlansも更新
      setAllPlans(prev => ({ ...prev, [selectedOrder.order_code]: validPlans }));
      addToast('success', '製造計画を保存しました');
    } catch (e) {
      console.error(e);
      addToast('error', '保存に失敗しました。再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 行操作 ───────────────────────────────────────────────────
  const updatePlan = (index: number, field: keyof Plan, value: string) => {
    setPlans(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };
  const removePlan = (index: number) => {
    setPlans(prev => prev.filter((_, i) => i !== index));
  };
  const addPlan = () => {
    setPlans(prev => [...prev, {
      date: selectedOrder?.request_delivery_date ?? '',
      weight_kg: '',
      remarks: '',
      status: '計画',
    }]);
  };

  // ─── カレンダー ────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
    const lastDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const prefix = Array(firstDay).fill(null);
    const days = Array.from({ length: lastDate }, (_, i) => {
      const d = i + 1;
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    return [...prefix, ...days];
  }, []);

  // カレンダー日付ごとのエントリ収集（全受注）
  const calendarEntries = useMemo<Record<string, CalendarEntry[]>>(() => {
    const map: Record<string, CalendarEntry[]> = {};
    for (const order of orders) {
      const ps = allPlans[order.order_code] ?? [];
      for (const plan of ps) {
        if (!plan.date) continue;
        if (!map[plan.date]) map[plan.date] = [];
        map[plan.date].push({ order, plan });
      }
    }
    return map;
  }, [orders, allPlans]);

  // ─── 受注リストのステータスサマリ ──────────────────────────────
  const getOrderStatus = (orderCode: string): Plan['status'] | null => {
    const ps = allPlans[orderCode];
    if (!ps || ps.length === 0) return null;
    if (ps.every(p => p.status === '完了')) return '完了';
    if (ps.some(p => p.status === '製造中')) return '製造中';
    return '計画';
  };

  // ─── ローディング ─────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
      <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
      <p className="text-slate-500 text-[11px] font-black tracking-[0.4em] uppercase">Loading Production Data</p>
    </div>
  );

  // ─── レンダリング ──────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* ─ ヘッダー ─ */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 print:hidden">
        <div className="flex justify-between items-center px-4 py-2">
          {/* ロゴ */}
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-orange-500 rounded-sm flex items-center justify-center">
              <Package size={14} className="text-white" />
            </div>
            <span className="text-[11px] font-black text-white tracking-[0.2em] uppercase">Manufacturing Planner</span>
          </div>

          {/* タブ */}
          <div className="flex bg-slate-900 p-1 rounded-md border border-slate-800 gap-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`px-8 py-2 rounded text-[10px] font-black tracking-wider transition-all ${viewMode === 'editor' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              計画編集
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-8 py-2 rounded text-[10px] font-black tracking-wider transition-all ${viewMode === 'calendar' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
            >
              カレンダー
            </button>
          </div>

          {/* アクション */}
          <div className="flex items-center gap-2">
            {viewMode === 'editor' && selectedOrder && (
              <button
                onClick={handleRegisterPlan}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-md text-[10px] font-black tracking-wider transition-colors"
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {isSubmitting ? '保存中...' : 'DB 保存'}
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="p-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
              title="印刷"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-49px)] overflow-hidden print:block print:h-auto">

        {/* ─ サイドバー（受注リスト） ─ */}
        {viewMode === 'editor' && (
          <aside className="w-72 shrink-0 border-r border-slate-800 overflow-y-auto bg-slate-950 print:hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">受注一覧</span>
              <span className="text-[9px] font-mono text-slate-600">{orders.length} 件</span>
            </div>
            <div className="p-2 space-y-1">
              {orders.length === 0 && (
                <p className="text-center text-[10px] text-slate-600 py-8">受注データがありません</p>
              )}
              {orders.map(o => {
                const status = getOrderStatus(o.order_code);
                const isSelected = selectedOrder?.id === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className={`w-full text-left p-3 rounded-md border transition-all group
                      ${isSelected
                        ? 'bg-slate-800 border-orange-500/60 shadow-lg shadow-orange-900/20'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[9px] font-mono text-slate-600">{o.request_delivery_date}</span>
                      <span className="text-[10px] font-black text-orange-400">{o.quantity_cs} cs</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <p className="text-[12px] font-black text-white leading-tight flex-1 truncate">{extractFlavor(o.remarks)}</p>
                      {isSelected && <ChevronRight size={10} className="text-orange-400 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[9px] text-slate-600">
                        <MapPin size={8} />
                        <span className="truncate max-w-[120px]">{getDestinationName(o.destination_code)}</span>
                      </div>
                      {status && <StatusBadge status={status} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* ─ メインエリア ─ */}
        <main className="flex-1 overflow-y-auto print:overflow-visible">

          {/* ─── 計画編集ビュー ─── */}
          {viewMode === 'editor' && (
            <div className="p-4 print:hidden">
              {!selectedOrder ? (
                <div className="h-full flex flex-col items-center justify-center min-h-[60vh] text-slate-700">
                  <List size={40} className="mb-4 opacity-30" />
                  <p className="text-[12px] font-black uppercase tracking-[0.3em] opacity-40">受注を選択してください</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-4">

                  {/* 受注ヘッダー */}
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-2xl font-black text-white mb-1">{extractFlavor(selectedOrder.remarks)}</h2>
                        <p className="text-[10px] text-slate-500">{selectedOrder.product_name_at_order}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[9px] text-slate-600 uppercase mb-0.5">出荷先</p>
                        <p className="text-[11px] font-bold text-slate-300">{getDestinationName(selectedOrder.destination_code)}</p>
                      </div>
                    </div>

                    {/* メトリクス */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        { label: '受注数量', value: `${selectedOrder.quantity_cs} cs`, sub: null },
                        { label: '必要総量', value: `${metrics.totalWeight.toFixed(0)} kg`, sub: null },
                        { label: '計画済み', value: `${metrics.plannedWeight.toFixed(0)} kg`, sub: null },
                        { label: '残り', value: `${Math.max(0, metrics.remainingWeight).toFixed(0)} kg`, sub: metrics.remainingWeight < 0 ? '超過' : null, alert: metrics.remainingWeight < 0 },
                      ].map(m => (
                        <div key={m.label} className={`bg-slate-950 rounded-md p-3 border ${m.alert ? 'border-rose-700/60' : 'border-slate-800'}`}>
                          <p className="text-[9px] text-slate-600 uppercase mb-1">{m.label}</p>
                          <p className={`text-lg font-black font-mono ${m.alert ? 'text-rose-400' : 'text-white'}`}>{m.value}</p>
                          {m.sub && <p className="text-[9px] text-rose-400">{m.sub}</p>}
                        </div>
                      ))}
                    </div>

                    {/* プログレスバー */}
                    <div>
                      <div className="flex justify-between text-[9px] text-slate-600 mb-1">
                        <span className="flex items-center gap-1"><Gauge size={10} /> 計画進捗率</span>
                        <span className="font-mono font-bold text-slate-400">{metrics.progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            metrics.remainingWeight <= 0 ? 'bg-green-500' :
                            metrics.progress >= 80 ? 'bg-amber-500' : 'bg-orange-600'
                          }`}
                          style={{ width: `${metrics.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 計画行ヘッダー */}
                  <div className="grid grid-cols-12 gap-2 px-1">
                    {['日付', '重量 (kg)', 'CS換算', 'ステータス', '現場備考', ''].map((h, i) => (
                      <div
                        key={h}
                        className={`text-[9px] font-black text-slate-600 uppercase tracking-wider ${
                          i === 0 ? 'col-span-3' : i === 1 ? 'col-span-2' : i === 2 ? 'col-span-1' :
                          i === 3 ? 'col-span-2' : i === 4 ? 'col-span-3' : 'col-span-1'
                        }`}
                      >
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* 計画行 */}
                  <div className="space-y-1.5">
                    {plans.map((p, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-12 gap-2 bg-slate-900 border rounded-md p-2.5 items-center transition-all
                          ${p.status === '完了'   ? 'border-green-800/50 bg-green-950/20' :
                            p.status === '製造中' ? 'border-amber-800/50 bg-amber-950/20' :
                            'border-slate-800 hover:border-slate-700'}`}
                      >
                        <input
                          type="date"
                          value={p.date}
                          onChange={e => updatePlan(i, 'date', e.target.value)}
                          className="col-span-3 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] font-mono text-slate-300 outline-none focus:border-orange-600 transition-colors"
                        />
                        <input
                          type="number"
                          value={p.weight_kg}
                          min={0}
                          onChange={e => updatePlan(i, 'weight_kg', e.target.value)}
                          placeholder="0"
                          className="col-span-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] font-mono text-orange-400 outline-none focus:border-orange-600 transition-colors"
                        />
                        <div className="col-span-1 text-center">
                          <span className="text-[10px] font-mono text-slate-500">
                            {Number(p.weight_kg) > 0 ? `${calcCsFromWeight(p.weight_kg)}cs` : '—'}
                          </span>
                        </div>
                        <select
                          value={p.status}
                          onChange={e => updatePlan(i, 'status', e.target.value)}
                          className="col-span-2 bg-slate-950 border border-slate-800 px-2 py-2 rounded text-[11px] outline-none focus:border-orange-600 transition-colors cursor-pointer"
                        >
                          <option>計画</option>
                          <option>製造中</option>
                          <option>完了</option>
                        </select>
                        <input
                          type="text"
                          value={p.remarks}
                          placeholder="現場指示・メモ"
                          onChange={e => updatePlan(i, 'remarks', e.target.value)}
                          className="col-span-3 bg-slate-950 border border-slate-800 px-3 py-2 rounded text-[11px] text-slate-400 placeholder:text-slate-700 outline-none focus:border-orange-600 transition-colors"
                        />
                        <button
                          onClick={() => removePlan(i)}
                          className="col-span-1 flex justify-center text-slate-700 hover:text-rose-500 transition-colors p-1 rounded hover:bg-rose-950/30"
                          title="削除"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* 行追加ボタン */}
                  <button
                    onClick={addPlan}
                    className="w-full py-3 border border-dashed border-slate-800 rounded-md text-[10px] font-black text-slate-600 hover:bg-slate-900 hover:text-slate-400 hover:border-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={12} />
                    計画行を追加
                  </button>

                  {/* 合計サマリ */}
                  {plans.length > 0 && (
                    <div className="bg-slate-900 border border-slate-800 rounded-md p-3 flex justify-end items-center gap-6">
                      <span className="text-[9px] text-slate-600 uppercase">計画合計</span>
                      <span className="text-[13px] font-black font-mono text-orange-400">
                        {plans.reduce((s, p) => s + (Number(p.weight_kg) || 0), 0).toLocaleString()} kg
                      </span>
                      <span className="text-slate-700">|</span>
                      <span className="text-[13px] font-black font-mono text-slate-400">
                        {plans.reduce((s, p) => s + calcCsFromWeight(p.weight_kg), 0).toLocaleString()} cs
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── カレンダービュー ─── */}
          {viewMode === 'calendar' && (
            <div id="calendar-print-area" className="p-4 print:p-0">
              {/* カレンダーヘッダー */}
              <header className="flex justify-between items-end mb-5 print:mb-4">
                <div>
                  <h1 className="text-3xl font-black text-white print:text-black leading-none">
                    {today.getFullYear()}年 {today.getMonth() + 1}月 製造予定表
                  </h1>
                  <p className="text-[9px] font-black text-orange-500 uppercase mt-1 tracking-[0.4em] print:hidden">Production Schedule</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 uppercase">更新日</p>
                  <p className="text-[13px] font-mono font-black text-white print:text-black">{today.toLocaleDateString('ja-JP')}</p>
                </div>
              </header>

              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5 print:gap-0">
                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                  <div
                    key={d}
                    className={`text-center py-2 text-[10px] font-black tracking-widest
                      ${i === 0 ? 'text-rose-400 bg-rose-900/30 print:text-red-700 print:bg-red-50' :
                        i === 6 ? 'text-blue-400 bg-blue-900/30 print:text-blue-700 print:bg-blue-50' :
                        'text-slate-500 bg-slate-900 print:text-black print:bg-gray-100'
                      }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7 gap-0.5 print:gap-0">
                {calendarDays.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="min-h-[120px] bg-slate-950/20 print:bg-gray-50" />;

                  const dow = new Date(date).getDay();
                  const entries = calendarEntries[date] ?? [];
                  const isToday = date === today.toISOString().slice(0, 10);

                  return (
                    <div
                      key={date}
                      className={`min-h-[120px] p-1.5 border border-slate-800/60 transition-colors print:min-h-[110px] print:border-black print:border
                        ${dow === 0 ? 'bg-rose-950/10 print:bg-red-50' :
                          dow === 6 ? 'bg-blue-950/10 print:bg-blue-50' :
                          'bg-slate-950/40 print:bg-white'
                        }
                        ${isToday ? 'ring-1 ring-inset ring-orange-500/40' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[13px] font-black font-mono leading-none
                          ${isToday ? 'text-orange-400 print:text-orange-700' :
                            dow === 0 ? 'text-rose-600 print:text-red-500' :
                            dow === 6 ? 'text-blue-600 print:text-blue-500' :
                            'text-slate-500 print:text-black'
                          }`}
                        >
                          {date.split('-')[2]}
                        </span>
                        {isToday && (
                          <span className="text-[8px] font-black text-orange-500 print:hidden">TODAY</span>
                        )}
                        {entries.length > 0 && (
                          <span className="text-[8px] font-black text-slate-600 font-mono print:hidden">{entries.length}件</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        {entries.map(({ order, plan }, ei) => {
                          const prod = products.find(p => p.product_code === order.product_code);
                          return (
                            <div
                              key={ei}
                              className={`border border-l-2 pl-1.5 py-0.5 rounded-sm
                                print:rounded-none print:bg-white print:py-1 print:pl-2 print:mb-1
                                ${plan.status === '完了'
                                  ? 'border-green-700/60 border-l-green-500 bg-green-950/20 print:border-green-600'
                                  : plan.status === '製造中'
                                  ? 'border-amber-700/60 border-l-amber-500 bg-amber-950/20 print:border-amber-600'
                                  : 'border-slate-700/60 border-l-orange-500 bg-slate-900/60 print:border-gray-400'
                                }`}
                            >
                              <p className="text-[9px] font-black text-white leading-tight truncate print:text-black">
                                {extractFlavor(order.remarks)}
                              </p>
                              <p className="text-[8px] text-slate-500 leading-tight truncate print:text-gray-700">
                                {order.product_name_at_order}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] font-black text-orange-400 font-mono print:text-orange-700">
                                  {Number(plan.weight_kg).toLocaleString()}kg
                                </span>
                                {prod && (
                                  <>
                                    <span className="text-slate-700">/</span>
                                    <span className="text-[9px] font-bold text-slate-500 font-mono print:text-black">
                                      {calcCsFromWeight(plan.weight_kg, prod)}cs
                                    </span>
                                  </>
                                )}
                              </div>
                              {plan.remarks && (
                                <div className="flex items-start gap-0.5 mt-0.5">
                                  <MessageSquare size={7} className="text-blue-400 mt-0.5 shrink-0 print:hidden" />
                                  <p className="text-[8px] text-blue-400 leading-tight print:text-blue-700 break-all">
                                    {plan.remarks}
                                  </p>
                                </div>
                              )}
                              <div className="mt-0.5 print:hidden">
                                <StatusBadge status={plan.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── 印刷スタイル ─── */}
      <style jsx global>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.25s ease-out; }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body * { visibility: hidden !important; }

          #calendar-print-area,
          #calendar-print-area * {
            visibility: visible !important;
          }

          #calendar-print-area {
            position: absolute !important;
            inset: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }

          * { box-shadow: none !important; }

          .text-white  { color: #111 !important; }
          .text-slate-400 { color: #444 !important; }
          .text-orange-400, .text-orange-500 { color: #c2410c !important; }
          .text-blue-400   { color: #1d4ed8 !important; }
          .text-green-400  { color: #15803d !important; }
          .text-amber-400  { color: #b45309 !important; }
        }
      `}</style>
    </div>
  );
}