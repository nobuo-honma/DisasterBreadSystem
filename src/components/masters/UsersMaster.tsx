/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Users, Plus, Save, Trash2, Edit2, Check, X, Shield, Mail } from 'lucide-react';
import { masterService } from '../../services/masterService';
import { MUser } from '../../types';

export default function UsersMaster() {
  const [users, setUsers] = useState<MUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MUser>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await masterService.getUsers();
    setUsers(data);
    setLoading(false);
  };

  const handleEdit = (user: MUser) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    await masterService.saveUser(editForm);
    setEditingId(null);
    fetchUsers();
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ id: newId, username: '', email: '', role: 'User', is_active: true });
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Authenticating User Registry...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-purple-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Access Control</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">ユーザーマスタ <span className="text-slate-600 text-xl font-light">/ Users</span></h1>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
        >
          <Plus size={16} /> Add New User
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className={`bg-slate-900/40 border rounded-3xl p-6 shadow-xl transition-all duration-300 ${editingId === u.id ? 'border-purple-500/50 ring-1 ring-purple-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
            {editingId === u.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500"
                    >
                      <option value="Admin">Admin</option>
                      <option value="User">User</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Status</label>
                    <select
                      value={editForm.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-purple-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={handleCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20">
                    <Users className="text-purple-400" size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(u)} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
                      <Edit2 size={16} />
                    </button>
                    <button className="p-2 text-slate-500 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight">{u.username}</h3>
                    <div className="flex items-center gap-2 text-slate-500 mt-1">
                      <Mail size={12} />
                      <span className="text-xs font-medium">{u.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Shield size={12} className="text-purple-500" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.role}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${u.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
