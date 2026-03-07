/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Layers, Plus, Save, Trash2, Package, Box, ArrowRight, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { masterService } from '../../services/masterService';
import { MProduct, MItem, MBom } from '../../types';

export default function BOMMaster() {
  const [products, setProducts] = useState<MProduct[]>([]);
  const [items, setItems] = useState<MItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductCode, setSelectedProductCode] = useState<string>('');
  const [bomEntries, setBomEntries] = useState<Partial<MBom>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [pData, iData] = await Promise.all([
          masterService.getProducts(),
          masterService.getItems()
        ]);
        setProducts(pData);
        setItems(iData);
      } catch (error) {
        console.error("Failed to fetch master data", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const fetchBOM = async (product: MProduct) => {
    setSelectedProductId(product.id);
    setSelectedProductCode(product.product_code);
    const data = await masterService.getBOM(product.product_code);
    setBomEntries(data);
    // モバイル時は選択後に自動スクロール
    if (window.innerWidth < 1024) {
      document.getElementById('bom-editor')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveBOM = async () => {
    if (!selectedProductCode) return;
    
    // バリデーション: 未入力チェック
    const hasInvalidEntry = bomEntries.some(e => !e.item_code || (e.usage_rate ?? 0) <= 0);
    if (hasInvalidEntry) {
      alert('品目選択と数量(0より大きい値)を正しく入力してください');
      return;
    }

    const cleanEntries = bomEntries.filter(e => e.item_code && e.usage_rate && e.usage_rate > 0);
    await masterService.saveBOM(selectedProductCode, cleanEntries as MBom[]);
    alert('BOM設定を更新しました');
    const product = products.find(p => p.id === selectedProductId);
    if (product) fetchBOM(product);
  };

  const addRow = () => {
    if (!selectedProductCode) return;
    setBomEntries([{ product_code: selectedProductCode, item_code: '', usage_rate: 0 }, ...bomEntries]);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Parsing Configuration Tree...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-slate-800 pb-6 md:pb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="text-indigo-400" size={16} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Data / Composition Recipe</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white italic">BOM管理 <span className="text-slate-600 text-lg md:text-xl font-light">/ 構成表</span></h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Product Selection */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl">
            <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Package size={14} /> 1. Select Product
            </h2>
            <div className="space-y-2 max-h-[400px] lg:max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => fetchBOM(p)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group ${selectedProductId === p.id
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                    : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="min-w-0">
                      <div className={`text-[9px] font-mono font-black mb-1 truncate ${selectedProductId === p.id ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {p.product_code}
                      </div>
                      <div className="text-sm font-black text-slate-200 truncate group-hover:text-white transition-colors">
                        {p.product_name}
                      </div>
                    </div>
                    <ChevronRight size={18} className={`flex-shrink-0 transition-transform ${selectedProductId === p.id ? 'text-indigo-500 translate-x-1' : 'text-slate-700'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right: BOM Editor */}
        <main id="bom-editor" className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedProductId ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
              >
                <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-800/20 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      <Box size={16} className="text-indigo-400" />
                      構成品目エディタ
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-tighter md:tracking-widest">Target: {selectedProductCode}</p>
                  </div>
                  <button
                    onClick={addRow}
                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                  >
                    <Plus size={14} /> <span className="hidden sm:inline">Add Item</span>
                  </button>
                </div>

                <div className="flex-1 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {/* Desktop Table View */}
                  <table className="w-full text-left hidden md:table">
                    <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800">
                      <tr>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">使用品目</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40 text-right">必要数量</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-20 text-center">単位</th>
                        <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {bomEntries.map((entry, index) => (
                        <BomRow 
                          key={index} 
                          index={index} 
                          entry={entry} 
                          items={items} 
                          setBomEntries={setBomEntries} 
                          bomEntries={bomEntries} 
                        />
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-slate-800/50">
                    {bomEntries.map((entry, index) => (
                      <div key={index} className="p-4 space-y-3 bg-slate-950/30">
                        <div className="flex justify-between items-start">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Ingredient Item</label>
                          <button onClick={() => setBomEntries(bomEntries.filter((_, i) => i !== index))} className="text-rose-500/50">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <select
                          value={entry.item_code}
                          onChange={(e) => {
                            const newEntries = [...bomEntries];
                            newEntries[index].item_code = e.target.value;
                            setBomEntries(newEntries);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 appearance-none"
                        >
                          <option value="">品目を選択...</option>
                          {items.map(i => (
                            <option key={i.id} value={i.item_code}>{i.item_code} : {i.item_name}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Quantity</label>
                            <input
                              type="number"
                              step="0.001"
                              value={entry.usage_rate}
                              onChange={(e) => {
                                const newEntries = [...bomEntries];
                                newEntries[index].usage_rate = Number(e.target.value);
                                setBomEntries(newEntries);
                              }}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1">Unit</label>
                            <div className="h-[46px] flex items-center px-4 bg-slate-900/50 border border-transparent rounded-xl text-slate-400 text-sm font-bold font-mono">
                              {items.find(i => i.item_code === entry.item_code)?.unit || '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 border-t border-slate-800 bg-slate-900/50">
                  <button
                    onClick={handleSaveBOM}
                    disabled={bomEntries.length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Save Recipe Data
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[400px] md:min-h-[500px] border-2 border-dashed border-slate-800/50 rounded-3xl flex flex-col items-center justify-center text-slate-600 space-y-4 px-6 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center">
                  <Layers size={32} className="opacity-20 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest opacity-40">Composition Editor</p>
                  <p className="text-[10px] font-medium text-slate-500 mt-1 max-w-[200px]">製品を選択して、構成レシピ（BOM）の編集を開始してください。</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// デスクトップ用行コンポーネント
function BomRow({ index, entry, items, setBomEntries, bomEntries }: any) {
  return (
    <tr className="group hover:bg-slate-800/10">
      <td className="py-4 px-6">
        <select
          value={entry.item_code}
          onChange={(e) => {
            const newEntries = [...bomEntries];
            newEntries[index].item_code = e.target.value;
            setBomEntries(newEntries);
          }}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
        >
          <option value="">品目を選択...</option>
          {items.map((i: any) => (
            <option key={i.id} value={i.item_code}>{i.item_code} : {i.item_name}</option>
          ))}
        </select>
      </td>
      <td className="py-4 px-6 text-right">
        <input
          type="number"
          step="0.001"
          value={entry.usage_rate}
          onChange={(e) => {
            const newEntries = [...bomEntries];
            newEntries[index].usage_rate = Number(e.target.value);
            setBomEntries(newEntries);
          }}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white text-right font-mono outline-none focus:border-indigo-500 transition-colors"
        />
      </td>
      <td className="py-4 px-6 text-center text-[10px] font-bold text-slate-500 font-mono uppercase">
        {items.find((i: any) => i.item_code === entry.item_code)?.unit || '-'}
      </td>
      <td className="py-4 px-6 text-center">
        <button
          onClick={() => setBomEntries(bomEntries.filter((_: any, i: number) => i !== index))}
          className="text-slate-600 hover:text-rose-500 transition-colors p-2"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}