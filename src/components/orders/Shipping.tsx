/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { Truck, Search, Calendar, Package, CheckCircle2, AlertCircle, ArrowRight, Loader2, Info } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { inventoryService } from '../../services/inventoryService';
import { TOrder, TProductStock } from '../../types';

export default function Shipping() {
  const [pendingOrders, setPendingOrders] = useState<TOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TOrder | null>(null);
  const [productStocks, setProductStocks] = useState<TProductStock[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [shippingDate, setShippingDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [issubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const data = await orderService.getPendingOrders();
      setPendingOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order: TOrder) => {
    setSelectedOrder(order);
    try {
      const stocks = await inventoryService.getProductStocks();
      
      // 【修正ポイント】型エラー(2769)対策: localeCompare の引数に ?? '' を追加
      // また、元の配列を壊さないようスプレッド構文でコピーを作成
      const relevantStocks = [...stocks]
        .filter(s => s.product_code === order.product_code)
        .sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''));
      
      setProductStocks(relevantStocks);

      // 初期割当の計算（推奨案として提示）
      let remaining = order.quantity_cs;
      const initialAllocations: Record<string, number> = {};

      for (const stock of relevantStocks) {
        if (remaining <= 0) break;
        const allocate = Math.min(remaining, stock.stock_cs);
        if (allocate > 0) {
          initialAllocations[stock.id] = allocate;
          remaining -= allocate;
        }
      }
      setAllocations(initialAllocations);
    } catch (error) {
      console.error('Failed to fetch stocks:', error);
    }
  };

  // 合計割当数の計算
  const totalAllocated = useMemo(() => 
    Object.values(allocations).reduce((sum, val) => sum + val, 0)
  , [allocations]);

  const handleAllocationChange = (id: string, value: number, max: number) => {
    // 在庫数を超えないように制御
    const safeValue = Math.max(0, Math.min(value, max));
    setAllocations(prev => ({ ...prev, [id]: safeValue }));
  };

  const handleConfirmShipping = async () => {
    if (!selectedOrder || issubmitting) return;

    if (totalAllocated === 0) {
      alert('出荷数量が0です。割当を行ってください。');
      return;
    }

    if (totalAllocated < selectedOrder.quantity_cs) {
      if (!confirm(`受注数(${selectedOrder.quantity_cs}CS)に対し、割当数(${totalAllocated}CS)が不足しています。このまま確定しますか？`)) return;
    }

    setIsSubmitting(true);
    try {
      const lotQuantities = productStocks
        .filter(s => (allocations[s.id] ?? 0) > 0)
        .map(s => ({
          mfg_lot: s.mfg_lot,
          quantity_cs: allocations[s.id] ?? 0,
          quantity_p: 0,
        }));

      await inventoryService.confirmShipping(selectedOrder, lotQuantities, shippingDate);
      alert('出荷確定処理が完了しました。');
      setSelectedOrder(null);
      fetchPendingOrders();
    } catch (error) {
      alert('エラーが発生しました。在庫状況を再確認してください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-amber-500 animate-spin" size={32} />
      <div className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Logistics Stream Synchronizing...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="text-amber-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations / Outbound Logistics</span>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            出荷管理 <span className="text-slate-600 text-xl font-light not-italic ml-2">/ Shipping Terminal</span>
          </h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT: PENDING ORDERS */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-4xl p-6 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Search size={14} /> Pending Orders
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                {pendingOrders.length} QUEUED
              </span>
            </div>

            <div className="space-y-3 max-h-[650px] overflow-y-auto custom-scrollbar pr-2">
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`w-full text-left p-5 rounded-4xl border transition-all duration-300 group ${
                    selectedOrder?.id === order.id
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                      : 'bg-slate-950/30 border-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded leading-none">{order.order_code}</span>
                    <span className="text-[10px] font-bold text-slate-500 italic">{order.request_delivery_date}</span>
                  </div>
                  <div className="text-sm font-black text-slate-200 mb-2 leading-snug">{order.product_name_at_order}</div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{order.destination_code}</span>
                    <span className="text-md font-black text-white">{order.quantity_cs} <span className="text-[10px] text-slate-500">CS</span></span>
                  </div>
                </button>
              ))}
              {pendingOrders.length === 0 && (
                <div className="py-20 text-center opacity-20">
                  <CheckCircle2 size={40} className="mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">All Shipments Completed</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT: ALLOCATION & CONFIRMATION */}
        <main className="lg:col-span-7">
          {selectedOrder ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="bg-slate-900/40 border border-slate-800 rounded-4xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Truck size={120} />
                </div>

                <div className="flex justify-between items-start mb-10 relative z-10">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white tracking-tighter">{selectedOrder.product_name_at_order}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{selectedOrder.destination_code}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-700" />
                       <span className="text-[10px] font-mono text-slate-500">{selectedOrder.order_code}</span>
                    </div>
                  </div>
                  <div className="text-right bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Quantity</p>
                    <p className="text-3xl font-black text-white leading-none">{selectedOrder.quantity_cs} <span className="text-sm text-slate-600 font-light italic">CS</span></p>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <Package size={14} className="text-amber-500" /> Inventory Lot Allocation
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                      <Info size={12} /> 手動調整が可能です
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-inner">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900/50 border-b border-slate-800">
                          <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase">Mfg Lot No.</th>
                          <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase">Expiry</th>
                          <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase text-right">Available</th>
                          <th className="py-4 px-6 text-[9px] font-black text-amber-500 uppercase text-right w-40">Allocation (CS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {productStocks.map((stock) => (
                          <tr key={stock.id} className="group hover:bg-white/5 transition-colors">
                            <td className="py-4 px-6">
                              <span className="text-xs font-mono font-bold text-slate-300">{stock.mfg_lot}</span>
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500 font-mono">{stock.expiry_date}</td>
                            <td className="py-4 px-6 text-right font-bold text-slate-400 text-xs">{stock.stock_cs} <span className="text-[9px] opacity-50">CS</span></td>
                            <td className="py-4 px-6">
                              <input
                                type="number"
                                value={allocations[stock.id] || 0}
                                onChange={(e) => handleAllocationChange(stock.id, Number(e.target.value), stock.stock_cs)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-right font-mono text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-inner"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-800/50 flex flex-col md:flex-row gap-8 items-end relative z-10">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={14} /> Official Shipping Date
                    </label>
                    <input
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:border-amber-500 transition-all font-mono shadow-inner"
                    />
                  </div>

                  <button
                    onClick={handleConfirmShipping}
                    disabled={issubmitting}
                    className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-12 py-5 rounded-4xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-amber-900/40 transition-all flex items-center justify-center gap-4 group active:scale-95"
                  >
                    {issubmitting ? 'Processing...' : 'Confirm Shipment'} 
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Status Alert Bar */}
              <div className={`flex items-center justify-between p-5 border rounded-2xl transition-colors duration-500 ${
                totalAllocated === selectedOrder.quantity_cs 
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' 
                : 'bg-amber-500/5 border-amber-500/20 text-amber-500'
              }`}>
                <div className="flex items-center gap-3">
                  {totalAllocated === selectedOrder.quantity_cs ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                    Progress: {totalAllocated.toLocaleString()} / {selectedOrder.quantity_cs.toLocaleString()} CS Allocated
                  </p>
                </div>
                {totalAllocated > selectedOrder.quantity_cs && (
                   <span className="text-[10px] font-black bg-rose-500 text-white px-2 py-1 rounded animate-pulse">OVER CAPACITY</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[600px] border-2 border-dashed border-slate-800/50 rounded-4xl flex flex-col items-center justify-center text-slate-700 space-y-6 bg-slate-900/10 shadow-inner">
              <div className="p-8 bg-slate-900/50 rounded-full border border-slate-800 shadow-xl">
                <Truck size={64} className="opacity-10" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">Ready for Outbound Logistics</p>
                <p className="text-[9px] font-medium text-slate-600 uppercase italic">Select a pending order from the list to begin allocation</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}