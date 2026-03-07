/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Box, Plus, Save, Trash2, Edit2, Check, X, Filter, AlertTriangle, Archive, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterService } from '../../services/masterService';
import { MItem } from '../../types';

export default function ItemsMaster() {
  const [items, setItems] = useState<MItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MItem>>({});
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await masterService.getItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch items", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleEdit = (item: MItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.item_code || !editForm.item_name) {
      alert("品目コードと品目名は必須です。");
      return;
    }
    
    try {
      await masterService.saveItem(editForm);
      setEditingId(null);
      await fetchItems();
    } catch (error) {
      alert("保存中にエラーが発生しました。");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`品目「${name}」を削除してもよろしいですか？\n※この操作は取り消せません。`)) {
      try {
        // masterService に deleteItem がある前提
        // await masterService.deleteItem(id); 
        console.log(`Deleting item: ${id}`);
        await fetchItems();
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
      item_code: '', 
      item_name: '', 
      category: '原材料', 
      unit: 'kg', 
      min_stock: 0 
    });
  };

  const categories = ['All', '原材料', '資材'];
  const filteredItems = filterCategory === 'All' ? items : items.filter(i => i.category === filterCategory);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Scanning Material Database...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Box className="text-blue-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Raw Materials & Supplies</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">品目マスタ <span className="text-slate-600 text-xl font-light not-italic">/ Items</span></h1>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-inner">
            <Filter size={14} className="text-slate-500" />
            <div className="flex gap-1">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCategory(c)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                    filterCategory === c 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleAddNew}
            disabled={editingId !== null && editingId.startsWith('temp-')}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus size={16} /> Add New Item
          </button>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-4xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800">
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Code</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Item Details</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Category</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Unit</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">適正在庫 (Min)</th>
                <th className="py-5 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <AnimatePresence mode='popLayout'>
                {filteredItems.map((i) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={i.id} 
                    className={`group transition-all ${editingId === i.id ? 'bg-blue-500/10' : 'hover:bg-slate-800/10'}`}
                  >
                    <td className="py-5 px-8">
                      {editingId === i.id ? (
                        <input
                          type="text"
                          autoFocus
                          value={editForm.item_code}
                          onChange={(e) => setEditForm({ ...editForm, item_code: e.target.value.toUpperCase() })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-blue-500 w-full shadow-inner shadow-black/50"
                        />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${i.category === '原材料' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                            {i.category === '原材料' ? <Package size={14} /> : <Archive size={14} />}
                          </div>
                          <span className="text-xs font-mono font-black text-blue-500 tracking-wider">{i.item_code}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-5 px-8">
                      {editingId === i.id ? (
                        <input
                          type="text"
                          value={editForm.item_name}
                          onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 w-full shadow-inner shadow-black/50"
                        />
                      ) : (
                        <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">{i.item_name}</span>
                      )}
                    </td>
                    <td className="py-5 px-8">
                      {editingId === i.id ? (
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 w-full appearance-none cursor-pointer"
                        >
                          <option value="原材料">原材料</option>
                          <option value="資材">資材</option>
                        </select>
                      ) : (
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
                          i.category === '原材料' ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-slate-700 text-slate-500 bg-slate-800/30'
                        } uppercase tracking-widest`}>
                          {i.category}
                        </span>
                      )}
                    </td>
                    <td className="py-5 px-8 text-center">
                      {editingId === i.id ? (
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2.5 text-xs text-white text-center outline-none focus:border-blue-500 w-16 mx-auto"
                        />
                      ) : (
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{i.unit}</span>
                      )}
                    </td>
                    <td className="py-5 px-8 text-right font-mono">
                      {editingId === i.id ? (
                        <input
                          type="number"
                          value={editForm.min_stock}
                          onChange={(e) => setEditForm({ ...editForm, min_stock: Number(e.target.value) })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white text-right outline-none focus:border-blue-500 w-28 shadow-inner"
                        />
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {i.min_stock > 0 && <AlertTriangle size={12} className="text-amber-500/50" />}
                          <span className={`text-sm font-bold ${i.min_stock > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                            {i.min_stock.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === i.id ? (
                          <>
                            <button 
                              onClick={handleSave} 
                              className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40"
                              title="Save Changes"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              onClick={handleCancel} 
                              className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEdit(i)} 
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 transition-all"
                              title="Edit Item"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(i.id, i.item_name)}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all"
                              title="Delete Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredItems.length === 0 && (
          <div className="p-32 text-center space-y-4">
            <div className="inline-flex p-6 rounded-full bg-slate-950 border border-slate-800 text-slate-700">
              <Box size={40} />
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">No materials identified in this sector</p>
          </div>
        )}
      </div>
    </div>
  );
}