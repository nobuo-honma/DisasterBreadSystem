/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import {
  Plus, Save, Trash2, Package,
  UtensilsCrossed, Search, ChevronDown, Info, AlertTriangle, Loader2
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import { masterService } from '../../services/masterService';
import { MDestination, MProduct, MBom, MItem } from '../../types';

// ============================================================
// 型定義
// ============================================================
interface OrderHeader {
  order_code: string;
  order_date: string;
  destination_code: string;
  request_delivery_date: string;
  remarks: string;
}

interface OrderDetail {
  id: string;
  product_name: string;
  product_code: string;
  flavor_type: string;
  quantity_cs: number;
}

interface RequiredItem {
  name: string;
  code: string;
  qty: number;
  unit: string;
}

interface FlavorOption {
  code: string;
  flavor: string;
}

// ============================================================
// ユーティリティ関数
// ============================================================
const generateOrderCode = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${date}-${rand}`;
};

const getTodayString = (): string => new Date().toISOString().split('T')[0];

const createEmptyDetail = (): OrderDetail => ({
  id: crypto.randomUUID(),
  product_name: '',
  product_code: '',
  flavor_type: '',
  quantity_cs: 1,
});

const createInitialHeader = (): OrderHeader => ({
  order_code: generateOrderCode(),
  order_date: getTodayString(),
  destination_code: '',
  request_delivery_date: getTodayString(),
  remarks: '',
});

// ============================================================
// 明細行サブコンポーネント
// ============================================================
interface OrderDetailRowProps {
  detail: OrderDetail;
  uniqueProductNames: string[];
  flavors: FlavorOption[];
  onProductChange: (id: string, productName: string) => void;
  onFlavorChange: (id: string, flavorType: string, productName: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

const OrderDetailRow = memo(function OrderDetailRow({
  detail,
  uniqueProductNames,
  flavors,
  onProductChange,
  onFlavorChange,
  onQuantityChange,
  onRemove,
  canRemove,
}: OrderDetailRowProps) {
  return (
    <tr className="group hover:bg-slate-800/10 transition-colors">
      <td className="py-4 px-8">
        <select
          value={detail.product_name}
          onChange={e => onProductChange(detail.id, e.target.value)}
          aria-label="製品を選択"
          className="w-full bg-transparent text-sm text-white outline-none cursor-pointer appearance-none"
        >
          <option value="" className="bg-slate-900 text-slate-500">製品を選択してください</option>
          {uniqueProductNames.map(n => (
            <option key={n} value={n} className="bg-slate-900">{n}</option>
          ))}
        </select>
      </td>
      <td className="py-4 px-8">
        <select
          value={detail.flavor_type}
          disabled={!detail.product_name}
          onChange={e => onFlavorChange(detail.id, e.target.value, detail.product_name)}
          aria-label="製造種類（味）を選択"
          className="w-full bg-transparent text-xs text-orange-400 font-bold outline-none cursor-pointer appearance-none disabled:opacity-20"
        >
          <option value="" className="bg-slate-900 text-slate-500">味を選択してください</option>
          {flavors.map(f => (
            <option key={f.code} value={f.flavor} className="bg-slate-900">{f.flavor}</option>
          ))}
        </select>
      </td>
      <td className="py-4 px-8">
        <input
          type="number"
          min="1"
          value={detail.quantity_cs}
          onChange={e => onQuantityChange(detail.id, Number(e.target.value))}
          aria-label="数量（ケース）"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-right font-mono text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
        />
      </td>
      <td className="py-4 px-8 text-center">
        <button
          type="button"
          onClick={() => onRemove(detail.id)}
          disabled={!canRemove}
          aria-label="この明細行を削除"
          className="text-slate-700 hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors focus:outline-none focus:text-rose-500"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
});

// ============================================================
// メインコンポーネント
// ============================================================
export default function Orders() {
  const [destinations, setDestinations] = useState<MDestination[]>([]);
  const [productsMaster, setProductsMaster] = useState<MProduct[]>([]);
  const [bomMaster, setBomMaster] = useState<MBom[]>([]);
  const [itemsMaster, setItemsMaster] = useState<MItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isDestOpen, setIsDestOpen] = useState(false);
  const [destSearch, setDestSearch] = useState('');
  const destRef = useRef<HTMLDivElement>(null);

  const [orderHeader, setOrderHeader] = useState<OrderHeader>(createInitialHeader);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>(() => [createEmptyDetail()]);

  // マスタデータの初期化
  useEffect(() => {
    const init = async () => {
      try {
        const [resD, resP, resI] = await Promise.all([
          masterService.getDestinations(),
          masterService.getProducts(),
          masterService.getItems(),
        ]);
        setDestinations(resD);
        setProductsMaster(resP);
        setItemsMaster(resI);
        setBomMaster([]);
      } catch (err) {
        setFetchError('予期しないエラーが発生しました。ページを再読み込みしてください。');
      } finally {
        setLoading(false);
      }
    };

    init();

    const handleClickOutside = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setIsDestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 出荷先フィルタ
  const filteredDestinations = useMemo(() => {
    const kw = destSearch.trim().toLowerCase();
    if (!kw) return destinations;
    return destinations.filter(d =>
      (d.destination_name || '').toLowerCase().includes(kw) ||
      (d.destination_code || '').toLowerCase().includes(kw)
    );
  }, [destinations, destSearch]);

  const selectedDestName = useMemo(
    () =>
      destinations.find(d => d.destination_code === orderHeader.destination_code)
        ?.destination_name ?? '出荷先を検索・選択',
    [orderHeader.destination_code, destinations]
  );

  const uniqueProductNames = useMemo(
    () => Array.from(new Set(productsMaster.map(p => p.product_name))),
    [productsMaster]
  );

  const getFlavorsForProductName = useCallback(
    (name: string): FlavorOption[] =>
      productsMaster
        .filter(p => p.product_name === name)
        .map(p => ({ code: p.product_code, flavor: p.mfg_type || '標準' })),
    [productsMaster]
  );

  // リアルタイム必要資源計算
  const requiredItems = useMemo((): RequiredItem[] => {
    const summary = new Map<string, RequiredItem>();
    for (const detail of orderDetails) {
      if (!detail.product_code) continue;
      for (const bom of bomMaster.filter(b => b.product_code === detail.product_code)) {
        const totalUsage = (bom.usage_rate || 0) * detail.quantity_cs;
        const existing = summary.get(bom.item_code);
        if (existing) {
          existing.qty += totalUsage;
        } else {
          const itemInfo = itemsMaster.find(i => i.item_code === bom.item_code);
          summary.set(bom.item_code, {
            name: itemInfo?.item_name ?? '不明な品目',
            code: bom.item_code,
            qty: totalUsage,
            unit: bom.unit || 'kg',
          });
        }
      }
    }
    return Array.from(summary.values());
  }, [orderDetails, bomMaster, itemsMaster]);

  // ハンドラー
  const handleSelectDestination = useCallback((code: string) => {
    setOrderHeader(prev => ({ ...prev, destination_code: code }));
    setIsDestOpen(false);
    setDestSearch('');
  }, []);

  const handleHeaderChange = useCallback(
    <K extends keyof OrderHeader>(key: K, value: OrderHeader[K]) => {
      setOrderHeader(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleAddDetail = useCallback(() => {
    setOrderDetails(prev => [...prev, createEmptyDetail()]);
  }, []);

  const handleRemoveDetail = useCallback((id: string) => {
    setOrderDetails(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleDetailProductChange = useCallback((id: string, productName: string) => {
    setOrderDetails(prev =>
      prev.map(d =>
        d.id === id
          ? { ...d, product_name: productName, product_code: '', flavor_type: '' }
          : d
      )
    );
  }, []);

  const handleDetailFlavorChange = useCallback(
    async (id: string, flavorType: string, productName: string) => {
      const flavorObj = getFlavorsForProductName(productName).find(x => x.flavor === flavorType);
      if (flavorObj) {
        try {
          const bom = await masterService.getBOM(flavorObj.code);
          setBomMaster(prev => {
            const filtered = prev.filter(b => b.product_code !== flavorObj.code);
            return [...filtered, ...bom];
          });
        } catch {
          console.error('BOM取得失敗');
        }
      }
      setOrderDetails(prev =>
        prev.map(d =>
          d.id === id
            ? { ...d, flavor_type: flavorType, product_code: flavorObj?.code ?? '' }
            : d
        )
      );
    },
    [getFlavorsForProductName]
  );

  const handleDetailQuantityChange = useCallback((id: string, quantity: number) => {
    const safeQty = Math.max(1, isNaN(quantity) ? 1 : quantity);
    setOrderDetails(prev =>
      prev.map(d => (d.id === id ? { ...d, quantity_cs: safeQty } : d))
    );
  }, []);

  const handleSaveOrder = useCallback(async () => {
    if (!orderHeader.destination_code) {
      alert('出荷先を選択してください。');
      return;
    }
    if (orderDetails.some(d => !d.product_code)) {
      alert('製品と味を正しく選択してください。');
      return;
    }

    setIsSaving(true);
    try {
      await orderService.saveOrder(orderHeader, orderDetails);
      alert('受注データを正常に登録しました。');
      setOrderDetails([createEmptyDetail()]);
      setOrderHeader(createInitialHeader());
    } catch (err) {
      alert('予期しないエラーが発生しました。');
    } finally {
      setIsSaving(false);
    }
  }, [orderHeader, orderDetails]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <p className="text-slate-500 font-black animate-pulse tracking-widest uppercase">Initializing System...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
        <div className="text-center space-y-6">
          <AlertTriangle size={48} className="text-rose-500 mx-auto" />
          <p className="text-rose-400 font-black tracking-tight text-xl">{fetchError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-black rounded-2xl transition-all shadow-xl"
          >
            RETRY SYSTEM BOOT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen p-4 lg:p-10 bg-slate-950 text-slate-200 font-sans selection:bg-orange-500/30">
      <div className="flex flex-col lg:flex-row gap-10">

        {/* Left Section: Order Input */}
        <div className="w-full lg:w-[60%] space-y-10 animate-in fade-in duration-500">
          <header className="flex justify-between items-end border-b border-slate-800 pb-10">
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Order Terminal</h1>
              <p className="text-[10px] text-orange-500 font-black tracking-[0.3em] mt-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> BOM-LINKED SYSTEM / VER 4.0
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-600 block font-black uppercase tracking-widest mb-1">Sheet ID</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">{orderHeader.order_code}</span>
            </div>
          </header>

          {/* Basic Info */}
          <section aria-label="基本情報" className="grid md:grid-cols-2 gap-8">
            <div className="relative" ref={destRef}>
              <label id="dest-label" className="text-[10px] font-black text-slate-500 mb-3 block uppercase tracking-widest">Destination</label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isDestOpen}
                aria-labelledby="dest-label"
                onClick={() => setIsDestOpen(prev => !prev)}
                className="w-full bg-slate-900 border border-slate-800 p-6 rounded-3xl text-sm text-white flex justify-between items-center cursor-pointer hover:border-orange-500 transition-all shadow-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <span className={orderHeader.destination_code ? 'text-white font-bold' : 'text-slate-600'}>{selectedDestName}</span>
                <ChevronDown size={18} className={`text-slate-600 transition-transform duration-300 ${isDestOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDestOpen && (
                <div role="listbox" className="absolute z-50 top-full left-0 mt-3 w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={destSearch}
                        onChange={e => setDestSearch(e.target.value)}
                        placeholder="出荷先を検索..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-all"
                        autoFocus
                      />
                    </div>
                  </div>
                  <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredDestinations.map(d => (
                      <li key={d.destination_code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={orderHeader.destination_code === d.destination_code}
                          onClick={() => handleSelectDestination(d.destination_code)}
                          className="w-full text-left px-6 py-4 text-sm hover:bg-slate-800 transition-colors flex justify-between items-center group"
                        >
                          <span className="font-bold text-slate-300 group-hover:text-white">{d.destination_name}</span>
                          <span className="text-[10px] font-mono text-slate-600 group-hover:text-orange-500">{d.destination_code}</span>
                        </button>
                      </li>
                    ))}
                    {filteredDestinations.length === 0 && (
                      <li className="px-6 py-10 text-center text-slate-600 text-xs font-black uppercase italic">No Matches Found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="request_delivery_date" className="text-[10px] font-black text-slate-500 mb-3 block uppercase tracking-widest">Delivery Deadline</label>
              <input
                id="request_delivery_date"
                type="date"
                value={orderHeader.request_delivery_date}
                onChange={e => handleHeaderChange('request_delivery_date', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-6 rounded-3xl text-sm text-white font-mono outline-none focus:border-orange-500 transition-all shadow-2xl"
              />
            </div>
          </section>

          {/* Details Table */}
          <section aria-label="受注明細" className="bg-slate-900/40 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-3xl backdrop-blur-sm">
            <div className="p-8 bg-slate-800/20 border-b border-slate-800 flex justify-between items-center">
              <span className="text-[11px] font-black text-slate-400 tracking-[0.2em] flex items-center gap-3 uppercase italic">
                <UtensilsCrossed size={16} className="text-orange-500" /> Order Details
              </span>
              <button type="button" onClick={handleAddDetail} className="p-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition-all shadow-xl active:scale-95">
                <Plus size={20} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/30 border-b border-slate-800">
                    <th className="py-5 px-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Product Name</th>
                    <th className="py-5 px-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Flavor Type</th>
                    <th className="py-5 px-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] text-right w-40">Qty (CS)</th>
                    <th className="py-5 px-8 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {orderDetails.map(detail => (
                    <OrderDetailRow
                      key={detail.id}
                      detail={detail}
                      uniqueProductNames={uniqueProductNames}
                      flavors={detail.product_name ? getFlavorsForProductName(detail.product_name) : []}
                      onProductChange={handleDetailProductChange}
                      onFlavorChange={handleDetailFlavorChange}
                      onQuantityChange={handleDetailQuantityChange}
                      onRemove={handleRemoveDetail}
                      canRemove={orderDetails.length > 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="w-full py-7 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white rounded-4xl font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(234,88,12,0.2)] transition-all flex items-center justify-center gap-4 group active:scale-[0.98]"
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={20} className="group-hover:rotate-12 transition-transform" />}
            <span>{isSaving ? 'Processing...' : 'Commit Order'}</span>
          </button>
        </div>

        {/* Right Section: Resource Preview */}
        <aside aria-label="必要資源プレビュー" className="w-full lg:w-[40%] animate-in slide-in-from-right duration-700">
          <div className="sticky top-10 space-y-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-10 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none italic font-black text-9xl">BOM</div>

              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-xl font-black text-white flex items-center gap-4 italic uppercase tracking-tighter">
                  <Package className="text-orange-500" size={24} /> Material Preview
                </h2>
                {requiredItems.length > 0 && (
                  <span className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black text-emerald-500 tracking-widest uppercase animate-pulse">
                    Live Calculating
                  </span>
                )}
              </div>

              {requiredItems.length > 0 ? (
                <div className="space-y-4 relative z-10">
                  {requiredItems.map(item => (
                    <div key={item.code} className="flex justify-between items-center p-5 bg-slate-950/40 border border-slate-800 rounded-[1.25rem] group hover:border-orange-500/40 transition-all shadow-inner">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.code}</p>
                        <p className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-mono font-black text-white">{item.qty.toLocaleString()}</span>
                        <span className="text-[10px] font-black text-slate-600 ml-2 uppercase tracking-widest">{item.unit}</span>
                      </div>
                    </div>
                  ))}

                  <div className="mt-12 p-6 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-5">
                    <div className="p-2 bg-orange-500/10 rounded-lg"><Info size={20} className="text-orange-500 shrink-0" /></div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      この受注内容を実現するために必要な原材料・資材の理論値です。
                      実際の在庫状況は <span className="text-orange-500/80 font-bold underline cursor-pointer">在庫管理ターミナル</span> で確認してください。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-32 text-center space-y-6 relative z-10">
                  <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center mx-auto border border-slate-800 shadow-2xl">
                    <AlertTriangle size={32} className="text-slate-800" />
                  </div>
                  <p className="text-[11px] text-slate-600 font-black leading-loose tracking-[0.4em] uppercase italic">
                    Waiting for product selection...
                  </p>
                </div>
              )}
            </div>

            {/* Metrics Card */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl flex flex-col justify-between shadow-xl">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Total SKUs</span>
                <span className="text-3xl font-mono font-black text-white leading-none">{requiredItems.length}</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl flex flex-col justify-between shadow-xl">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Detail Rows</span>
                <span className="text-3xl font-mono font-black text-orange-500 leading-none">{orderDetails.length}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ea580c; }
      `}</style>
    </div>
  );
}