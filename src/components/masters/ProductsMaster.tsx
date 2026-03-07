/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Package, Plus, Trash2, Edit2, Check, X, AlertCircle, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterService } from '../../services/masterService';
import { MProduct } from '../../types';

export default function ProductsMaster() {
  const [products, setProducts] = useState<MProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MProduct>>({});

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await masterService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleEdit = (product: MProduct) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    // バリデーション: 必須項目と数値の正当性
    if (!editForm.product_code || !editForm.product_name) {
      alert("製品コードと製品名は必須です。");
      return;
    }
    if ((editForm.units_per_kg ?? 0) < 0 || (editForm.units_per_cs ?? 0) < 1) {
      alert("入数は正の数で入力してください（CS入数は1以上）。");
      return;
    }

    try {
      await masterService.saveProduct(editForm);
      setEditingId(null);
      await fetchProducts();
    } catch (error) {
      alert("製品データの保存に失敗しました。");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`製品「${name}」を削除しますか？\nこの製品に紐づく製造実績がある場合、整合性が失われる可能性があります。`)) {
      try {
        // await masterService.deleteProduct(id);
        console.log(`Deleting product: ${id}`);
        await fetchProducts();
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
      product_code: '',
      product_name: '',
      mfg_type: '自主',
      units_per_kg: 0,
      units_per_cs: 1,
      product_category: '定番',
      is_active: true,
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Accessing Product Repository...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-emerald-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Finished Goods</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">製品マスタ <span className="text-slate-600 text-xl font-light not-italic">/ Products</span></h1>
        </div>
        <button
          onClick={handleAddNew}
          disabled={editingId !== null}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95"
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800">
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Product Code</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Product Identification</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Classification</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Unit Conversion</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Lifecycle</th>
                <th className="py-6 px-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <AnimatePresence mode='popLayout'>
                {products.map((p) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={p.id} 
                    className={`group transition-colors ${editingId === p.id ? 'bg-emerald-500/5' : 'hover:bg-slate-800/20'}`}
                  >
                    <td className="py-6 px-8">
                      {editingId === p.id ? (
                        <input
                          type="text"
                          value={editForm.product_code}
                          autoFocus
                          onChange={(e) => setEditForm({ ...editForm, product_code: e.target.value.toUpperCase() })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white font-mono outline-none focus:border-emerald-500 w-full"
                          placeholder="P-000"
                        />
                      ) : (
                        <span className="text-xs font-mono font-black text-emerald-500 tracking-tighter bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                          {p.product_code}
                        </span>
                      )}
                    </td>
                    <td className="py-6 px-8">
                      {editingId === p.id ? (
                        <input
                          type="text"
                          value={editForm.product_name}
                          onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                          className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500 w-full"
                        />
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">{p.product_name}</span>
                          {!p.is_active && <span className="text-[9px] text-rose-500 font-bold uppercase">Discontinued</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-8">
                      {editingId === p.id ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={editForm.mfg_type}
                            onChange={(e) => setEditForm({ ...editForm, mfg_type: e.target.value })}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500"
                          >
                            <option value="自主">自主</option>
                            <option value="OEM">OEM</option>
                          </select>
                          <input
                            type="text"
                            value={editForm.product_category}
                            onChange={(e) => setEditForm({ ...editForm, product_category: e.target.value })}
                            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-white outline-none focus:border-emerald-500"
                            placeholder="カテゴリ"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                            <Layers size={10} className="text-slate-600" /> {p.mfg_type}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 italic px-2 border-l border-slate-700">{p.product_category}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-8 text-right">
                      {editingId === p.id ? (
                        <div className="inline-flex flex-col gap-2 p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                          <div className="flex items-center justify-end gap-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase">Per KG</label>
                            <input
                              type="number"
                              value={editForm.units_per_kg}
                              onChange={(e) => setEditForm({ ...editForm, units_per_kg: Number(e.target.value) })}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-right outline-none focus:border-emerald-500 w-20"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-3">
                            <label className="text-[9px] font-black text-slate-600 uppercase">Per CS</label>
                            <input
                              type="number"
                              value={editForm.units_per_cs}
                              onChange={(e) => setEditForm({ ...editForm, units_per_cs: Number(e.target.value) })}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white text-right outline-none focus:border-emerald-500 w-20"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-300">{p.units_per_kg}</span>
                            <span className="text-[9px] font-black text-slate-600 uppercase">pcs / kg</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-500">{p.units_per_cs}</span>
                            <span className="text-[9px] font-black text-slate-700 uppercase">pcs / cs</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-8 text-center">
                      {editingId === p.id ? (
                        <button
                          onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            editForm.is_active 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                        >
                          {editForm.is_active ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <div className="flex justify-center">
                          <div className={`w-2 h-2 rounded-full animate-pulse-slow ${p.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                        </div>
                      )}
                    </td>
                    <td className="py-6 px-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {editingId === p.id ? (
                          <>
                            <button onClick={handleSave} className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40">
                              <Check size={18} />
                            </button>
                            <button onClick={handleCancel} className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700">
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEdit(p)} 
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(p.id, p.product_name)}
                              className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/50 transition-all"
                            >
                              <Trash2 size={16} />
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

        {products.length === 0 && (
          <div className="p-32 text-center space-y-4">
            <div className="inline-flex p-6 rounded-full bg-slate-950 border border-slate-800 text-slate-800">
              <Package size={40} />
            </div>
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Product repository is currently empty</p>
          </div>
        )}
      </div>

      {/* Logic Warning Note */}
      <div className="flex items-start gap-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-3xl">
        <AlertCircle className="text-amber-500 shrink-0" size={20} />
        <div className="space-y-1">
          <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Master Data Integrity Notice</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            製品の「入数（pcs/kg, pcs/cs）」は製造計画および原価計算の基礎となります。変更を行うと、過去の歩留まり計算に影響を及ぼす可能性があります。
          </p>
        </div>
      </div>
    </div>
  );
}