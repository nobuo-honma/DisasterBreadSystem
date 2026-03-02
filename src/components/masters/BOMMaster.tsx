/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Layers, Plus, Save, Trash2, Package, Box, ArrowRight } from 'lucide-react';
import { masterService } from '../../services/masterService';
import { MProduct, MItem, MBom } from '../../types';

export default function BOMMaster() {
    const [products, setProducts] = useState<MProduct[]>([]);
    const [items, setItems] = useState<MItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [bomEntries, setBomEntries] = useState<Partial<MBom>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const [pData, iData] = await Promise.all([
                masterService.getProducts(),
                masterService.getItems()
            ]);
            setProducts(pData);
            setItems(iData);
            setLoading(false);
        };
        init();
    }, []);

    const fetchBOM = async (productId: string) => {
        setSelectedProductId(productId);
        const data = await masterService.getBOM(productId);
        setBomEntries(data);
    };

    const handleSaveBOM = async () => {
        if (!selectedProductId) return;
        const cleanEntries = bomEntries.filter(e => e.item_id && e.quantity && e.quantity > 0);
        await masterService.saveBOM(selectedProductId, cleanEntries);
        alert('BOM設定を更新しました');
        fetchBOM(selectedProductId);
    };

    const addRow = () => {
        if (!selectedProductId) return;
        setBomEntries([...bomEntries, { product_id: selectedProductId, item_id: '', quantity: 0 }]);
    };

    if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Parsing Configuration Tree...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="text-indigo-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Composition Recipe</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic">BOM管理 <span className="text-slate-600 text-xl font-light">/ 部品構成表</span></h1>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                <aside className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                        <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Package size={14} /> Select Target Product
                        </h2>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {products.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => fetchBOM(p.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${selectedProductId === p.id
                                        ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className={`text-[10px] font-mono font-black mb-1 ${selectedProductId === p.id ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                {p.product_code}
                                            </div>
                                            <div className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">
                                                {p.product_name}
                                            </div>
                                        </div>
                                        {selectedProductId === p.id && <ArrowRight size={16} className="text-indigo-500 animate-pulse" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="lg:col-span-8">
                    {selectedProductId ? (
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                            <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
                                <h3 className="text-sm font-black text-white flex items-center gap-2">
                                    <Box size={16} className="text-indigo-400" />
                                    構成品目リスト
                                </h3>
                                <button
                                    onClick={addRow}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950/50 border-b border-slate-800">
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">使用品目 (原材料・資材)</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40 text-right">必要数量</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">単位</th>
                                            <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {bomEntries.map((entry, index) => (
                                            <tr key={index} className="group hover:bg-slate-800/10">
                                                <td className="py-4 px-6">
                                                    <select
                                                        value={entry.item_id}
                                                        onChange={(e) => {
                                                            const newEntries = [...bomEntries];
                                                            newEntries[index].item_id = e.target.value;
                                                            setBomEntries(newEntries);
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                                                    >
                                                        <option value="">品目を選択してください</option>
                                                        {items.map(i => (
                                                            <option key={i.id} value={i.id}>{i.item_code} : {i.item_name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        value={entry.quantity}
                                                        onChange={(e) => {
                                                            const newEntries = [...bomEntries];
                                                            newEntries[index].quantity = Number(e.target.value);
                                                            setBomEntries(newEntries);
                                                        }}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right font-mono outline-none focus:border-indigo-500"
                                                    />
                                                </td>
                                                <td className="py-4 px-6 text-center text-[10px] font-bold text-slate-500">
                                                    {items.find(i => i.id === entry.item_id)?.unit || '-'}
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <button
                                                        onClick={() => setBomEntries(bomEntries.filter((_, i) => i !== index))}
                                                        className="text-slate-600 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                                <button
                                    onClick={handleSaveBOM}
                                    disabled={bomEntries.length === 0}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Save Product Recipe (BOM)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-4">
                            <Layers size={48} className="opacity-20" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-40">Please select a product to edit its BOM</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
