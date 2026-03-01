'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { Package, Plus, Save, Edit3, ShieldCheck } from 'lucide-react';
// エラーに基づき TProduct から MProduct に修正
import type { MProduct } from '@/types/database';

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    product_code: '',
    product_name: '',
    specification: '',
    unit_cs_to_p: 1,
    is_active: true,
  });

  // クライアントをメモ化
  const supabase = useMemo(() => createClient(), []);

  // データ取得
  const fetchProducts = async () => {
    if (!supabase) return; // 型ガード

    setLoading(true);
    const { data } = await supabase
      .from('m_products')
      .select('*')
      .order('product_code', { ascending: true });
    setProducts(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [supabase]);

  // 保存処理
  const handleSave = async () => {
    if (!supabase) return; // 型ガード
    if (!formData.product_code || !formData.product_name) return;

    if (editingId) {
      await supabase.from('m_products').update(formData).eq('id', editingId);
    } else {
      await supabase.from('m_products').insert([formData]);
    }

    setEditingId(null);
    setFormData({ product_code: '', product_name: '', specification: '', unit_cs_to_p: 1, is_active: true });
    fetchProducts();
  };

  if (loading) return (
    <div className="p-10 text-center text-slate-500 font-black animate-pulse uppercase tracking-[0.3em] text-xs">
      Loading Master Data...
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="text-emerald-500" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Inventory Units</span>
          </div>
          <h1 className="text-3xl font-black text-white italic">製品マスタ</h1>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">

        {/* 左側: 登録・編集フォーム */}
        <section className="lg:col-span-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sticky top-8 shadow-2xl">
            <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Plus size={14} /> {editingId ? 'Edit Product' : 'Create New Product'}
            </h2>

            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">製品コード</label>
                <input
                  type="text"
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500 outline-none transition-all font-mono"
                  placeholder="EX: PRD-001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">製品名称</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">規格</label>
                  <input
                    type="text"
                    value={formData.specification}
                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">入数 (P/CS)</label>
                  <input
                    type="number"
                    value={formData.unit_cs_to_p}
                    onChange={(e) => setFormData({ ...formData, unit_cs_to_p: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white outline-none text-right font-mono focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Save size={16} /> {editingId ? 'Update Master' : 'Register Product'}
              </button>

              {editingId && (
                <button
                  onClick={() => { setEditingId(null); setFormData({ product_code: '', product_name: '', specification: '', unit_cs_to_p: 1, is_active: true }); }}
                  className="w-full border border-slate-800 text-slate-500 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all mt-2"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 右側: 一覧リスト */}
        <section className="lg:col-span-8">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">Status</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code / Name</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unit Info</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((p) => (
                  <tr key={p.id} className="group hover:bg-slate-800/20 transition-all">
                    <td className="py-6 px-6 text-center">
                      <div className={`w-2 h-2 rounded-full mx-auto ${p.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                    </td>
                    <td className="py-6 px-6">
                      <div className="text-xs font-mono font-black text-emerald-500 mb-1">{p.product_code}</div>
                      <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{p.product_name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 font-bold">{p.specification || 'No Spec'}</div>
                    </td>
                    <td className="py-6 px-6 text-right">
                      <span className="text-xs font-mono text-slate-300 font-bold">{p.unit_cs_to_p}</span>
                      <span className="ml-2 text-[9px] text-slate-500 font-black uppercase">pcs / cs</span>
                    </td>
                    <td className="py-6 px-6 text-center">
                      <button
                        onClick={() => { setEditingId(p.id); setFormData(p); }}
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