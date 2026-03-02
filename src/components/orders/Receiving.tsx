/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { History, Plus, Check, X, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { receivingService } from '../../services/receivingService';
import { TReceiving } from '../../types';

export default function Receiving() {
  const [receivings, setReceivings] = useState<TReceiving[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TReceiving>>({});

  useEffect(() => {
    fetchReceivings();
  }, []);

  const fetchReceivings = async () => {
    setLoading(true);
    const data = await receivingService.getReceivings();
    setReceivings(data);
    setLoading(false);
  };

  const handleEdit = (rec: TReceiving) => {
    setEditingId(rec.id);
    setEditForm(rec);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    await receivingService.saveReceiving(editForm);
    setEditingId(null);
    fetchReceivings();
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ 
      id: newId, 
      receiving_code: `REC-${Date.now().toString().slice(-6)}`, 
      item_code: '', 
      scheduled_date: new Date().toISOString().split('T')[0], 
      order_quantity: 0, 
      status: '未入荷' 
    });
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Processing Material Inflow...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="text-emerald-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations / Inbound Logistics</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">入荷管理 <span className="text-slate-600 text-xl font-light">/ Receiving</span></h1>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={16} /> Register New Inbound
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rec Code</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Code</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Scheduled</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Order Qty</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actual Qty</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {receivings.map((r) => (
              <tr key={r.id} className="group hover:bg-slate-800/10 transition-colors">
                <td className="py-4 px-6">
                  <span className="text-xs font-mono font-bold text-emerald-500">{r.receiving_code}</span>
                </td>
                <td className="py-4 px-6">
                  {editingId === r.id ? (
                    <input
                      type="text"
                      value={editForm.item_code}
                      onChange={(e) => setEditForm({ ...editForm, item_code: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-200">{r.item_code}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {editingId === r.id ? (
                    <input
                      type="date"
                      value={editForm.scheduled_date}
                      onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-slate-400">{r.scheduled_date}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  {editingId === r.id ? (
                    <input
                      type="number"
                      value={editForm.order_quantity}
                      onChange={(e) => setEditForm({ ...editForm, order_quantity: Number(e.target.value) })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right outline-none focus:border-emerald-500 w-24"
                    />
                  ) : (
                    <span className="text-sm font-mono text-slate-400">{r.order_quantity}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  {editingId === r.id ? (
                    <input
                      type="number"
                      value={editForm.actual_quantity}
                      onChange={(e) => setEditForm({ ...editForm, actual_quantity: Number(e.target.value) })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right outline-none focus:border-emerald-500 w-24"
                    />
                  ) : (
                    <span className="text-sm font-mono text-white">{r.actual_quantity || '-'}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-center">
                  {editingId === r.id ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      <option value="未入荷">未入荷</option>
                      <option value="一部入荷">一部入荷</option>
                      <option value="入荷済">入荷済</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                      r.status === '入荷済' ? 'bg-emerald-500/10 text-emerald-500' : 
                      r.status === '一部入荷' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {r.status}
                    </span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {editingId === r.id ? (
                      <>
                        <button onClick={handleSave} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancel} className="text-slate-500 hover:text-slate-400 transition-colors">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(r)} className="text-slate-500 hover:text-white transition-colors">
                          <Edit2 size={16} />
                        </button>
                        <button className="text-slate-500 hover:text-rose-500 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
