/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Package, Plus, Save, Trash2, Edit2, Check, X } from 'lucide-react';
import { masterService } from '../../services/masterService';
import { MProduct } from '../../types';

export default function ProductsMaster() {
  const [products, setProducts] = useState<MProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MProduct>>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const data = await masterService.getProducts();
    setProducts(data);
    setLoading(false);
  };

  const handleEdit = (product: MProduct) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    await masterService.saveProduct(editForm);
    setEditingId(null);
    fetchProducts();
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`;
    setEditingId(newId);
    setEditForm({ id: newId, product_code: '', product_name: '', unit_cs_to_p: 1, is_active: true });
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">Accessing Product Repository...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-emerald-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Finished Goods</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">製品マスタ <span className="text-slate-600 text-xl font-light">/ Products</span></h1>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
        >
          <Plus size={16} /> Add New Product
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Name</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Unit (CS/P)</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {products.map((p) => (
              <tr key={p.id} className="group hover:bg-slate-800/10 transition-colors">
                <td className="py-4 px-6">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editForm.product_code}
                      onChange={(e) => setEditForm({ ...editForm, product_code: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500 w-full"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-emerald-500">{p.product_code}</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editForm.product_name}
                      onChange={(e) => setEditForm({ ...editForm, product_name: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-200">{p.product_name}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-right">
                  {editingId === p.id ? (
                    <input
                      type="number"
                      value={editForm.unit_cs_to_p}
                      onChange={(e) => setEditForm({ ...editForm, unit_cs_to_p: Number(e.target.value) })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right outline-none focus:border-emerald-500 w-24"
                    />
                  ) : (
                    <span className="text-sm font-mono text-slate-400">{p.unit_cs_to_p}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-center">
                  {editingId === p.id ? (
                    <select
                      value={editForm.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${p.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    {editingId === p.id ? (
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
                        <button onClick={() => handleEdit(p)} className="text-slate-500 hover:text-white transition-colors">
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
