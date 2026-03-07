/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Package, Save, AlertTriangle, ArrowRightLeft, Info, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { inventoryService } from '../../services/inventoryService';
import { TItemStock, TProductStock } from '../../types';

// ステータスに応じたデザイン定義
const STATUS_THEME = {
    '充足': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20', dot: 'bg-emerald-500' },
    '注意': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20', dot: 'bg-amber-500' },
    '不足': { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/20', dot: 'bg-rose-500' },
};

export default function Inventory() {
    const [activeSubTab, setActiveSubTab] = useState<'items' | 'products'>('items');
    const [itemStocks, setItemStocks] = useState<any[]>([]); // 拡張したViewデータを含む
    const [productStocks, setProductStocks] = useState<TProductStock[]>([]);
    const [loading, setLoading] = useState(true);
    const [isStocktaking, setIsStocktaking] = useState(false);
    const [adjustments, setAdjustments] = useState<Record<string, number>>({});
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // inventoryService.getItemStocks() が新設した v_stock_status を叩く想定
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

    // フィルタリングロジック
    const filteredItems = itemStocks.filter(item => 
        item.item_name.includes(searchTerm) || item.item_code.includes(searchTerm)
    );

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <div className="text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-[10px]">Auditing Inventory Assets...</div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700 px-4 pb-20">
            {/* ヘッダーセクション */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-blue-400" size={14} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations / Asset Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic tracking-tight">
                        在庫管理 <span className="text-slate-600 text-xl font-light not-italic">/ Inventory</span>
                    </h1>
                </div>
                
                <div className="flex w-full md:w-auto gap-2">
                    <button
                        onClick={() => setIsStocktaking(!isStocktaking)}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${isStocktaking
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}
                    >
                        <ArrowRightLeft size={14} /> {isStocktaking ? 'Cancel' : 'Start Stocktaking'}
                    </button>
                    {isStocktaking && (
                        <button
                            onClick={handleSaveStocktaking}
                            className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <Save size={14} /> Save
                        </button>
                    )}
                </div>
            </div>

            {/* タブ & 検索バー */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-1 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-full md:w-fit">
                    <button
                        onClick={() => setActiveSubTab('items')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'items' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                    >
                        Raw Materials
                    </button>
                    <button
                        onClick={() => setActiveSubTab('products')}
                        className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'products' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                    >
                        Finished Goods
                    </button>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white outline-none focus:border-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="space-y-4">
                {activeSubTab === 'items' ? (
                    <>
                        {/* デスクトップ用テーブル */}
                        <div className="hidden md:block bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950/50 border-b border-slate-800">
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item / Status</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Logical</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Planned Usage</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actual Stock</th>
                                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Forecast Diff</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-white">
                                    {filteredItems.map((stock) => {
                                        const theme = STATUS_THEME[stock.status as keyof typeof STATUS_THEME];
                                        const diff = (adjustments[stock.id] ?? stock.current_stock) - stock.planned_usage;
                                        
                                        return (
                                            <tr key={stock.id} className="group hover:bg-slate-800/10 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-2 h-2 rounded-full ${theme.dot} animate-pulse`} />
                                                        <div>
                                                            <p className="text-xs font-bold">{stock.item_name}</p>
                                                            <p className="text-[10px] font-mono text-slate-500 uppercase">{stock.item_code}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">{stock.current_stock}</td>
                                                <td className="py-4 px-6 text-right font-mono text-xs text-blue-400">{stock.planned_usage}</td>
                                                <td className="py-4 px-6 text-right">
                                                    {isStocktaking ? (
                                                        <input
                                                            type="number"
                                                            value={adjustments[stock.id] ?? stock.current_stock}
                                                            onChange={(e) => setAdjustments({ ...adjustments, [stock.id]: Number(e.target.value) })}
                                                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right font-mono text-xs text-white outline-none focus:border-blue-500 w-24"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-mono font-black">{stock.current_stock}</span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className={`inline-block px-2 py-1 rounded-lg text-[10px] font-black font-mono ${theme.bg} ${theme.text} border ${theme.border}`}>
                                                        {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} ({stock.status})
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* スマホ用カードUI */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredItems.map((stock) => {
                                const theme = STATUS_THEME[stock.status as keyof typeof STATUS_THEME];
                                const diff = (adjustments[stock.id] ?? stock.current_stock) - stock.planned_usage;
                                return (
                                    <motion.div 
                                        layout
                                        key={stock.id} 
                                        className={`p-4 rounded-3xl border ${theme.bg} ${theme.border} relative overflow-hidden`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-sm font-black text-white">{stock.item_name}</h3>
                                                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">{stock.item_code}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${theme.border} ${theme.text}`}>
                                                {stock.status}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                                                <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Stock</p>
                                                <p className="text-xs font-mono font-bold text-white">{stock.current_stock}</p>
                                            </div>
                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                                                <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Planned</p>
                                                <p className="text-xs font-mono font-bold text-blue-400">{stock.planned_usage}</p>
                                            </div>
                                            <div className="bg-slate-950/40 p-2 rounded-xl border border-white/5">
                                                <p className="text-[8px] text-slate-500 font-bold uppercase mb-1">Diff</p>
                                                <p className={`text-xs font-mono font-bold ${diff < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                                                </p>
                                            </div>
                                        </div>

                                        {isStocktaking && (
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <input
                                                    type="number"
                                                    placeholder="Enter actual count"
                                                    onChange={(e) => setAdjustments({ ...adjustments, [stock.id]: Number(e.target.value) })}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-4 text-center text-sm font-mono text-white outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    /* 完成品在庫（製品）の表示ロジック（既存踏襲） */
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-x-auto shadow-2xl">
                        <table className="w-full text-left min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-950/50 border-b border-slate-800">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product / Lot</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">CS</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">P</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-white">
                                {productStocks.map((stock) => (
                                    <tr key={stock.id} className="hover:bg-slate-800/10">
                                        <td className="py-4 px-6">
                                            <p className="text-xs font-bold text-slate-200">{stock.product_code}</p>
                                            <p className="text-[10px] font-mono text-amber-500 font-bold uppercase">{stock.mfg_lot}</p>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-400 font-medium">{stock.expiry_date}</td>
                                        <td className="py-4 px-6 text-right font-mono text-sm font-black">{stock.stock_cs}</td>
                                        <td className="py-4 px-6 text-right font-mono text-xs text-slate-500">{stock.stock_p}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* フッター通知エリア */}
            <AnimatePresence>
                {isStocktaking && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-4 right-4 md:relative md:bottom-0 md:left-0 md:right-0 flex items-center gap-3 p-4 bg-blue-600 border border-blue-400 rounded-2xl shadow-2xl shadow-blue-900/40 z-50"
                    >
                        <Info size={20} className="text-white shrink-0" />
                        <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Stocktaking Mode</p>
                            <p className="text-[9px] font-bold text-blue-100 uppercase tracking-widest leading-tight">
                                Adjusting physical counts. Tap "Save" to commit changes.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}