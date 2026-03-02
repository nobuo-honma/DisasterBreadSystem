/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useRef, useCallback, memo } from 'react';
import {
  Plus, Save, Trash2, Package,
  UtensilsCrossed, Search, ChevronDown, Info, AlertTriangle
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
          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-right font-mono text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
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
        // BOM is fetched per product or globally if needed, here we mock it
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

  const filteredDestinations = useMemo(() => {
    const kw = destSearch.trim().toLowerCase();
    if (!kw) return destinations;
    return destinations.filter(d =>
      (d.dest_name || '').toLowerCase().includes(kw) ||
      (d.dest_code || '').toLowerCase().includes(kw)
    );
  }, [destinations, destSearch]);

  const selectedDestName = useMemo(
    () =>
      destinations.find(d => d.dest_code === orderHeader.destination_code)
        ?.dest_name ?? '出荷先を検索・選択',
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
    (id: string, flavorType: string, productName: string) => {
      const flavorObj = getFlavorsForProductName(productName).find(x => x.flavor === flavorType);
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
        <p className="text-slate-500 font-black animate-pulse tracking-widest">システムを起動中...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <AlertTriangle size={40} className="text-rose-500 mx-auto" />
          <p className="text-rose-400 font-bold">{fetchError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-xl transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen p-4 lg:p-10 bg-slate-950 text-slate-200">
      <div className="flex flex-col lg:flex-row gap-10">
        <div className="w-full lg:w-[60%] space-y-8">
          <header className="flex justify-between items-end border-b border-slate-800 pb-8">
            <div>
              <h1 className="text-3xl font-black text-white italic tracking-tighter">受注入力ターミナル</h1>
              <p className="text-[10px] text-orange-500 font-bold tracking-[0.2em] mt-2">BOM連動型受注管理システム / Ver 4.0</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-600 block font-black">受注伝票番号</span>
              <span className="text-xs font-mono text-slate-400">{orderHeader.order_code}</span>
            </div>
          </header>

          <section aria-label="基本情報" className="grid md:grid-cols-2 gap-6">
            <div className="relative" ref={destRef}>
              <label id="dest-label" className="text-[10px] font-black text-slate-500 mb-2 block">出荷先</label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isDestOpen}
                aria-labelledby="dest-label"
                onClick={() => setIsDestOpen(prev => !prev)}
                className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl text-sm text-white flex justify-between items-center cursor-pointer hover:border-orange-500 transition-all shadow-2xl focus:outline-none focus:border-orange-500"
              >
                <span className={orderHeader.destination_code ? 'text-white' : 'text-slate-600'}>{selectedDestName}</span>
                <ChevronDown size={18} className={`text-slate-600 transition-transform duration-200 ${isDestOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDestOpen && (
                <div role="listbox" className="absolute z-50 w-full mt-3 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
                    <Search size={16} className="text-slate-500 shrink-0" />
                    <input
                      autoFocus
                      type="search"
                      placeholder="名称またはコードで検索..."
                      value={destSearch}
                      onChange={e => setDestSearch(e.target.value)}
                      className="bg-transparent text-sm text-white outline-none w-full placeholder:text-slate-600"
                    />
                  </div>
                  <ul className="max-h-60 overflow-y-auto">
                    {filteredDestinations.length > 0 ? filteredDestinations.map(d => (
                      <li
                        key={d.id}
                        role="option"
                        aria-selected={orderHeader.destination_code === d.dest_code}
                        onClick={() => handleSelectDestination(d.dest_code)}
                        className="p-4 text-xs text-slate-400 hover:bg-orange-600 hover:text-white transition-colors cursor-pointer flex justify-between aria-selected:bg-orange-700 aria-selected:text-white"
                      >
                        <span>{d.dest_name}</span>
                        <span className="text-[10px] opacity-50 font-mono">{d.dest_code}</span>
                      </li>
                    )) : (
                      <li className="p-8 text-center text-xs text-slate-600">一致する出荷先が見つかりません</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="request_delivery_date" className="text-[10px] font-black text-slate-500 mb-2 block">希望納期</label>
              <input
                id="request_delivery_date"
                type="date"
                value={orderHeader.request_delivery_date}
                onChange={e => handleHeaderChange('request_delivery_date', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 p-5 rounded-3xl text-sm text-white outline-none focus:border-orange-500 transition-all"
              />
            </div>
          </section>

          <section aria-label="受注明細" className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 bg-slate-800/20 border-b border-slate-800 flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 tracking-widest flex items-center gap-2">
                <UtensilsCrossed size={14} className="text-orange-500" /> 受注明細
              </span>
              <button type="button" onClick={handleAddDetail} className="p-2 bg-slate-800 hover:bg-orange-600 text-white rounded-xl transition-all shadow-lg">
                <Plus size={20} />
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-[10px] text-slate-600 font-black">
                <tr>
                  <th className="py-5 px-8">製品名</th>
                  <th className="py-5 px-8">製造種類（味）</th>
                  <th className="py-5 px-8 w-32 text-right">数量(ケース)</th>
                  <th className="py-5 px-8 w-16"><span className="sr-only">操作</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orderDetails.map(detail => (
                  <OrderDetailRow
                    key={detail.id}
                    detail={detail}
                    uniqueProductNames={uniqueProductNames}
                    flavors={getFlavorsForProductName(detail.product_name)}
                    onProductChange={handleDetailProductChange}
                    onFlavorChange={handleDetailFlavorChange}
                    onQuantityChange={handleDetailQuantityChange}
                    onRemove={handleRemoveDetail}
                    canRemove={orderDetails.length > 1}
                  />
                ))}
              </tbody>
            </table>
          </section>

          <button
            type="button"
            onClick={handleSaveOrder}
            disabled={isSaving}
            className="w-full py-6 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-900 text-white rounded-[2rem] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-4"
          >
            <Save size={20} /> {isSaving ? '登録処理中...' : '受注を確定して登録する'}
          </button>
        </div>

        <aside aria-label="必要資源プレビュー" className="w-full lg:w-[40%]">
          <div className="sticky top-10 space-y-6">
            <div className="bg-slate-900 border-t-4 border-orange-500 p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-white flex items-center gap-3 italic">
                  <Package className="text-orange-500" size={20} /> 必要資源の予測
                </h2>
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
                  <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">自動計算中</span>
                </div>
              </div>

              {requiredItems.length > 0 ? (
                <div className="space-y-4">
                  {requiredItems.map(item => (
                    <div key={item.code} className="flex justify-between items-center p-4 bg-slate-950/50 border border-slate-800 rounded-2xl group hover:border-orange-500/30 transition-all shadow-inner">
                      <div className="space-y-1">
                        <div className="text-[9px] text-slate-600 font-black font-mono">CODE: {item.code}</div>
                        <div className="text-sm text-slate-100 font-bold">{item.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-black text-orange-500 tracking-tighter">{item.qty.toLocaleString()}</div>
                        <div className="text-[9px] text-slate-600 font-black uppercase">{item.unit}</div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-10 p-5 bg-orange-500/5 border border-orange-500/10 rounded-3xl flex items-start gap-4">
                    <Info size={18} className="text-orange-500 mt-1 shrink-0" />
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      この受注内容を実現するために必要な原材料・資材の理論値です。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center space-y-5">
                  <AlertTriangle size={24} className="text-slate-800 mx-auto" />
                  <p className="text-[10px] text-slate-600 font-black leading-loose tracking-widest">
                    製品を選択すると必要品目リストが表示されます
                  </p>
                </div>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-center shadow-xl">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">対象品目（SKU）数</span>
              <span className="text-xl font-mono font-black text-white">{requiredItems.length}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
