'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '../../../lib/supabase/client';
import type { TReceiving, MItem } from '../../../types/database';
import {
  Printer, RefreshCw, Plus, X, CheckCircle2, AlertTriangle,
  Truck, CalendarDays, List, Package, ChevronLeft, ChevronRight,
  Info,
} from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────────────
type ViewMode = 'list' | 'calendar';

interface ReceivingRow extends TReceiving {
  item_name?: string;
}

// ─── Toast ────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning';
interface ToastMsg { id: number; type: ToastType; text: string; }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [seq, setSeq] = useState(0);
  const add = useCallback((type: ToastType, text: string) => {
    setSeq(prev => {
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
  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-950 border-emerald-700/60 text-emerald-300',
    error: 'bg-rose-950   border-rose-700/60   text-rose-300',
    warning: 'bg-amber-950  border-amber-700/60  text-amber-300',
  };
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={13} />,
    error: <AlertTriangle size={13} />,
    warning: <AlertTriangle size={13} />,
  };
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-[11px] font-bold shadow-2xl pointer-events-auto ${styles[t.type]}`}
          style={{ animation: 'slideIn 0.2s ease-out' }}>
          {icons[t.type]}
          <span>{t.text}</span>
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X size={11} /></button>
        </div>
      ))}
    </div>
  );
}

// ─── ステータスバッジ ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '入荷済' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
      status === '一部入荷' ? 'bg-sky-500/10     border-sky-500/30     text-sky-400' :
        'bg-amber-500/10   border-amber-500/30   text-amber-400';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cls}`}>
      {status}
    </span>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────
export default function ReceivingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [items, setItems] = useState<MItem[]>([]);
  const [list, setList] = useState<ReceivingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  // フォーム
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [remarks, setRemarks] = useState('');

  // インライン受入入力: row.id -> 入力文字列
  const [recvInputs, setRecvInputs] = useState<Record<string, string>>({});

  // カレンダー月
  const today = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-indexed

  const { toasts, add: addToast, remove: removeToast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // ─── データ取得 ──────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [itemsRes, listRes] = await Promise.all([
        supabase.from('m_items').select('*').order('item_name'),
        supabase.from('t_receiving')
          .select('*')
          .order('scheduled_date', { ascending: false })
          .limit(200),
      ]);
      if (itemsRes.error) throw itemsRes.error;
      if (listRes.error) throw listRes.error;

      const itemMap = new Map((itemsRes.data ?? []).map((i: MItem) => [i.item_code, i.item_name]));
      setItems(itemsRes.data ?? []);
      setList((listRes.data ?? []).map((r: TReceiving) => ({
        ...r,
        item_name: itemMap.get(r.item_code) ?? r.item_code,
      })));
    } catch (err) {
      console.error(err);
      addToast('error', 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [supabase, addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── 入荷予定登録 ────────────────────────────────────────────
  const handleRegister = async () => {
    if (!selectedItemCode || !scheduledDate || !orderQuantity || Number(orderQuantity) <= 0) {
      addToast('warning', '必須項目を正しく入力してください');
      return;
    }
    if (!supabase) return;
    setSubmitting(true);
    try {
      const datePart = scheduledDate.replace(/-/g, '');
      const { data: existing, error: seqErr } = await supabase
        .from('t_receiving')
        .select('receiving_code')
        .like('receiving_code', `INC-${datePart}%`)
        .order('receiving_code', { ascending: false })
        .limit(1);
      if (seqErr) throw seqErr;

      const seq = existing?.length
        ? parseInt(existing[0].receiving_code.slice(-3), 10) + 1 : 1;
      const receivingCode = `INC-${datePart}-${String(seq).padStart(3, '0')}`;

      const { error } = await supabase.from('t_receiving').insert({
        receiving_code: receivingCode,
        item_code: selectedItemCode,
        scheduled_date: scheduledDate,
        order_quantity: Number(orderQuantity),
        status: '未入荷',
        remarks: remarks.trim(),
      });
      if (error) throw error;

      addToast('success', `登録完了: ${receivingCode}`);
      setSelectedItemCode('');
      setScheduledDate('');
      setOrderQuantity('');
      setRemarks('');
      setFormOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      addToast('error', '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 受入処理 ────────────────────────────────────────────────
  const handleReceive = async (row: ReceivingRow) => {
    const inputStr = recvInputs[row.id];
    const actualQty = Number(inputStr);
    if (!inputStr || isNaN(actualQty) || actualQty <= 0) {
      addToast('warning', '実入荷数を正しく入力してください');
      return;
    }
    if (!supabase) return;
    try {
      const newStatus: TReceiving['status'] =
        actualQty >= Number(row.order_quantity) ? '入荷済' : '一部入荷';

      const { error: recvErr } = await supabase.from('t_receiving').update({
        actual_quantity: actualQty,
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', row.id);
      if (recvErr) throw recvErr;

      // 在庫更新
      const { data: stock, error: stockErr } = await supabase
        .from('t_item_stock')
        .select('actual_stock')
        .eq('item_code', row.item_code)
        .single();
      if (stockErr && stockErr.code !== 'PGRST116') throw stockErr;

      const newStock = (Number(stock?.actual_stock) || 0) + actualQty;
      const { error: updErr } = await supabase
        .from('t_item_stock')
        .update({ actual_stock: newStock, updated_at: new Date().toISOString() })
        .eq('item_code', row.item_code);
      if (updErr) throw updErr;

      // 在庫ログ
      await supabase.from('t_stock_log').insert({
        tx_type: '入荷',
        target_type: '品目',
        item_code: row.item_code,
        quantity: actualQty,
        related_code: row.receiving_code,
        remarks: `入荷受入: ${row.receiving_code}`,
      });

      addToast('success', `${row.receiving_code} の受入完了（${actualQty}）`);
      setRecvInputs(prev => { const n = { ...prev }; delete n[row.id]; return n; });
      loadData();
    } catch (err) {
      console.error(err);
      addToast('error', '受入処理に失敗しました');
    }
  };

  // ─── カレンダー計算 ──────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const lastDate = new Date(calYear, calMonth + 1, 0).getDate();
    const prefix = Array<null>(firstDow).fill(null);
    const days = Array.from({ length: lastDate }, (_, i) => {
      const d = i + 1;
      return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
    return [...prefix, ...days];
  }, [calYear, calMonth]);

  // 日付ごとの入荷予定マップ
  const calendarMap = useMemo<Record<string, ReceivingRow[]>>(() => {
    const map: Record<string, ReceivingRow[]> = {};
    for (const row of list) {
      if (!row.scheduled_date) continue;
      if (!map[row.scheduled_date]) map[row.scheduled_date] = [];
      map[row.scheduled_date].push(row);
    }
    return map;
  }, [list]);

  const todayStr = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ─── サマリ ──────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: list.length,
    pending: list.filter(r => r.status === '未入荷').length,
    partial: list.filter(r => r.status === '一部入荷').length,
    done: list.filter(r => r.status === '入荷済').length,
  }), [list]);

  // ─── レンダリング ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── ヘッダー ── */}
      <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center shrink-0">
              <Truck size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-[13px] font-black text-white tracking-wide leading-none">入荷管理</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">Inbound Logistics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ビュー切替 */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <List size={11} /> リスト
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${viewMode === 'calendar' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <CalendarDays size={11} /> カレンダー
              </button>
            </div>

            <button
              onClick={() => setFormOpen(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${formOpen ? 'bg-slate-700 text-white border border-slate-600' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {formOpen ? <X size={11} /> : <Plus size={11} />}
              {formOpen ? '閉じる' : '入荷予定登録'}
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all disabled:opacity-40"
              title="再読み込み"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => window.print()}
              className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all"
              title="印刷"
            >
              <Printer size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">

        {/* ── サマリカード ── */}
        <div className="grid grid-cols-4 gap-3 print:hidden">
          {([
            { label: '全件', count: summary.total, cls: 'border-slate-700    text-slate-300' },
            { label: '未入荷', count: summary.pending, cls: 'border-amber-800/50  text-amber-400' },
            { label: '一部入荷', count: summary.partial, cls: 'border-sky-800/50    text-sky-400' },
            { label: '入荷済', count: summary.done, cls: 'border-emerald-800/50 text-emerald-400' },
          ] as const).map(({ label, count, cls }) => (
            <div key={label} className={`rounded-xl border px-4 py-3 bg-slate-900/40 flex items-center justify-between ${cls}`}>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</span>
              <span className="text-2xl font-black font-mono">{count}</span>
            </div>
          ))}
        </div>

        {/* ── 登録フォーム（スライドイン） ── */}
        {formOpen && (
          <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-5 shadow-2xl print:hidden">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              入荷予定の新規登録
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* 品目 */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">対象品目 *</label>
                <select
                  value={selectedItemCode}
                  onChange={e => setSelectedItemCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-emerald-600 transition-colors cursor-pointer"
                >
                  <option value="">選択してください</option>
                  {items.map(i => (
                    <option key={i.id} value={i.item_code}>
                      {i.item_name}（{i.item_code}）
                    </option>
                  ))}
                </select>
              </div>
              {/* 予定日 */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">入荷予定日 *</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
              {/* 数量 */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">予定数量 *</label>
                <input
                  type="number" min={1}
                  placeholder="0"
                  value={orderQuantity}
                  onChange={e => setOrderQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[12px] font-mono text-right text-white focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
              {/* 備考 */}
              <div className="space-y-1 md:col-span-3">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">備考</label>
                <input
                  type="text"
                  placeholder="特記事項・仕入先など"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
              {/* 登録ボタン */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2 rounded-lg text-[11px] font-black transition-colors"
                >
                  {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                  {submitting ? '登録中...' : '登録'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            リストビュー
        ════════════════════════════════════════ */}
        {viewMode === 'list' && (
          <div id="print-list" className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            {/* 印刷用ヘッダー */}
            <div className="hidden print:flex justify-between items-end px-6 py-4 border-b-2 border-black">
              <div>
                <h1 className="text-2xl font-black">入荷管理台帳</h1>
                <p className="text-[10px] mt-1">Inbound Receiving Log</p>
              </div>
              <p className="text-[11px] font-mono">{new Date().toLocaleDateString('ja-JP')} 出力</p>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center gap-3 text-slate-600">
                <RefreshCw size={24} className="animate-spin" />
                <p className="text-[11px] font-bold uppercase tracking-widest">Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/40 border-b border-slate-800 print:bg-gray-100 print:border-black">
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-black">入荷コード</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-black">品目</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-black">予定日</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right print:text-black">予定数</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right print:text-black">実入荷数</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-black">ステータス</th>
                      <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest print:text-black">備考</th>
                      <th className="py-3 px-4 print:hidden" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 print:divide-gray-300">
                    {list.map(r => {
                      const isPending = r.status !== '入荷済';
                      const inputVal = recvInputs[r.id] ?? '';
                      return (
                        <tr
                          key={r.id}
                          className={`transition-colors print:text-black
                            ${r.status === '入荷済' ? 'opacity-60 hover:opacity-80' :
                              r.status === '一部入荷' ? 'bg-sky-950/10 hover:bg-sky-950/20' :
                                'hover:bg-slate-800/20'}`}
                        >
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-mono font-bold text-emerald-400 print:text-black">{r.receiving_code}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-[12px] font-bold text-white print:text-black">{r.item_name}</p>
                            <p className="text-[9px] font-mono text-slate-600 print:text-gray-500">{r.item_code}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-[11px] font-mono ${r.scheduled_date < todayStr && isPending ? 'text-rose-400 font-black' : 'text-slate-400'} print:text-black`}>
                              {r.scheduled_date}
                              {r.scheduled_date < todayStr && isPending && (
                                <span className="ml-1 text-[8px] print:hidden">遅延</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-slate-200 print:text-black">
                            {Number(r.order_quantity).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 print:text-black">
                            {r.actual_quantity != null ? Number(r.actual_quantity).toLocaleString() : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500 print:text-black max-w-[120px] truncate">
                            {r.remarks || '—'}
                          </td>
                          {/* 受入操作（印刷時非表示） */}
                          <td className="py-3 px-4 print:hidden">
                            {isPending && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min={1}
                                  placeholder={String(r.order_quantity)}
                                  value={inputVal}
                                  onChange={e => setRecvInputs(prev => ({ ...prev, [r.id]: e.target.value }))}
                                  className={`w-24 bg-slate-950 border rounded px-2 py-1.5 text-[11px] font-mono text-right outline-none transition-colors ${inputVal ? 'border-emerald-600 text-emerald-300' : 'border-slate-700 text-white focus:border-emerald-600'}`}
                                />
                                <button
                                  onClick={() => handleReceive(r)}
                                  disabled={!inputVal}
                                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-[10px] font-black transition-colors whitespace-nowrap"
                                >
                                  <CheckCircle2 size={11} /> 受入
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && list.length === 0 && (
              <div className="py-20 flex flex-col items-center gap-3 text-slate-700">
                <Package size={36} className="opacity-20" />
                <p className="text-[11px] font-bold uppercase tracking-widest">入荷データがありません</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            カレンダービュー
        ════════════════════════════════════════ */}
        {viewMode === 'calendar' && (
          <div id="print-calendar" className="space-y-3">
            {/* カレンダーヘッダー */}
            <div className="flex items-center justify-between print:hidden">
              <button onClick={prevMonth} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all">
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-lg font-black text-white">
                {calYear}年 {calMonth + 1}月
              </h2>
              <button onClick={nextMonth} className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 印刷ヘッダー */}
            <div className="hidden print:flex justify-between items-end mb-4 border-b-2 border-black pb-3">
              <div>
                <h1 className="text-2xl font-black">{calYear}年 {calMonth + 1}月 入荷予定カレンダー</h1>
                <p className="text-[10px] mt-1">Inbound Schedule Calendar</p>
              </div>
              <p className="text-[11px] font-mono">{new Date().toLocaleDateString('ja-JP')} 出力</p>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 gap-0.5 print:gap-0">
              {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                <div key={d} className={`text-center py-2 text-[10px] font-black tracking-widest
                  ${i === 0 ? 'text-rose-400 bg-rose-900/20 print:text-red-700 print:bg-red-50' :
                    i === 6 ? 'text-blue-400 bg-blue-900/20 print:text-blue-700 print:bg-blue-50' :
                      'text-slate-500 bg-slate-900/60 print:text-black print:bg-gray-100'}
                `}>{d}</div>
              ))}
            </div>

            {/* カレンダーグリッド */}
            <div className="grid grid-cols-7 gap-0.5 print:gap-0">
              {calendarDays.map((date, idx) => {
                if (!date) return (
                  <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-950/30 print:bg-gray-50 print:border print:border-gray-200" />
                );

                const dow = new Date(date).getDay();
                const entries = calendarMap[date] ?? [];
                const isToday = date === todayStr;
                const isPast = date < todayStr;
                const hasPending = entries.some(r => r.status !== '入荷済');

                return (
                  <div
                    key={date}
                    className={`min-h-[110px] p-1.5 border transition-colors
                      print:min-h-[100px] print:border-black print:border
                      ${dow === 0 ? 'bg-rose-950/10 border-rose-900/40 print:bg-red-50' :
                        dow === 6 ? 'bg-blue-950/10 border-blue-900/40 print:bg-blue-50' :
                          isPast ? 'bg-slate-950/60 border-slate-800/40 print:bg-gray-50' :
                            'bg-slate-900/30 border-slate-800/60 print:bg-white'}
                      ${isToday ? 'ring-1 ring-inset ring-emerald-500/50' : ''}
                    `}
                  >
                    {/* 日付 */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[13px] font-black font-mono leading-none
                        ${isToday ? 'text-emerald-400 print:text-emerald-700' :
                          dow === 0 ? 'text-rose-500 print:text-red-600' :
                            dow === 6 ? 'text-blue-500 print:text-blue-600' :
                              isPast ? 'text-slate-600 print:text-gray-400' :
                                'text-slate-300 print:text-black'}
                      `}>
                        {date.split('-')[2]}
                      </span>
                      <div className="flex items-center gap-1">
                        {isToday && <span className="text-[7px] font-black text-emerald-500 print:hidden">TODAY</span>}
                        {entries.length > 0 && hasPending && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 print:hidden" />
                        )}
                      </div>
                    </div>

                    {/* 入荷カード */}
                    <div className="space-y-1">
                      {entries.map((r, ei) => (
                        <div
                          key={ei}
                          className={`border rounded-sm px-1.5 py-1 print:border-black print:bg-white print:rounded-none
                            ${r.status === '入荷済'
                              ? 'border-emerald-800/50 bg-emerald-950/20 print:border-emerald-500'
                              : r.status === '一部入荷'
                                ? 'border-sky-800/50     bg-sky-950/20     print:border-sky-500'
                                : r.scheduled_date < todayStr
                                  ? 'border-rose-700/60   bg-rose-950/20   print:border-red-500'
                                  : 'border-amber-700/50  bg-amber-950/15  print:border-amber-500'
                            }`}
                        >
                          <p className="text-[9px] font-black leading-tight text-white truncate print:text-black">
                            {r.item_name ?? r.item_code}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[9px] font-mono font-bold text-slate-400 print:text-black">
                              {Number(r.order_quantity).toLocaleString()}
                              {r.actual_quantity != null && (
                                <span className="text-emerald-400 print:text-emerald-700"> / {Number(r.actual_quantity).toLocaleString()}</span>
                              )}
                            </span>
                            <span className={`text-[7px] font-black print:hidden
                              ${r.status === '入荷済' ? 'text-emerald-400' :
                                r.status === '一部入荷' ? 'text-sky-400' :
                                  r.scheduled_date < todayStr ? 'text-rose-400' : 'text-amber-400'}
                            `}>
                              {r.status === '未入荷' && r.scheduled_date < todayStr ? '遅延' : r.status}
                            </span>
                          </div>
                          {r.remarks && (
                            <p className="text-[8px] text-slate-600 leading-tight truncate mt-0.5 print:text-gray-500">{r.remarks}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* カレンダー凡例（印刷時） */}
            <div className="hidden print:flex gap-6 text-[9px] font-bold pt-3 border-t border-black">
              <span className="flex items-center gap-1"><span className="w-3 h-3 border border-emerald-500 inline-block" /> 入荷済</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 border border-amber-500 inline-block" /> 未入荷</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 border border-sky-500 inline-block" /> 一部入荷</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 border border-red-500 inline-block" /> 遅延</span>
              <span className="ml-4 text-gray-500">数量表示: 予定 / 実入荷</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 印刷スタイル ─── */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body * { visibility: hidden !important; }

          #print-list,   #print-list *,
          #print-calendar, #print-calendar * {
            visibility: visible !important;
          }

          #print-list,
          #print-calendar {
            position: absolute !important;
            inset: 0;
            width: 100%;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }

          * { box-shadow: none !important; }

          .text-white       { color: #111 !important; }
          .text-slate-200   { color: #333 !important; }
          .text-slate-400   { color: #555 !important; }
          .text-emerald-400 { color: #065f46 !important; }
          .text-rose-400    { color: #991b1b !important; }
          .text-amber-400   { color: #92400e !important; }
          .text-sky-400     { color: #1e40af !important; }
        }
      `}</style>
    </div>
  );
}