/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Truck, Search, Calendar, Package, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const fetchPendingOrders = async () => {
    setLoading(true);
    const data = await orderService.getPendingOrders();
    setPendingOrders(data);
    setLoading(false);
  };

  const handleSelectOrder = async (order: TOrder) => {
    setSelectedOrder(order);
    const stocks = await inventoryService.getProductStocks();
    const relevantStocks = stocks.filter(s => s.product_code === order.product_code);
    setProductStocks(relevantStocks);
    
    // Auto-allocate based on FIFO (expiry date)
    const sortedStocks = [...relevantStocks].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
    let remaining = order.quantity_cs;
    const newAllocations: Record<string, number> = {};
    
    for (const stock of sortedStocks) {
      if (remaining <= 0) break;
      const allocate = Math.min(remaining, stock.stock_cs);
      if (allocate > 0) {
        newAllocations[stock.id] = allocate;
        remaining -= allocate;
      }
    }
    setAllocations(newAllocations);
  };

  const handleConfirmShipping = async () => {
    if (!selectedOrder) return;
    const totalAllocated = Object.values(allocations).reduce((sum: number, val: number) => sum + val, 0);
    if (totalAllocated < selectedOrder.quantity_cs) {
      if (!confirm('在庫が不足していますが、出荷を確定しますか？')) return;
    }
    
    await inventoryService.confirmShipping(selectedOrder, allocations, shippingDate);
    alert('出荷を確定しました');
    setSelectedOrder(null);
    fetchPendingOrders();
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Synchronizing Logistics Stream...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="text-amber-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations / Outbound Logistics</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">出荷管理 <span className="text-slate-600 text-xl font-light">/ Shipping</span></h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* LEFT: PENDING ORDERS */}
        <aside className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Search size={14} /> Pending Orders
              </h2>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">{pendingOrders.length} ORDERS</span>
            </div>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
              {pendingOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 group ${selectedOrder?.id === order.id
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase">{order.order_code}</span>
                    <span className="text-[10px] font-bold text-slate-500">{order.request_delivery_date}</span>
                  </div>
                  <div className="text-sm font-black text-slate-200 mb-1">{order.product_name_at_order}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">{order.destination_code}</span>
                    <span className="text-sm font-black text-white">{order.quantity_cs} CS</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT: ALLOCATION & CONFIRMATION */}
        <main className="lg:col-span-7">
          {selectedOrder ? (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white tracking-tight mb-1">{selectedOrder.product_name_at_order}</h3>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{selectedOrder.destination_code} / {selectedOrder.order_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Order Quantity</p>
                    <p className="text-2xl font-black text-white">{selectedOrder.quantity_cs} <span className="text-xs text-slate-500">CS</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    <Package size={14} className="text-amber-500" /> Inventory Allocation (FIFO)
                  </div>
                  
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="py-3 px-4 text-[9px] font-black text-slate-600 uppercase">Lot Number</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-600 uppercase">Expiry</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-600 uppercase text-right">Stock</th>
                          <th className="py-3 px-4 text-[9px] font-black text-slate-600 uppercase text-right w-32">Allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {productStocks.map((stock) => (
                          <tr key={stock.id} className="text-xs">
                            <td className="py-3 px-4 font-mono font-bold text-slate-400">{stock.mfg_lot}</td>
                            <td className="py-3 px-4 text-slate-500">{stock.expiry_date}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-300">{stock.stock_cs} CS</td>
                            <td className="py-3 px-4">
                              <input
                                type="number"
                                value={allocations[stock.id] || 0}
                                onChange={(e) => setAllocations({ ...allocations, [stock.id]: Number(e.target.value) })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right font-mono text-white outline-none focus:border-amber-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col md:flex-row gap-6 items-end">
                  <div className="flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Shipping Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="date"
                        value={shippingDate}
                        onChange={(e) => setShippingDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleConfirmShipping}
                    className="w-full md:w-auto bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-3 group"
                  >
                    Confirm Shipment <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <AlertCircle size={18} className="text-amber-500" />
                <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                  Total Allocated: {Object.values(allocations).reduce((a: number, b: number) => a + b, 0)} / {selectedOrder.quantity_cs} CS
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Truck size={48} className="opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest opacity-40">Select an order to begin allocation</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
