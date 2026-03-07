/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, Edit2, Check, X, Shield, Mail, Key, UserCheck, UserMinus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterService } from '../../services/masterService';
import { MUser } from '../../types';

export default function UsersMaster() {
  const [users, setUsers] = useState<MUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MUser>>({});

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await masterService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to sync user repository", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: MUser) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    // バリデーション: 入力形式チェック
    if (!editForm.username || !editForm.email) {
      alert("ユーザー名とメールアドレスは必須です。");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editForm.email)) {
      alert("有効なメールアドレスを入力してください。");
      return;
    }

    try {
      await masterService.saveUser(editForm);
      setEditingId(null);
      await fetchUsers();
    } catch (error) {
      alert("ユーザー情報の保存中にエラーが発生しました。");
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (window.confirm(`警告: ユーザー「${username}」を完全に削除しますか？\nこのユーザーに関連する操作ログは保持されますが、ログインは即座に無効化されます。`)) {
      try {
        // await masterService.deleteUser(id);
        console.log(`Deleting user identity: ${id}`);
        await fetchUsers();
      } catch (error) {
        alert("削除に失敗しました。");
      }
    }
  };

  const handleAddNew = () => {
    const newId = `temp-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ 
      id: newId, 
      username: '', 
      email: '', 
      role: 'User', 
      is_active: true 
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Authenticating User Registry...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-purple-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Access Control</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">ユーザーマスタ <span className="text-slate-600 text-xl font-light not-italic">/ Users</span></h1>
        </div>
        <button
          onClick={handleAddNew}
          disabled={editingId !== null}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20 active:scale-95"
        >
          <Plus size={18} /> Add New User
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode='popLayout'>
          {users.map((u) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={u.id}
              className={`relative overflow-hidden bg-slate-900/40 border rounded-[2rem] p-8 shadow-2xl backdrop-blur-sm transition-all duration-500 ${
                editingId === u.id 
                ? 'border-purple-500 ring-2 ring-purple-500/20 z-10' 
                : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {editingId === u.id ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Key size={18} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identify Edit Mode</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Username</label>
                      <input
                        type="text"
                        value={editForm.username}
                        autoFocus
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Email Address</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Privilege</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500 appearance-none cursor-pointer"
                        >
                          <option value="Admin">Admin</option>
                          <option value="User">User</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Access Status</label>
                        <select
                          value={editForm.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-purple-500 appearance-none cursor-pointer"
                        >
                          <option value="true">Authorized</option>
                          <option value="false">Revoked</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/40">
                      <Check size={14} /> Commit Changes
                    </button>
                    <button onClick={handleCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <X size={14} /> Abort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full relative z-0">
                  <div className="flex justify-between items-start mb-8">
                    <div className={`p-4 rounded-[1.25rem] border transition-colors ${
                      u.role === 'Admin' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      <Users size={28} />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(u)} className="p-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all" title="Edit Identity">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(u.id, u.username)} className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all" title="Purge Identity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-6 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white tracking-tight leading-none">{u.username}</h3>
                        {!u.is_active && <AlertCircle size={14} className="text-rose-500" />}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 mt-2.5 group cursor-pointer">
                        <div className="p-1.5 bg-slate-950 rounded-lg">
                          <Mail size={12} className="group-hover:text-purple-400 transition-colors" />
                        </div>
                        <span className="text-xs font-bold tracking-tight group-hover:text-slate-300 transition-colors truncate">{u.email}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 ${
                          u.role === 'Admin' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Shield size={10} />
                          {u.role}
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        u.is_active ? 'text-emerald-500 bg-emerald-500/5' : 'text-slate-600 bg-slate-950'
                      }`}>
                        {u.is_active ? <UserCheck size={10} /> : <UserMinus size={10} />}
                        {u.is_active ? 'Authorized' : 'Revoked'}
                      </div>
                    </div>
                  </div>

                  {/* Role Indicator Glow */}
                  {u.role === 'Admin' && (
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 blur-[40px] rounded-full" />
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Security Info */}
      <div className="p-6 bg-slate-900/20 border border-slate-800 rounded-[2rem] flex items-start gap-4">
        <div className="p-3 bg-slate-950 rounded-2xl text-slate-500">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Control Policy</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            Admin権限を持つユーザーは、マスタデータおよびシステム設定のすべての操作が許可されます。
            Viewer権限はデータの閲覧のみが可能で、保存・削除・変更の操作は制限されます。
          </p>
        </div>
      </div>
    </div>
  );
}