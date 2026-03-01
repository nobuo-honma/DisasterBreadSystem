'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { Box, Plus, Save, Edit3, Search, AlertCircle, Filter } from 'lucide-react';

export default function ItemsMasterPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({
        item_code: '',
        item_name: '',
        category: '原材料',
        unit: 'kg',
        safety_stock: 0,
        is_active: true,
    });

    // Supabaseクライアントをメモ化し、nullチェックを容易にする
    const supabase = useMemo(() => createClient(), []);

    const fetchItems = async () => {
        if (!supabase) return; // TypeScriptの型ガード

        setLoading(true);
        const { data } = await supabase
            .from('m_items')
            .select('*')
            .order('item_code', { ascending: true });
        setItems(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, [supabase]);

    const handleSave = async () => {
        if (!supabase) return; // TypeScriptの型ガード
        if (!formData.item_code || !formData.item_name) return;

        if (editingId) {
            await supabase.from('m_items').update(formData).eq('id', editingId);
        } else {
            await supabase.from('m_items').insert([formData]);
        }

        setEditingId(null);
        setFormData({
            item_code: '',
            item_name: '',
            category: '原材料',
            unit: 'kg',
            safety_stock: 0,
            is_active: true
        });
        fetchItems();
    };

    if (loading) return (
        <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">
            Accessing Item Ledger...
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* HEADER */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Box className="text-blue-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Resource Assets</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic">品目マスタ</h1>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">

                {/* 左側: 登録・編集フォーム */}
                <section className="lg:col-span-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sticky top-8 shadow-2xl">
                        <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Plus size={14} /> {editingId ? 'Modify Item' : 'Register New Resource'}
                        </h2>

                        <div className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">品目コード</label>
                                <input
                                    type="text"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all font-mono"
                                    placeholder="MAT-000"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">品目名称</label>
                                <input
                                    type="text"
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">カテゴリー</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none"
                                    >
                                        <option value="原材料">原材料</option>
                                        <option value="包装資材">包装資材</option>
                                        <option value="消耗品">消耗品</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">管理単位</label>
                                    <input
                                        type="text"
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                        placeholder="kg / 枚 / 本"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                                    安全在庫数 <AlertCircle size={10} className="text-orange-400" />
                                </label>
                                <input
                                    type="number"
                                    value={formData.safety_stock}
                                    onChange={(e) => setFormData({ ...formData, safety_stock: Number(e.target.value) })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none text-right font-mono"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={16} /> {editingId ? 'Update Item' : 'Register Item'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 右側: 一覧リスト */}
                <section className="lg:col-span-8">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
                            <div className="relative flex-1 max-w-xs">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" placeholder="Search items..." className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-blue-500 outline-none" />
                            </div>
                            <Filter size={14} className="text-slate-500 cursor-pointer hover:text-white transition-colors" />
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-800">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category / Code</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Name</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit / Safety</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {items.map((i) => (
                                    <tr key={i.id} className="group hover:bg-slate-800/20 transition-all">
                                        <td className="py-6 px-6">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${i.category === '原材料' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5'
                                                }`}>
                                                {i.category}
                                            </span>
                                            <div className="text-xs font-mono font-black text-slate-400 mt-2">{i.item_code}</div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{i.item_name}</div>
                                        </td>
                                        <td className="py-6 px-6 text-right">
                                            <div className="text-xs font-mono text-slate-300 font-bold">{i.unit}</div>
                                            <div className="text-[10px] text-orange-400 font-black mt-1 uppercase">Min: {i.safety_stock}</div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button
                                                onClick={() => { setEditingId(i.id); setFormData(i); }}
                                                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>
        </div>
    );
}