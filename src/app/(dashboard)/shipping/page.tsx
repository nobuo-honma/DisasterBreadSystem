'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import type { TOrder, TProductStock } from '../../../types/database';

export default function ShippingPage() {
  const [pendingOrders, setPendingOrders] = useState<TOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [lots, setLots] = useState<TProductStock[]>([]);
  const [shippingDate, setShippingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lotQuantities, setLotQuantities] = useState<Record<string, { cs: number; p: number }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      // ステータスが「受注済」または製造完了などの未出荷状態を取得
      const { data } = await supabase
        .from('t_orders')
        .select('*')
        .eq('status', '受注済')
        .order('request_delivery_date');
      setPendingOrders(data ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedOrder) {
      setLots([]);
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from('t_product_stock')
        .select('*')
        .eq('product_code', selectedOrder.product_code)
        .order('expiry_date', { ascending: true }) // FIFO: 賞味期限が近い順
        .limit(10);
      setLots(data ?? []);
      setLotQuantities({});
    })();
  }, [selectedOrder]);

  const totalCs = Object.values(lotQuantities).reduce((a, v) => a + (v?.cs ?? 0), 0);
  const totalP = Object.values(lotQuantities).reduce((a, v) => a + (v?.p ?? 0), 0);
  const requiredCs = selectedOrder?.quantity_cs ?? 0;
  const isQuantityMet = totalCs === requiredCs;

  const handleConfirmShipping = async () => {
    if (!selectedOrder) return;
    const supabase = createClient();
    if (!supabase) return;

    if (totalCs !== requiredCs) {
      setMessage({ type: 'err', text: '出荷ケース数が受注数と一致しません。' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const shipCode = `SHP-${Date.now()}`;

      // 出荷ヘッダー登録
      await supabase.from('t_shipping').insert({
        shipping_code: shipCode,
        order_code: selectedOrder.order_code,
        product_code: selectedOrder.product_code,
        scheduled_date: shippingDate,
        shipping_cs: totalCs,
        shipping_p: totalP,
        status: '出荷済',
      });

      // 詳細登録と在庫減算
      for (const lot of lots) {
        const q = lotQuantities[lot.mfg_lot];
        if (!q || (q.cs === 0 && q.p === 0)) continue;

        await supabase.from('t_shipping_details').insert({
          shipping_code: shipCode,
          mfg_lot: lot.mfg_lot,
          quantity_cs: q.cs,
          quantity_p: q.p,
        });

        await supabase.from('t_product_stock').update({
          stock_cs: lot.stock_cs - q.cs,
          stock_p: lot.stock_p - q.p
        }).eq('id', lot.id);
      }

      await supabase.from('t_orders').update({ status: '出荷済' }).eq('id', selectedOrder.id);

      setMessage({ type: 'ok', text: `出荷完了: ${selectedOrder.order_code}` });
      setSelectedOrder(null);
      setLotQuantities({});

      const { data } = await supabase.from('t_orders').select('*').eq('status', '受注済').order('request_delivery_date');
      setPendingOrders(data ?? []);
    } catch (e) {
      setMessage({ type: 'err', text: '出荷確定エラー' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-slate-500 font-black tracking-widest text-xs">INITIALIZING DISPATCH SYSTEM...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 text-slate-200">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            出荷管理
            <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-1 rounded font-mono uppercase tracking-widest">Outbound Logistics</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">Order Allocation & Inventory Dispatch Control</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 左: 出荷待ちリスト (Col 4) */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pending Orders</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin p-2 space-y-2">
              {pendingOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`group cursor-pointer rounded-xl border p-4 transition-all ${selectedOrder?.id === o.id
                    ? 'bg-orange-600/20 border-orange-500/50 shadow-lg shadow-orange-900/20'
                    : 'bg-slate-950/40 border-slate-800 hover:border-slate-600'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold text-orange-500 tracking-tighter">{o.order_code}</span>
                    <span className="text-[10px] font-bold text-slate-500">{o.request_delivery_date}</span>
                  </div>
                  <div className="mt-2 text-sm font-black text-slate-100 group-hover:text-white transition-colors">{o.product_name_at_order}</div>
                  <div className="mt-1 flex justify-between items-end">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{o.destination_code}</div>
                    <div className="text-sm font-black text-slate-200">{o.quantity_cs} <span className="text-[10px] text-slate-500">CS</span></div>
                  </div>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <div className="py-20 text-center text-slate-600 italic text-xs font-bold">NO PENDING ORDERS</div>
              )}
            </div>
          </div>
        </section>

        {/* 右: 出荷実行 (Col 8) */}
        <section className="lg:col-span-8">
          {selectedOrder ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-slate-800/50 px-8 py-6 border-b border-slate-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Shipping Execution</h2>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-slate-500 uppercase">Required Quantity</span>
                    <span className="text-2xl font-black text-white">{selectedOrder.quantity_cs} <span className="text-xs text-slate-500 uppercase">Cases</span></span>
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* 1. 基本設定 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">出荷日 (発送日)</label>
                    <input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-orange-600 outline-none transition-all" />
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">現在の選択合計</label>
                    <div className={`text-2xl font-black transition-colors ${isQuantityMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalCs} / {selectedOrder.quantity_cs}
                    </div>
                  </div>
                </div>

                {/* 2. ロット選択テーブル */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
                    Inventory Allocation (FIFO Order)
                  </h3>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800">
                          <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Mfg Lot</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Stock</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Ship Qty (CS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {lots.map((lot) => (
                          <tr key={lot.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-4 px-4 font-mono text-xs font-bold text-orange-400">{lot.mfg_lot}</td>
                            <td className="py-4 px-4 text-[10px] font-bold text-slate-400">{lot.expiry_date || 'N/A'}</td>
                            <td className="py-4 px-4 text-right">
                              <span className="text-xs font-black text-slate-200">{lot.stock_cs}</span>
                              <span className="ml-1 text-[9px] text-slate-500 font-bold uppercase">In Stock</span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={lot.stock_cs}
                                  placeholder="0"
                                  value={lotQuantities[lot.mfg_lot]?.cs ?? ''}
                                  onChange={(e) => setLotQuantities((prev) => ({
                                    ...prev,
                                    [lot.mfg_lot]: { ...prev[lot.mfg_lot], cs: Math.min(Number(e.target.value) || 0, lot.stock_cs) },
                                  }))}
                                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-center font-black text-white focus:border-orange-500 outline-none"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {message && (
                  <div className={`p-4 rounded-xl border text-xs font-bold ${message.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmShipping}
                  disabled={submitting || !isQuantityMet}
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-xl font-black text-xs tracking-[0.2em] uppercase shadow-xl shadow-orange-900/20 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale cursor-pointer"
                >
                  {submitting ? 'Processing Dispatch...' : 'Confirm & Execute Shipping'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                <span className="text-2xl opacity-20">📦</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest italic">Select an order from the list to begin</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}