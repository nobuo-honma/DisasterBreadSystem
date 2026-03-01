'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Plus, Save, Edit3, Shield, Mail, UserCheck } from 'lucide-react';

export default function UsersMasterPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<any>({
        username: '',
        email: '',
        role: '一般',
        is_active: true,
    });

    // Supabaseクライアントをメモ化し、nullチェックを容易にする
    const supabase = useMemo(() => createClient(), []);

    const fetchUsers = async () => {
        if (!supabase) return; // 型ガード

        setLoading(true);
        const { data } = await supabase
            .from('m_users')
            .select('*')
            .order('username', { ascending: true });
        setUsers(data ?? []);
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, [supabase]);

    const handleSave = async () => {
        if (!supabase) return; // 型ガード
        if (!formData.username || !formData.email) return;

        if (editingId) {
            await supabase.from('m_users').update(formData).eq('id', editingId);
        } else {
            await supabase.from('m_users').insert([formData]);
        }

        setEditingId(null);
        setFormData({ username: '', email: '', role: '一般', is_active: true });
        fetchUsers();
    };

    if (loading) return (
        <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">
            Authenticating Access Control...
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* HEADER */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="text-purple-400" size={16} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Access Control</span>
                    </div>
                    <h1 className="text-3xl font-black text-white italic">ユーザー管理</h1>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-12">

                {/* 左側: フォーム */}
                <section className="lg:col-span-4">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sticky top-8 shadow-2xl">
                        <h2 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Plus size={14} /> {editingId ? 'Modify Access' : 'Create New User'}
                        </h2>

                        <div className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">表示名</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:border-purple-500 outline-none transition-all"
                                        placeholder="名前 太郎"
                                    />
                                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">メールアドレス</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-white focus:border-purple-500 outline-none transition-all"
                                        placeholder="example@disaster.bread"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase">アクセス権限</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none"
                                >
                                    <option value="一般">一般（参照のみ）</option>
                                    <option value="製造担当">製造担当（入出庫・製造）</option>
                                    <option value="事務担当">事務担当（受注・出荷）</option>
                                    <option value="管理者">管理者（マスタ編集・全権限）</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                                <span className="text-[10px] font-black text-slate-500 uppercase">アカウント有効</span>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 accent-purple-500 cursor-pointer"
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-900/20 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={16} /> {editingId ? 'Update Permission' : 'Register User'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 右側: 一覧リスト */}
                <section className="lg:col-span-8">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-800">
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Name</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role / Email</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {users.map((u) => (
                                    <tr key={u.id} className={`group hover:bg-slate-800/20 transition-all ${!u.is_active ? 'opacity-50' : ''}`}>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border ${u.is_active ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-500'
                                                    }`}>
                                                    {u.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white group-hover:text-purple-400 transition-colors">{u.username}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold">ID: {u.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Shield size={12} className={u.role === '管理者' ? 'text-rose-500' : 'text-purple-400'} />
                                                <span className="text-xs font-black text-slate-200">{u.role}</span>
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500">{u.email}</div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <button
                                                onClick={() => { setEditingId(u.id); setFormData(u); }}
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