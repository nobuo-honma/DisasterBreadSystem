'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { TItemStock, TProductStock } from '@/types/database';
import {
  Search, AlertTriangle, CheckCircle2, X, Loader2, ClipboardList,
  Package, Layers, BarChart3, History, RefreshCw, Info,
} from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────────────
type Category    = '原材料' | '資材' | '製品';
type PageMode    = 'view' | 'stocktaking';
type StockStatus = '適正' | '在庫低下' | '欠品';

/** DBから取得した生の在庫行 */
interface ItemStockRaw extends TItemStock {
  item_name?:      string;
  min_stock_level: number;
}

/**
 * フロントで計算した値を付加した表示用行。
 * planned_usage / available_stock / stock_status は
 * DBの生成列ではなく、製造計画 × BOM から動的算出する。
 */
interface ItemStockRow extends ItemStockRaw {
  calc_planned_usage: number;
  calc_available:     number;
  calc_status:        StockStatus;
  plan_detail: { order_code: string; product_code: string; amount_kg: number }[];
}

/**
 * BOM: m_bom テーブル
 * usage_rate  : 使用量（basis_unit が '製造量' なら kg あたり、'受注数' なら CS あたり）
 * basis_unit  : '製造量' | '受注数'
 */
interface BomRow {
  product_code: string;
  item_code:    string;
  usage_rate:   number;
  basis_unit:   '製造量' | '受注数';
  category:     string;
}

/** 製造計画（完了以外） */
interface MfgPlanRow {
  product_code: string;
  order_code:   string;
  amount_kg:    number;
  amount_cs:    number;  // 受注数基準BOMで使用
  status:       string;
}

interface StocktakingLog {
  id:           string;
  item_code:    string;
  item_name?:   string;
  before_stock: number;
  after_stock:  number;
  difference?:  number;  // DBの生成列
  diff:         number;  // フロント計算（difference と同値）
  remarks:      string;
  adjusted_at:  string;  // t_stocktaking_log の実カラム名
  created_at?:  string;  // フォールバック用
}

// ─── Toast ────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastMsg { id: number; type: ToastType; text: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [_id, setId] = useState(0);
  const add = useCallback((type: ToastType, text: string) => {
    setId(prev => {
      const id = prev + 1;
      setToasts(cur => [...cur, { id, type, text }]);
      setTimeout(() => setToasts(cur => cur.filter(t => t.id !== id)), 4500);
      return id;
    });
  }, []);
  const remove = useCallback((id: number) => setToasts(cur => cur.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

function ToastContainer({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  const icon: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={13} />,
    error:   <AlertTriangle size={13} />,
    warning: <AlertTriangle size={13} />,
    info:    <Info size={13} />,
  };
  const cls: Record<ToastType, string> = {
    success: 'bg-emerald-950 border-emerald-700/60 text-emerald-300',
    error:   'bg-rose-950   border-rose-700/60   text-rose-300',
    warning: 'bg-amber-950  border-amber-700/60  text-amber-300',
    info:    'bg-sky-950    border-sky-700/60    text-sky-300',
  };
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-[11px] font-bold shadow-2xl backdrop-blur pointer-events-auto ${cls[t.type]}`}
          style={{ animation: 'slideIn 0.2s ease-out' }}
        >
          {icon[t.type]}
          <span>{t.text}</span>
          <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100"><X size={11} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── ステータスバッジ ──────────────────────────────────────────────
function StockBadge({ status }: { status: StockStatus }) {
  const cls: Record<StockStatus, string> = {
    '欠品':     'bg-rose-500/10  text-rose-400  border-rose-500/30',
    '在庫低下': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    '適正':     'bg-slate-800    text-slate-400 border-slate-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls[status]}`}>
      {status}
    </span>
  );
}

// ─── 差分バッジ ───────────────────────────────────────────────────
function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) return <span className="text-slate-600 text-[10px] font-mono">±0</span>;
  return (
    <span className={`text-[10px] font-black font-mono ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
      {diff > 0 ? '+' : ''}{diff}
    </span>
  );
}

// ─── 計画内訳ホバーポップオーバー ────────────────────────────────
function PlanDetailTooltip({ detail }: { detail: ItemStockRow['plan_detail'] }) {
  const [open, setOpen] = useState(false);
  if (detail.length === 0) return <span className="text-slate-700 text-[10px]">—</span>;
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-[9px] text-slate-500 hover:text-sky-400 transition-colors border-b border-dashed border-slate-700"
      >
        {detail.length}件の計画
      </button>
      {open && (
        <div className="absolute z-20 bottom-full left-0 mb-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-3">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">製造計画 内訳</p>
          <div className="space-y-1.5">
            {detail.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-slate-400">{d.order_code}</span>
                  <span className="text-slate-700">/</span>
                  <span className="text-slate-500">{d.product_code}</span>
                </div>
                <span className="font-black font-mono text-sky-400">{d.amount_kg.toFixed(3)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-[10px]">
            <span className="text-slate-500">合計</span>
            <span className="font-black font-mono text-sky-300">
              {detail.reduce((s, d) => s + d.amount_kg, 0).toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ステータス計算ロジック ───────────────────────────────────────
/**
 * 欠品:     actual_stock < planned_usage
 * 在庫低下: actual_stock < planned_usage + min_stock_level
 * 適正:     それ以外
 */
function calcStatus(actual: number, planned: number, minLevel: number): StockStatus {
  if (actual < planned)              return '欠品';
  if (actual < planned + minLevel)   return '在庫低下';
  return '適正';
}

// ─── メインコンテンツ ─────────────────────────────────────────────
function InventoryContent() {
  const searchParams = useSearchParams();
  const initMode     = searchParams.get('inventory') === 'true' ? 'stocktaking' : 'view';

  const [pageMode, setPageMode] = useState<PageMode>(initMode as PageMode);
  const [category, setCategory] = useState<Category>('原材料');
  const [search, setSearch]     = useState('');

  // 在庫生データ
  const [itemStocksRaw, setItemStocksRaw] = useState<ItemStockRaw[]>([]);
  const [productStocks, setProductStocks] = useState<(TProductStock & { product_name?: string })[]>([]);

  // 計画・BOM
  const [mfgPlans, setMfgPlans] = useState<MfgPlanRow[]>([]);
  const [bom, setBom]           = useState<BomRow[]>([]);

  // 棚卸入力
  const [adjustments, setAdjustments]               = useState<Record<string, string>>({});
  const [productAdjustments, setProductAdjustments] = useState<Record<string, { cs: string; p: string }>>();

  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [logs, setLogs]               = useState<StocktakingLog[]>([]);
  const [logsOpen, setLogsOpen]       = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const { toasts, add: addToast, remove: removeToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // ─── データロード ──────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setAdjustments({});
    setProductAdjustments(undefined);
    try {
      if (category === '製品') {
        const { data, error } = await supabase
          .from('t_product_stock')
          .select('*, m_products(product_name)')
          .order('expiry_date', { ascending: true });
        if (error) throw error;
        setProductStocks((data ?? []).map((d: any) => ({
          ...d,
          product_name: d.m_products?.product_name ?? d.product_code,
        })));
        setItemStocksRaw([]);
        setMfgPlans([]);
        setBom([]);
      } else {
        // 在庫・マスタ・製造計画・BOM を並列取得
        const [
          { data: allStocks,     error: e1 },
          { data: categoryItems, error: e2 },
          { data: planData,      error: e3 },
          { data: bomData,       error: e4 },
        ] = await Promise.all([
          supabase.from('t_item_stock').select('*'),
          supabase.from('m_items').select('item_code, item_name').eq('category', category),
          // 完了以外の計画のみ（計画・製造中）
          supabase
            .from('t_mfg_plans')
            .select('product_code, order_code, amount_kg, amount_cs, status')
            .neq('status', '完了'),
          // BOM: 製品1単位あたりの品目使用量
          supabase
            .from('m_bom')
            .select('product_code, item_code, usage_rate, basis_unit, category'),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        // BOM・計画がない場合は警告のみ（テーブル未作成環境対応）
        if (e3) console.warn('t_mfg_plans:', e3.message);
        if (e4) console.warn('m_bom:', e4.message);

        const codeSet = new Set((categoryItems ?? []).map((i: any) => i.item_code as string));
        const nameMap = new Map((categoryItems ?? []).map((i: any) => [i.item_code as string, i.item_name as string]));
        const filtered = (allStocks ?? []).filter((s: TItemStock) => codeSet.has(s.item_code));

        setItemStocksRaw(
          filtered.map((s: TItemStock) => ({
            ...s,
            item_name:       nameMap.get(s.item_code),
            // t_item_stock.min_stock_level を優先、なければ m_items.min_stock は
            // allStocks には含まれないため t_item_stock 側のカラムを使う
            min_stock_level: Number((s as any).min_stock_level ?? 0),
          }))
        );
        setMfgPlans((planData ?? []) as MfgPlanRow[]);
        setBom((bomData ?? []) as BomRow[]);
        setProductStocks([]);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [supabase, category, addToast]);

  useEffect(() => { load(); }, [load]);

  // ─── 計画使用量を BOM × 製造計画 から計算 ───────────────────────
  /**
   * item_code ごとの計画使用量マップを生成する。
   *
   * planned_usage[item] = Σ( plan.amount_kg × bom[plan.product][item].usage_per_kg )
   *   ※ status が '完了' の計画は除外済み（fetch 時に .neq('status','完了') 指定）
   */
  const plannedUsageMap = useMemo<Map<string, { total: number; detail: ItemStockRow['plan_detail'] }>>(() => {
    const map = new Map<string, { total: number; detail: ItemStockRow['plan_detail'] }>();

    // BOM をネスト Map 化: productCode → itemCode → { usageRate, basisUnit }
    // basis_unit='製造量': plan.amount_kg × usage_rate
    // basis_unit='受注数': この計画行に対応する受注CSは plan側に amount_cs があるが
    //   t_mfg_plans の amount_kg を使うため、'受注数'の場合も amount_kg ベースで近似
    //   （より正確にしたい場合は amount_cs を別途取得）
    interface BomIndexEntry { usageRate: number; basisUnit: string; }
    const bomIndex = new Map<string, Map<string, BomIndexEntry>>();
    for (const b of bom) {
      if (!bomIndex.has(b.product_code)) bomIndex.set(b.product_code, new Map());
      bomIndex.get(b.product_code)!.set(b.item_code, {
        usageRate: Number(b.usage_rate),
        basisUnit: b.basis_unit,
      });
    }

    for (const plan of mfgPlans) {
      const items = bomIndex.get(plan.product_code);
      if (!items) continue; // BOM 未登録製品はスキップ

      items.forEach(({ usageRate, basisUnit }, itemCode) => {
        // '製造量'(kg基準): plan.amount_kg × usage_rate
        // '受注数'(CS基準): plan.amount_cs × usage_rate（amount_cs が取得できれば）
        //   現状 amount_kg のみ取得しているため、受注数基準は amount_cs で代替
        const planQty = basisUnit === '受注数'
          ? (Number((plan as any).amount_cs) || Number(plan.amount_kg))
          : Number(plan.amount_kg);
        const usage    = planQty * usageRate;
        const existing = map.get(itemCode) ?? { total: 0, detail: [] };
        existing.total += usage;
        existing.detail.push({
          order_code:   plan.order_code,
          product_code: plan.product_code,
          amount_kg:    usage,
        });
        map.set(itemCode, existing);
      });
    }
    return map;
  }, [mfgPlans, bom]);

  // ─── 表示用アイテム行（計算値を付加） ────────────────────────────
  const itemStocks = useMemo<ItemStockRow[]>(() =>
    itemStocksRaw.map(raw => {
      const entry     = plannedUsageMap.get(raw.item_code) ?? { total: 0, detail: [] };
      const planned   = entry.total;
      const available = Number(raw.actual_stock) - planned;
      const status    = calcStatus(Number(raw.actual_stock), planned, Number(raw.min_stock_level));
      return { ...raw, calc_planned_usage: planned, calc_available: available, calc_status: status, plan_detail: entry.detail };
    }),
  [itemStocksRaw, plannedUsageMap]);

  // ─── フィルタ ────────────────────────────────────────────────────
  const filteredItems = useMemo(() =>
    itemStocks.filter(s => !search || (s.item_name ?? s.item_code).toLowerCase().includes(search.toLowerCase())),
  [itemStocks, search]);

  const filteredProducts = useMemo(() =>
    productStocks.filter(s => !search || (s.product_name ?? s.product_code).toLowerCase().includes(search.toLowerCase())),
  [productStocks, search]);

  // ─── サマリ ──────────────────────────────────────────────────────
  const statusSummary = useMemo(() => ({
    欠品:     itemStocks.filter(s => s.calc_status === '欠品').length,
    在庫低下: itemStocks.filter(s => s.calc_status === '在庫低下').length,
    適正:     itemStocks.filter(s => s.calc_status === '適正').length,
  }), [itemStocks]);

  const changedItemCount    = useMemo(() => Object.values(adjustments).filter(v => v !== '').length, [adjustments]);
  const changedProductCount = useMemo(() =>
    productAdjustments ? Object.values(productAdjustments).filter(v => v.cs !== '' || v.p !== '').length : 0,
  [productAdjustments]);
  const totalChanged = changedItemCount + changedProductCount;

  // ─── 棚卸ログ取得 ────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    if (!supabase) return;
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('t_stocktaking_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      const codes = Array.from(new Set((data ?? []).map((d: any) => d.item_code as string)));
      const { data: items } = await supabase.from('m_items').select('item_code, item_name').in('item_code', codes);
      const nameMap = new Map((items ?? []).map((i: any) => [i.item_code as string, i.item_name as string]));

      setLogs((data ?? []).map((d: any) => ({
        ...d,
        item_name: nameMap.get(d.item_code),
        // DBの生成列 difference があればそれを使い、なければ計算
        diff: d.difference ?? (d.after_stock - d.before_stock),
      })));
    } catch {
      addToast('error', '棚卸ログの取得に失敗しました');
    } finally {
      setLogsLoading(false);
    }
  }, [supabase, addToast]);

  useEffect(() => { if (logsOpen) loadLogs(); }, [logsOpen, loadLogs]);

  // ─── 棚卸保存 ────────────────────────────────────────────────────
  const handleSaveStocktaking = async () => {
    if (!supabase) return;
    setSaving(true);
    setConfirmOpen(false);
    try {
      const itemEntries = Object.entries(adjustments).filter(([, v]) => v !== '');
      for (let i = 0; i < itemEntries.length; i++) {
        const [itemCode, valStr] = itemEntries[i];
        const after = Number(valStr);
        const row   = itemStocksRaw.find(s => s.item_code === itemCode);
        if (!row) continue;
        const { error: logErr } = await supabase.from('t_stocktaking_log').insert({
          item_code:    itemCode,
          before_stock: Number(row.actual_stock),
          after_stock:  after,
          remarks:      '棚卸',
          // adjusted_at はデフォルト NOW() のため省略
        });
        if (logErr) throw logErr;
        const { error: updErr } = await supabase.from('t_item_stock')
          .update({ actual_stock: after, updated_at: new Date().toISOString() })
          .eq('item_code', itemCode);
        if (updErr) throw updErr;
      }

      if (productAdjustments) {
        const prodEntries = Object.entries(productAdjustments).filter(([, v]) => v.cs !== '' || v.p !== '');
        for (let i = 0; i < prodEntries.length; i++) {
          const [lot, val] = prodEntries[i];
          const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
          if (val.cs !== '') updates.stock_cs = Number(val.cs);
          if (val.p  !== '') updates.stock_p  = Number(val.p);
          const { error } = await supabase.from('t_product_stock').update(updates).eq('mfg_lot', lot);
          if (error) throw error;
        }
      }

      addToast('success', `棚卸完了：${totalChanged} 品目を更新しました`);
      setAdjustments({});
      setProductAdjustments(undefined);
      load();
    } catch (err) {
      console.error(err);
      addToast('error', '保存に失敗しました。再度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  const isStocktaking = pageMode === 'stocktaking';

  // ─── レンダリング ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
              <Layers size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-black text-white tracking-wide leading-none">在庫管理</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Inventory Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setPageMode('view')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${pageMode === 'view' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <BarChart3 size={11} /> 在庫照会
              </button>
              <button
                onClick={() => setPageMode('stocktaking')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${isStocktaking ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ClipboardList size={11} /> 棚卸入力
                {isStocktaking && totalChanged > 0 && (
                  <span className="bg-white text-amber-700 text-[8px] font-black px-1.5 rounded-full">{totalChanged}</span>
                )}
              </button>
            </div>
            <button
              onClick={() => setLogsOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${logsOpen ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-800 text-slate-500 hover:text-slate-300'}`}
            >
              <History size={12} /> ログ
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all disabled:opacity-40"
              title="再読み込み"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* ── 棚卸バナー ── */}
        {isStocktaking && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 text-amber-200/80 text-[11px] font-bold">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 text-[11px]">!</span>
            棚卸実行中：実在庫数を入力し、画面下部の「棚卸確定」で保存してください。未入力行は変更なしとして扱います。
          </div>
        )}

        {/* ── 在庫状態サマリ（アイテムのみ） ── */}
        {category !== '製品' && !loading && (
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: '欠品',     count: statusSummary['欠品'],     bg: 'border-rose-800/50  bg-rose-950/20  text-rose-400' },
              { label: '在庫低下', count: statusSummary['在庫低下'], bg: 'border-amber-800/50 bg-amber-950/20 text-amber-400' },
              { label: '適正',     count: statusSummary['適正'],     bg: 'border-slate-700    bg-slate-900/40 text-slate-400' },
            ] as const).map(({ label, count, bg }) => (
              <div key={label} className={`rounded-xl border px-4 py-3 flex items-center justify-between ${bg}`}>
                <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
                <span className="text-2xl font-black font-mono">{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 棚卸ログパネル ── */}
        {logsOpen && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History size={13} className="text-slate-400" />
                <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">棚卸ログ（直近50件）</span>
              </div>
              <button onClick={() => setLogsOpen(false)} className="text-slate-600 hover:text-white"><X size={14} /></button>
            </div>
            {logsLoading ? (
              <div className="py-10 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-500" /></div>
            ) : logs.length === 0 ? (
              <p className="py-8 text-center text-[11px] text-slate-600">棚卸ログがありません</p>
            ) : (
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      {['日時', '品目', '調整前', '調整後', '差分', '備考'].map(h => (
                        <th key={h} className="py-2 px-4 text-[9px] font-black text-slate-500 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-800/20">
                        <td className="py-2 px-4 text-[10px] font-mono text-slate-500">{new Date(l.adjusted_at ?? l.created_at).toLocaleString('ja-JP')}</td>
                        <td className="py-2 px-4">
                          <p className="text-[11px] font-bold text-white">{l.item_name ?? l.item_code}</p>
                          <p className="text-[9px] font-mono text-slate-600">{l.item_code}</p>
                        </td>
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-400">{l.before_stock}</td>
                        <td className="py-2 px-4 font-mono text-[11px] font-bold text-slate-300">{l.after_stock}</td>
                        <td className="py-2 px-4"><DiffBadge diff={l.diff} /></td>
                        <td className="py-2 px-4 text-[10px] text-slate-500">{l.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 検索・カテゴリ ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="品名・コードで検索"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
            {(['原材料', '資材', '製品'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-5 py-1.5 rounded-md text-[10px] font-black transition-all ${category === c ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── テーブル ── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-3 text-slate-600">
              <Loader2 size={28} className="animate-spin" />
              <p className="text-[11px] font-bold uppercase tracking-widest">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">

                {/* ─── 製品テーブル ─── */}
                {category === '製品' && (
                  <>
                    <thead>
                      <tr className="bg-slate-800/40 border-b border-slate-800">
                        {['Mfg Lot', '製品名', 'Stock C/S', 'Stock P', '賞味期限',
                          ...(isStocktaking ? ['実棚 C/S', '実棚 P'] : [])].map(h => (
                          <th key={h} className={`py-3 px-5 text-[9px] font-black uppercase tracking-widest ${isStocktaking && (h === '実棚 C/S' || h === '実棚 P') ? 'text-amber-500 bg-amber-500/5' : 'text-slate-500'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredProducts.map(s => {
                        const adj       = productAdjustments?.[s.mfg_lot];
                        const csChanged = adj?.cs !== '' && adj?.cs !== undefined && Number(adj.cs) !== Number(s.stock_cs);
                        const pChanged  = adj?.p  !== '' && adj?.p  !== undefined && Number(adj.p)  !== Number(s.stock_p);
                        return (
                          <tr key={s.id} className={`transition-colors ${csChanged || pChanged ? 'bg-amber-950/10' : 'hover:bg-slate-800/20'}`}>
                            <td className="py-3 px-5 font-mono text-[11px] text-blue-400 font-bold">{s.mfg_lot}</td>
                            <td className="py-3 px-5">
                              <p className="text-[12px] font-bold text-white">{s.product_name ?? s.product_code}</p>
                              <p className="text-[9px] font-mono text-slate-600">{s.product_code}</p>
                            </td>
                            <td className="py-3 px-5 font-black font-mono text-slate-200">{s.stock_cs}<span className="text-[9px] text-slate-500 ml-1">CS</span></td>
                            <td className="py-3 px-5 font-black font-mono text-slate-200">{s.stock_p}<span className="text-[9px] text-slate-500 ml-1">P</span></td>
                            <td className="py-3 px-5 font-mono text-[11px] text-slate-400">{s.expiry_date ?? <span className="text-slate-700">---</span>}</td>
                            {isStocktaking && (
                              <>
                                <td className="py-3 px-5 bg-amber-500/5">
                                  <div className="flex items-center gap-2">
                                    <input type="number" min={0} placeholder={String(s.stock_cs)}
                                      value={productAdjustments?.[s.mfg_lot]?.cs ?? ''}
                                      onChange={e => setProductAdjustments(prev => ({ ...(prev ?? {}), [s.mfg_lot]: { cs: e.target.value, p: (prev?.[s.mfg_lot]?.p ?? '') } }))}
                                      className={`w-24 bg-slate-950 border rounded px-2 py-1.5 text-[11px] font-mono text-right outline-none transition-colors ${csChanged ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-white focus:border-amber-500'}`}
                                    />
                                    {csChanged && <DiffBadge diff={Number(adj?.cs ?? 0) - Number(s.stock_cs)} />}
                                  </div>
                                </td>
                                <td className="py-3 px-5 bg-amber-500/5">
                                  <div className="flex items-center gap-2">
                                    <input type="number" min={0} placeholder={String(s.stock_p)}
                                      value={productAdjustments?.[s.mfg_lot]?.p ?? ''}
                                      onChange={e => setProductAdjustments(prev => ({ ...(prev ?? {}), [s.mfg_lot]: { cs: (prev?.[s.mfg_lot]?.cs ?? ''), p: e.target.value } }))}
                                      className={`w-24 bg-slate-950 border rounded px-2 py-1.5 text-[11px] font-mono text-right outline-none transition-colors ${pChanged ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-white focus:border-amber-500'}`}
                                    />
                                    {pChanged && <DiffBadge diff={Number(adj?.p ?? 0) - Number(s.stock_p)} />}
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}

                {/* ─── アイテムテーブル ─── */}
                {category !== '製品' && (
                  <>
                    <thead>
                      <tr className="bg-slate-800/40 border-b border-slate-800">
                        <th className="py-3 px-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">品目名 / コード</th>
                        <th className="py-3 px-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">現在庫</th>
                        <th className="py-3 px-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">
                          <span className="inline-flex items-center justify-end gap-1">
                            計画使用
                            <span title="完了以外の製造計画 × BOM使用量から算出" className="text-sky-700 cursor-default">
                              <Info size={9} />
                            </span>
                          </span>
                        </th>
                        <th className="py-3 px-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">引当可能</th>
                        <th className="py-3 px-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          <span className="inline-flex items-center gap-1">
                            ステータス
                            <span title="欠品: 在庫 < 計画使用 / 在庫低下: 在庫 < 計画使用 + 最低在庫" className="text-slate-700 cursor-default">
                              <Info size={9} />
                            </span>
                          </span>
                        </th>
                        {isStocktaking && (
                          <th className="py-3 px-5 text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/5">実在庫数</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredItems.map(s => {
                        const adjVal  = adjustments[s.item_code] ?? '';
                        const changed = adjVal !== '' && Number(adjVal) !== Number(s.actual_stock);
                        const diff    = changed ? Number(adjVal) - Number(s.actual_stock) : 0;

                        // 棚卸入力中は入力値でステータスをプレビュー
                        const previewActual = changed ? Number(adjVal) : Number(s.actual_stock);
                        const previewAvail  = previewActual - s.calc_planned_usage;
                        const previewStatus = calcStatus(previewActual, s.calc_planned_usage, Number(s.min_stock_level));
                        const statusChanged = isStocktaking && changed && previewStatus !== s.calc_status;

                        const displayStatus = isStocktaking && changed ? previewStatus : s.calc_status;
                        const displayAvail  = isStocktaking && changed ? previewAvail  : s.calc_available;

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors ${changed ? 'bg-amber-950/10' :
                              s.calc_status === '欠品'     ? 'bg-rose-950/5 hover:bg-rose-950/10' :
                              s.calc_status === '在庫低下' ? 'bg-amber-950/5 hover:bg-amber-950/10' :
                              'hover:bg-slate-800/20'}`}
                          >
                            {/* 品目名 */}
                            <td className="py-3 px-5">
                              <p className="text-[12px] font-bold text-white">{s.item_name ?? s.item_code}</p>
                              <p className="text-[9px] font-mono text-slate-600 mt-0.5">{s.item_code}</p>
                            </td>

                            {/* 現在庫（棚卸入力中はプレビュー） */}
                            <td className="py-3 px-5 text-right">
                              <span className={`font-black font-mono text-[13px] ${changed ? 'text-amber-300' : 'text-slate-200'}`}>
                                {changed ? Number(adjVal) : Number(s.actual_stock)}
                              </span>
                              {changed && (
                                <div className="text-[9px] text-slate-600 line-through font-mono">{Number(s.actual_stock)}</div>
                              )}
                            </td>

                            {/* 計画使用（製造計画 × BOM 由来） */}
                            <td className="py-3 px-5 text-right">
                              <span className={`font-mono text-[13px] font-bold ${s.calc_planned_usage > 0 ? 'text-sky-400' : 'text-slate-700'}`}>
                                {s.calc_planned_usage > 0 ? s.calc_planned_usage.toFixed(3) : '—'}
                              </span>
                              {s.calc_planned_usage > 0 && (
                                <div className="mt-0.5 flex justify-end">
                                  <PlanDetailTooltip detail={s.plan_detail} />
                                </div>
                              )}
                            </td>

                            {/* 引当可能 */}
                            <td className="py-3 px-5 text-right">
                              <span className={`font-black font-mono text-[13px] ${displayAvail < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {displayAvail.toFixed(3)}
                              </span>
                            </td>

                            {/* ステータス */}
                            <td className="py-3 px-5">
                              <StockBadge status={displayStatus} />
                              {statusChanged && (
                                <div className="mt-1 opacity-50">
                                  <StockBadge status={s.calc_status} />
                                </div>
                              )}
                            </td>

                            {/* 棚卸入力列 */}
                            {isStocktaking && (
                              <td className="py-3 px-5 bg-amber-500/5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number" min={0}
                                    placeholder={String(s.actual_stock)}
                                    value={adjVal}
                                    onChange={e => setAdjustments(prev => ({ ...prev, [s.item_code]: e.target.value }))}
                                    className={`w-28 bg-slate-950 border rounded px-3 py-1.5 text-[12px] font-mono text-right outline-none transition-colors ${changed ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-white focus:border-amber-500'}`}
                                  />
                                  {changed && <DiffBadge diff={diff} />}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          )}

          {/* 空ステート */}
          {!loading && ((category !== '製品' && filteredItems.length === 0) || (category === '製品' && filteredProducts.length === 0)) && (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-700">
              <Package size={36} className="opacity-20" />
              <p className="text-[11px] font-bold uppercase tracking-widest">該当する在庫データが見つかりません</p>
            </div>
          )}

          {/* 棚卸フッター */}
          {isStocktaking && totalChanged > 0 && (
            <div className="px-5 py-4 bg-slate-800/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400 font-bold">
                <span className="text-amber-400 font-black">{totalChanged}</span> 品目に変更があります
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setAdjustments({}); setProductAdjustments(undefined); }}
                  className="px-4 py-2 text-[11px] font-black text-slate-500 hover:text-white transition-colors"
                >
                  リセット
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={saving}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-[11px] font-black transition-colors shadow-lg shadow-amber-900/30"
                >
                  {saving
                    ? <><Loader2 size={12} className="animate-spin" />保存中...</>
                    : <><CheckCircle2 size={12} />棚卸確定</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 確認ダイアログ ── */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-[14px] font-black text-white mb-2">棚卸を確定しますか？</h3>
            <p className="text-[11px] text-slate-400 mb-5">
              <span className="text-amber-400 font-black">{totalChanged} 品目</span> の在庫数が更新され、棚卸ログに記録されます。この操作は元に戻せません。
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmOpen(false)} className="px-5 py-2 rounded-lg text-[11px] font-black text-slate-400 hover:text-white transition-colors">
                キャンセル
              </button>
              <button onClick={handleSaveStocktaking} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-black transition-colors">
                確定保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ─── ページエントリ ───────────────────────────────────────────────
export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 size={24} className="animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-widest">Loading Inventory System...</p>
        </div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}