'use client';

import { 
  Settings, 
  Package, 
  Truck, 
  Users, 
  Database, 
  ShieldCheck, 
  Layers, 
  Box, 
  FileSpreadsheet 
} from 'lucide-react';
import Link from 'next/link';

const masterMenus = [
  { 
    name: '製品マスタ', 
    desc: '販売対象となる完成品のコード・規格・賞味期限設定', 
    href: '/masters/products', 
    icon: Package, 
    color: 'text-emerald-400',
    bgColor: 'group-hover:bg-emerald-500/10'
  },
  { 
    name: '品目マスタ', 
    desc: '原材料・包装資材など、製造に使用するすべての部材管理', 
    href: '/masters/items', 
    icon: Box, 
    color: 'text-blue-400',
    bgColor: 'group-hover:bg-blue-500/10'
  },
  { 
    name: 'BOM管理', 
    desc: '部品構成表。製品1つあたりに必要な品目と数量の定義', 
    href: '/masters/bom', 
    icon: Layers, 
    color: 'text-indigo-400',
    bgColor: 'group-hover:bg-indigo-500/10'
  },
  { 
    name: '取引先マスタ', 
    desc: '出荷先・仕入先・配送ルート情報の管理', 
    href: '/masters/destinations', 
    icon: Truck, 
    color: 'text-orange-400',
    bgColor: 'group-hover:bg-orange-500/10'
  },
  { 
    name: 'ユーザー管理', 
    desc: 'システム利用者の権限設定およびログイン情報の管理', 
    href: '/masters/users', 
    icon: Users, 
    color: 'text-purple-400',
    bgColor: 'group-hover:bg-purple-500/10'
  },
  { 
    name: 'システムログ', 
    desc: 'データの更新・削除履歴、ログイン情報の監査', 
    href: '/masters/logs', 
    icon: FileSpreadsheet, 
    color: 'text-slate-400',
    bgColor: 'group-hover:bg-slate-500/10'
  },
];

export default function MastersPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-800 pb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-emerald-500" size={16} />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Master Data Hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            マスタ管理
          </h1>
          <p className="text-slate-500 font-bold mt-2">
            システムの基盤となる静的データを定義します。
          </p>
        </div>
      </div>

      {/* CARD GRID */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {masterMenus.map((item) => {
          const Icon = item.icon;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`group relative bg-slate-900/40 border border-slate-800 p-8 rounded-3xl transition-all duration-500 hover:border-slate-600 hover:shadow-2xl hover:shadow-emerald-900/10 ${item.bgColor}`}
            >
              <div className={`mb-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 w-fit transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${item.color}`}>
                <Icon size={28} />
              </div>
              
              <h3 className="text-xl font-black text-white mb-3 group-hover:text-emerald-400 transition-colors">
                {item.name}
              </h3>
              
              <p className="text-xs text-slate-500 font-bold leading-relaxed mb-8">
                {item.desc}
              </p>

              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-emerald-500 transition-colors">
                Launch Console
                <div className="ml-2 w-4 h-[1px] bg-slate-800 group-hover:bg-emerald-500 transition-all group-hover:w-8"></div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* SYSTEM ARCHITECTURE NOTE */}
      <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/10 p-6 flex items-start gap-4">
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-500">
          <Settings size={20} className="animate-spin-slow" />
        </div>
        <div>
          <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Data Integrity Protocol</h4>
          <p className="text-[11px] text-slate-500 font-bold leading-relaxed italic">
            製品・品目・BOMは密接に関連しています。品目コードの変更はBOMおよび在庫計算に即座に反映されるため、更新の際は最新の注意を払ってください。
          </p>
        </div>
      </div>

    </div>
  );
}