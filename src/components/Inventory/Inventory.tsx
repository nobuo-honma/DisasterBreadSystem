/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Package, Save, AlertTriangle, ArrowRightLeft } from 'lucide-react';

// 【修正点】 motion/react から標準的な framer-motion に変更
import { motion } from 'framer-motion';

import { inventoryService } from '../../services/inventoryService';
import { TItemStock, TProductStock } from '../../types';

export default function Inventory() {
    const [activeSubTab, setActiveSubTab] = useState<'items' | 'products'>('items');
    const [itemStocks, setItemStocks] = useState<TItemStock[]>([]);
    const [productStocks, setProductStocks] = useState<TProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStocktaking, setIsStocktaking] = useState(false);
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [items, products] = await Promise.all([
            inventoryService.getItemStocks(),
            inventoryService.getProductStocks()
        ]);
        setItemStocks(items);
        setProductStocks(products);
        setLoading(false);
    };

    const handleSaveStocktaking = async () => {
        const payload = itemStocks
            .filter(s => adjustments[s.id] !== undefined)
            .map(s => ({
                itemCode: s.item_code,
                afterStock: adjustments[s.id],
                remarks: `棚卸調整 ${new Date().toLocaleDateString('ja-JP')}`,
            }));
        await inventoryService.saveStocktaking(payload);
        alert('棚卸結果を保存しました');
        setIsStocktaking(false);
        setAdjustments({});
        fetchData();
    };

    if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Auditing Inventory Assets...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-blue-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations / Asset Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic">在庫管理 <span className="text-slate-600 text-xl font-light">/ Inventory</span></h1>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setIsStocktaking(!isStocktaking)}
                        className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${isStocktaking
                            ? 'bg-rose-600 text-white shadow-rose-900/20'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
                            }`}
                    >
                        <ArrowRightLeft size={16} /> {isStocktaking ? 'Cancel Stocktaking' : 'Start Stocktaking'}
                    </button>
                    {isStocktaking && (
                        <button
                            onClick={handleSaveStocktaking}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <Save size={16} /> Save Adjustments
                        </button>
                    )}
                </div>
            </div>

            <div className="flex gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
                <button
                    onClick={() => setActiveSubTab('items')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'items' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    Raw Materials (Items)
                </button>
                <button
                    onClick={() => setActiveSubTab('products')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'products' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    Finished Goods (Products)
                </button>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                {activeSubTab === 'items' ? (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Code</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Logical Stock</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actual Stock</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Diff</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {itemStocks.map((stock) => {
                                const diff = (adjustments[stock.id] ?? stock.actual_stock) - stock.actual_stock;
                                return (
                                    <tr key={stock.id} className="group hover:bg-slate-800/10 transition-colors">
                                        <td className="py-4 px-6">
                                            <span className="text-xs font-mono font-bold text-blue-500">{stock.item_code}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-sm font-mono text-slate-400">{stock.actual_stock}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {isStocktaking ? (
                                                <input
                                                    type="number"
                                                    value={adjustments[stock.id] ?? stock.actual_stock}
                                                    onChange={(e) => setAdjustments({ ...adjustments, [stock.id]: Number(e.target.value) })}
                                                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right font-mono text-white outline-none focus:border-blue-500 w-32"
                                                />
                                            ) : (
                                                <span className="text-sm font-mono font-black text-white">{stock.actual_stock}</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className={`text-[10px] font-black font-mono ${diff > 0 ? 'text-emerald-500' : diff < 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <span className="text-[10px] font-medium text-slate-500">{new Date(stock.updated_at).toLocaleString()}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-950/50 border-b border-slate-800">
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Code</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lot Number</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiry Date</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Stock (CS)</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Stock (P)</th>
                                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {productStocks.map((stock) => (
                                <tr key={stock.id} className="group hover:bg-slate-800/10 transition-colors">
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-bold text-slate-200">{stock.product_code}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-mono font-bold text-amber-500">{stock.mfg_lot}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs font-medium text-slate-400">{stock.expiry_date}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="text-sm font-mono font-black text-white">{stock.stock_cs}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="text-sm font-mono text-slate-400">{stock.stock_p}</span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <span className="text-[10px] font-medium text-slate-500">{new Date(stock.updated_at).toLocaleString()}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {isStocktaking && (
                <div className="flex items-center gap-3 p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl">
                    <AlertTriangle size={24} className="text-blue-500" />
                    <div>
                        <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Stocktaking Mode Active</p>
                        <p className="text-[10px] font-bold text-blue-500/60 uppercase tracking-widest">
                            You are currently adjusting actual stock levels. Logical stock will be updated upon saving.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
