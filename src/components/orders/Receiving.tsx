/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { History, Plus, Check, X, Edit2, Trash2, Search, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { receivingService } from '../../services/receivingService';
import { masterService } from '../../services/masterService';
import { TReceiving, MItem } from '../../types';

export default function Receiving() {
  const [receivings, setReceivings] = useState<TReceiving[]>([]);
  const [itemsMaster, setItemsMaster] = useState<MItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TReceiving>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // データの初期取得
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [recData, itemData] = await Promise.all([
        receivingService.getReceivings(),
        masterService.getItems()
      ]);
      setReceivings(recData);
      setItemsMaster(itemData);
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 検索フィルタリング
  const filteredReceivings = useMemo(() => {
    return receivings.filter(r => 
      r.receiving_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [receivings, searchTerm]);

  // ハンドラー
  const handleEdit = (rec: TReceiving) => {
    setEditingId(rec.id);
    setEditForm({ ...rec });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editForm.item_code || (editForm.order_quantity ?? 0) <= 0) {
      alert("品目コードと予定数量を正しく入力してください。");
      return;
    }

    setIsSaving(true);
    try {
      // 実績数量に基づくステータスの自動更新ロジック (オプション)
      let finalStatus = editForm.status;
      if (editForm.actual_quantity !== undefined) {
        if (editForm.actual_quantity >= (editForm.order_quantity || 0)) {
          finalStatus = '入荷済';
        } else if (editForm.actual_quantity > 0) {
          finalStatus = '一部入荷';
        }
      }

      await receivingService.saveReceiving({ ...editForm, status: finalStatus });
      setEditingId(null);
      await fetchData();
    } catch (error) {
      alert("保存中にエラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この入荷記録を削除してもよろしいですか？この操作は取り消せません。")) return;
    try {
      // serviceにdeleteReceivingがあると想定
      // await receivingService.deleteReceiving(id);
      setReceivings(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      alert("削除に失敗しました。");
    }
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
      actual_quantity: 0,
      status: '未入荷' 
    });
  };

  if (loading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="text-emerald-500 animate-spin" size={32} />
      <div className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Synchronizing Inbound Data...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <History className="text-emerald-400" size={18} />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Supply Chain / Inbound Terminal</span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            入荷管理 <span className="text-slate-700 text-2xl font-light not-italic ml-2">Receiving Logs</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search code or items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
            />
          </div>
          <button
            onClick={handleAddNew}
            disabled={!!editingId}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-emerald-900/20 whitespace-nowrap active:scale-95"
          >
            <Plus size={16} /> New Registry
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/30 border border-slate-800/60 rounded-[2rem] overflow-hidden shadow-3xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 border-b border-slate-800">
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Receiving ID</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Item Component</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">ETA Schedule</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Order Qty</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actual Inflow</th>
                <th className="py-6 px-8 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredReceivings.map((r) => (
                <tr key={r.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
                  <td className="py-5 px-8">
                    {editingId === r.id ? (
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-emerald-500"
                      >
                        <option value="未入荷">未入荷</option>
                        <option value="一部入荷">一部入荷</option>
                        <option value="入荷済">入荷済</option>
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          r.status === '入荷済' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                          r.status === '一部入荷' ? 'bg-amber-500' : 'bg-slate-700'
                        }`} />
                        <span className={`text-[10px] font-black uppercase tracking-tight ${
                          r.status === '入荷済' ? 'text-emerald-500' : 
                          r.status === '一部入荷' ? 'text-amber-500' : 'text-slate-500'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-5 px-8">
                    <span className="text-xs font-mono font-bold text-slate-400">{r.receiving_code}</span>
                  </td>
                  <td className="py-5 px-8">
                    {editingId === r.id ? (
                      <select
                        value={editForm.item_code}
                        onChange={(e) => setEditForm({ ...editForm, item_code: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 w-full"
                      >
                        <option value="">Select Item...</option>
                        {itemsMaster.map(item => (
                          <option key={item.item_code} value={item.item_code}>{item.item_name} ({item.item_code})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-slate-200 block">{itemsMaster.find(i => i.item_code === r.item_code)?.item_name || 'Unknown Item'}</span>
                        <span className="text-[10px] font-mono text-slate-600">{r.item_code}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-5 px-8">
                    {editingId === r.id ? (
                      <input
                        type="date"
                        value={editForm.scheduled_date}
                        onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                      />
                    ) : (
                      <span className="text-xs font-mono text-slate-400">{r.scheduled_date}</span>
                    )}
                  </td>
                  <td className="py-5 px-8 text-right">
                    {editingId === r.id ? (
                      <input
                        type="number"
                        value={editForm.order_quantity}
                        onChange={(e) => setEditForm({ ...editForm, order_quantity: Number(e.target.value) })}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white text-right outline-none focus:border-emerald-500 w-28 font-mono"
                      />
                    ) : (
                      <span className="text-sm font-mono font-bold text-slate-400 italic">{r.order_quantity.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-5 px-8 text-right">
                    {editingId === r.id ? (
                      <input
                        type="number"
                        value={editForm.actual_quantity}
                        onChange={(e) => setEditForm({ ...editForm, actual_quantity: Number(e.target.value) })}
                        className="bg-slate-950 border border-emerald-500/30 rounded-xl px-4 py-2 text-xs text-emerald-400 text-right outline-none focus:border-emerald-500 w-28 font-mono shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                      />
                    ) : (
                      <span className={`text-sm font-mono font-black ${r.actual_quantity ? 'text-white' : 'text-slate-800'}`}>
                        {r.actual_quantity?.toLocaleString() || '---'}
                      </span>
                    )}
                  </td>
                  <td className="py-5 px-8">
                    <div className="flex items-center justify-center gap-4">
                      {editingId === r.id ? (
                        <>
                          <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                          >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          </button>
                          <button onClick={handleCancel} className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEdit(r)} 
                            className="p-2 text-slate-600 hover:text-emerald-400 hover:bg-emerald-400/5 rounded-lg transition-all group-hover:scale-110"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(r.id)}
                            className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/5 rounded-lg transition-all group-hover:scale-110"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReceivings.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Filter size={40} className="text-slate-500" />
                      <p className="text-xs font-black uppercase tracking-[0.4em]">No Logs Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-3 px-8 py-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[1.5rem]">
        <AlertCircle size={16} className="text-emerald-500 shrink-0" />
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
          入荷実績数量（Actual Inflow）を保存すると、システム全体の在庫バランスに即時反映されます。
          納品書との照合を必ず行い、差異がある場合は備考欄（拡張予定）に記録してください。
        </p>
      </div>
    </div>
  );
}