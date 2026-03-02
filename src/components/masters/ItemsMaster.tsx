/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Box, Plus, Save, Trash2, Edit2, Check, X, Filter } from 'lucide-react';
import { masterService } from '../../services/masterService';
import { MItem } from '../../types';

export default function ItemsMaster() {
  const [items, setItems] = useState<MItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MItem>>({});
  const [filterCategory, setFilterCategory] = useState<string>('All');

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const data = await masterService.getItems();
    setItems(data);
    setLoading(false);
  };

  const handleEdit = (item: MItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    await masterService.saveItem(editForm);
    setEditingId(null);
    fetchItems();
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ id: newId, item_code: '', item_name: '', category: 'Raw Material', unit: 'kg', safety_stock: 0, is_active: true });
  };

  const categories = ['All', ...new Set(items.map(i => i.category))];
  const filteredItems = filterCategory === 'All' ? items : items.filter(i => i.category === filterCategory);

  if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Scanning Material Database...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Box className="text-blue-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Raw Materials & Supplies</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">品目マスタ <span className="text-slate-600 text-xl font-light">/ Items</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <Filter size={14} className="text-slate-500" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-300 outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Name</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-24 text-center">Unit</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Safety Stock</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filteredItems.map((i) => (
              <tr key={i.id} className="group hover:bg-slate-800/10 transition-colors">
                <td className="py-4 px-6">
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editForm.item_code}
                      onChange={(e) => setEditForm({ ...editForm, item_code: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-blue-500 w-full"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-blue-500">{i.item_code}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editForm.item_name}
                      onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 w-full"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-200">{i.item_name}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 w-full"
                    />
                  ) : (
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{i.category}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-center">
                  {editingId === i.id ? (
                    <input
                      type="text"
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-center outline-none focus:border-blue-500 w-16"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">{i.unit}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  {editingId === i.id ? (
                    <input
                      type="number"
                      value={editForm.safety_stock}
                      onChange={(e) => setEditForm({ ...editForm, safety_stock: Number(e.target.value) })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right outline-none focus:border-blue-500 w-24"
                    />
                  ) : (
                    <span className="text-sm font-mono text-slate-400">{i.safety_stock}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {editingId === i.id ? (
                      <>
                        <button onClick={handleSave} className="text-blue-500 hover:text-blue-400 transition-colors">
                          <Check size={18} />
                        </button>
                        <button onClick={handleCancel} className="text-slate-500 hover:text-slate-400 transition-colors">
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(i)} className="text-slate-500 hover:text-white transition-colors">
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
