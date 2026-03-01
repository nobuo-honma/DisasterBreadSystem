'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { Truck, Plus, Save, Edit3, Search, MapPin, Phone, User } from 'lucide-react';

export default function DestinationsMasterPage() {
    const [destinations, setDestinations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({
        dest_code: '',
        dest_name: '',
        dest_type: '出荷先',
        postal_code: '',
        address: '',
        phone: '',
        contact_person: '',
        is_active: true,
    });

    // クライアントをuseMemoでメモ化し、nullチェックのガードを容易にする
    const supabase = useMemo(() => createClient(), []);

    const fetchDestinations = async () => {
        if (!supabase) return; // ガード節

        setLoading(true);
        const { data } = await supabase
            .from('m_destinations')
            .select('*')
            .order('dest_code', { ascending: true });
        setDestinations(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchDestinations();
    }, [supabase]);

    const handleSave = async () => {
        if (!supabase) return; // ガード節
        if (!formData.dest_code || !formData.dest_name) return;

        if (editingId) {
            await supabase.from('m_destinations').update(formData).eq('id', editingId);
        } else {
            await supabase.from('m_destinations').insert([formData]);
        }

        setEditingId(null);
        setFormData({
            dest_code: '',
            dest_name: '',
            dest_type: '出荷先',
            postal_code: '',
            address: '',
            phone: '',
            contact_person: '',
            is_active: true
        });
        fetchDestinations();
    };

    if (loading) return (
        <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">
            Connecting to Partner Ledger...
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* HEADER */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="text-orange-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Trade Partners</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic">取引先マスタ</h1>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">

                {/* 左側: 登録フォーム */}
                <section className="lg:col-span-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sticky top-8 shadow-2xl">
                        <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Plus size={14} /> {editingId ? 'Modify Partner' : 'Add New Partner'}
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">取引先コード</label>
                                    <input
                                        type="text"
                                        value={formData.dest_code}
                                        onChange={(e) => setFormData({ ...formData, dest_code: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500 outline-none transition-all font-mono"
                                        placeholder="D-000"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">区分</label>
                                    <select
                                        value={formData.dest_type}
                                        onChange={(e) => setFormData({ ...formData, dest_type: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none"
                                    >
                                        <option value="出荷先">出荷先</option>
                                        <option value="仕入先">仕入先</option>
                                        <option value="配送">配送業者</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">取引先名称</label>
                                <input
                                    type="text"
                                    value={formData.dest_name}
                                    onChange={(e) => setFormData({ ...formData, dest_name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase italic">〒</label>
                                    <input
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">住所</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">電話番号</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">担当者</label>
                                    <input
                                        type="text"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={16} /> {editingId ? 'Update Partner' : 'Register Partner'}
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
                                <input
                                    type="text"
                                    placeholder="Search partners..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-orange-500 outline-none"
                                />
                            </div>
                        </div>

                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-800">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type / Code</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name / Contact</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Info</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {destinations.map((d) => (
                                    <tr key={d.id} className="group hover:bg-slate-800/20 transition-all">
                                        <td className="py-6 px-6">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${d.dest_type === '出荷先' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' :
                                                d.dest_type === '仕入先' ? 'border-orange-500/30 text-orange-400 bg-orange-500/5' :
                                                    'border-slate-500/30 text-slate-400 bg-slate-500/5'
                                                }`}>
                                                {d.dest_type}
                                            </span>
                                            <div className="text-xs font-mono font-black text-slate-400 mt-2">{d.dest_code}</div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">{d.dest_name}</div>
                                            <div className="flex items-center gap-2 mt-1 text-slate-500">
                                                <User size={10} className="text-slate-600" />
                                                <span className="text-[10px] font-bold">{d.contact_person || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <MapPin size={12} className="text-slate-600" />
                                                <span className="text-[11px] font-medium">{d.address || 'Address not set'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-slate-500">
                                                <Phone size={10} className="text-slate-600" />
                                                <span className="text-[10px] font-mono">{d.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button
                                                onClick={() => { setEditingId(d.id); setFormData(d); }}
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