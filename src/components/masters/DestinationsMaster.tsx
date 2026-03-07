/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Truck, Plus, Save, Edit3, Search, MapPin, Phone, User, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterService } from '../../services/masterService';
import { MDestination } from '../../types';

export default function DestinationsMaster() {
    const [destinations, setDestinations] = useState<MDestination[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const initialFormState: Partial<MDestination> = {
        destination_code: '',
        destination_name: '',
        zip_code: '',
        address: '',
        tel: '',
        contact_person: '',
        is_active: true,
    };

    const [formData, setFormData] = useState<Partial<MDestination>>(initialFormState);

    const fetchDestinations = async () => {
        try {
            setLoading(true);
            const data = await masterService.getDestinations();
            setDestinations(data);
        } catch (error) {
            console.error("Failed to fetch partners", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDestinations();
    }, []);

    const handleSave = async () => {
        // バリデーション: 必須項目チェック
        if (!formData.destination_code?.trim() || !formData.destination_name?.trim()) {
            alert('取引先コードと名称は必須です');
            return;
        }

        try {
            await masterService.saveDestination({ ...formData, id: editingId || undefined });
            handleCancelEdit();
            await fetchDestinations();
        } catch (error) {
            alert('保存に失敗しました');
        }
    };

    const handleEdit = (d: MDestination) => {
        setEditingId(d.id);
        setFormData(d);
        // モバイル環境でフォームへスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData(initialFormState);
    };

    // 検索フィルタリング
    const filteredDestinations = destinations.filter(d => 
        d.destination_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.destination_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Connecting to Partner Ledger...</div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-10">
            {/* Header */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-6 md:pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Truck className="text-orange-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Trade Partners</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white italic">取引先マスタ</h1>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">
                {/* Registration Form */}
                <section className="lg:col-span-4 order-2 lg:order-1">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:sticky md:top-8 shadow-2xl overflow-hidden relative">
                        {editingId && (
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={handleCancelEdit} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        )}
                        
                        <h2 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            {editingId ? <Edit3 size={14} /> : <Plus size={14} />} 
                            {editingId ? 'Modify Partner' : 'Add New Partner'}
                        </h2>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                                    取引先コード <AlertCircle size={8} className="text-orange-500" />
                                </label>
                                <input
                                    type="text"
                                    value={formData.destination_code}
                                    onChange={(e) => setFormData({ ...formData, destination_code: e.target.value.toUpperCase() })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500 outline-none transition-all font-mono"
                                    placeholder="TR-001"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                                    取引先名称 <AlertCircle size={8} className="text-orange-500" />
                                </label>
                                <input
                                    type="text"
                                    value={formData.destination_name}
                                    onChange={(e) => setFormData({ ...formData, destination_name: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-orange-500 outline-none transition-all"
                                    placeholder="株式会社〇〇"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase italic">〒</label>
                                    <input
                                        type="text"
                                        value={formData.zip_code}
                                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white font-mono outline-none"
                                        placeholder="000-0000"
                                    />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">住所</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">電話番号</label>
                                    <input
                                        type="tel"
                                        value={formData.tel}
                                        onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">担当者</label>
                                    <input
                                        type="text"
                                        value={formData.contact_person}
                                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                                <span className="text-[10px] font-black text-slate-500 uppercase">ステータス: {formData.is_active ? '有効' : '無効'}</span>
                                <button
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`w-11 h-6 rounded-full transition-colors relative ${formData.is_active ? 'bg-orange-600' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-6' : 'left-1'}`} />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                {editingId && (
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] bg-orange-600 hover:bg-orange-500 active:scale-95 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={14} /> {editingId ? 'Update Partner' : 'Register Partner'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* List View */}
                <section className="lg:col-span-8 order-1 lg:order-2">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                        {/* Search Bar */}
                        <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/20">
                            <div className="relative max-w-sm">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="名称・コードで検索..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:border-orange-500 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* List Content */}
                        <div className="overflow-x-auto">
                            {/* Desktop Table */}
                            <table className="w-full text-left hidden md:table">
                                <thead className="bg-slate-950/50">
                                    <tr className="border-b border-slate-800">
                                        <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Partner Info</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Location / Contact</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                        <th className="py-4 px-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    <AnimatePresence>
                                        {filteredDestinations.map((d) => (
                                            <motion.tr 
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                key={d.id} 
                                                className={`group transition-all ${editingId === d.id ? 'bg-orange-500/5' : 'hover:bg-slate-800/20'}`}
                                            >
                                                <td className="py-5 px-6">
                                                    <div className="text-[10px] font-mono font-black text-orange-500/80 mb-1">{d.destination_code}</div>
                                                    <div className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">{d.destination_name}</div>
                                                </td>
                                                <td className="py-5 px-6">
                                                    <div className="flex items-start gap-2 text-slate-400 max-w-[240px]">
                                                        <MapPin size={12} className="mt-0.5 flex-shrink-0 text-slate-600" />
                                                        <span className="text-[11px] font-medium leading-relaxed truncate">{d.address || '---'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                                            <Phone size={10} className="text-slate-600" /> {d.tel || '-'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                                            <User size={10} className="text-slate-600" /> {d.contact_person || '-'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950">
                                                        <div className={`w-1 h-1 rounded-full ${d.is_active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                                                        <span className={`text-[8px] font-black ${d.is_active !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
                                                            {d.is_active !== false ? 'ACTIVE' : 'OFF'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-6 text-right">
                                                    <button
                                                        onClick={() => handleEdit(d)}
                                                        className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-orange-500/50 transition-all shadow-lg"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>

                            {/* Mobile List Cards */}
                            <div className="md:hidden divide-y divide-slate-800/50">
                                {filteredDestinations.map((d) => (
                                    <div 
                                        key={d.id} 
                                        className={`p-4 space-y-3 transition-colors ${editingId === d.id ? 'bg-orange-500/10' : 'bg-slate-900/20'}`}
                                        onClick={() => handleEdit(d)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-[9px] font-mono font-black text-orange-500 mb-0.5">{d.destination_code}</div>
                                                <div className="text-sm font-black text-white">{d.destination_name}</div>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${d.is_active !== false ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-slate-700 text-slate-600'}`}>
                                                {d.is_active !== false ? 'ACTIVE' : 'OFF'}
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                            <MapPin size={10} /> {d.address || '住所未設定'}
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <div className="text-[10px] text-slate-500 font-mono italic">{d.tel || '-'}</div>
                                            <div className="text-orange-500 font-black text-[10px] flex items-center gap-1 uppercase tracking-tighter">
                                                Edit Partner <Edit3 size={10} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {filteredDestinations.length === 0 && (
                            <div className="p-20 text-center space-y-2">
                                <Search size={32} className="mx-auto text-slate-800" />
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No matching partners found</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}