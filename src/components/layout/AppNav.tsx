/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  LayoutDashboard, Package, Box, Layers, MapPin, 
  Users, ShoppingCart, Truck, History, LogOut, Factory, Menu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AppNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AppNav({ activeTab, onTabChange }: AppNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Main' },
    { id: 'inventory', label: 'Inventory', icon: Package, category: 'Operations' },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, category: 'Operations' },
    { id: 'manufacturing', label: 'Manufacturing', icon: Factory, category: 'Operations' },
    { id: 'shipping', label: 'Shipping', icon: Truck, category: 'Operations' },
    { id: 'receiving', label: 'Receiving', icon: History, category: 'Operations' },
    { id: 'products', label: 'Products', icon: Package, category: 'Master Data' },
    { id: 'items', label: 'Items', icon: Box, category: 'Master Data' },
    { id: 'bom', label: 'BOM', icon: Layers, category: 'Master Data' },
    { id: 'destinations', label: 'Destinations', icon: MapPin, category: 'Master Data' },
    { id: 'users', label: 'Users', icon: Users, category: 'System' },
  ];

  const categories = Array.from(new Set(navItems.map(item => item.category)));

  // タブ切り替え時にスマホメニューを閉じる
  const handleTabClick = (id: string) => {
    onTabChange(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* --- モバイル用ヘッダー (スマホのみ表示) --- */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-950 border-b border-slate-800/60 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Package className="text-white" size={18} />
          </div>
          <h1 className="text-lg font-black text-white italic tracking-tighter">NEXUS</h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- メインナビゲーション (デスクトップは常時表示、モバイルはオーバーレイ) --- */}
      <AnimatePresence>
        {(isMobileMenuOpen || true) && ( // デスクトップ用には常にレンダリング
          <motion.nav 
            initial={false}
            animate={{ x: 0 }}
            className={`
              fixed lg:sticky top-0 left-0 z-40
              w-72 h-screen bg-slate-950 border-r border-slate-800/60 
              flex flex-col overflow-hidden transition-transform duration-300
              ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}
          >
            {/* ロゴエリア (デスクトップのみ) */}
            <div className="hidden lg:block p-8 border-b border-slate-800/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                  <Package className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tighter italic">NEXUS <span className="text-blue-500 font-light">ERP</span></h1>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Supply Chain OS</p>
                </div>
              </div>
            </div>

            {/* ナビ項目エリア */}
            <div className="flex-1 overflow-y-auto py-20 lg:py-6 px-4 space-y-8 custom-scrollbar">
              {categories.map(category => (
                <div key={category} className="space-y-2">
                  <h2 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">{category}</h2>
                  <div className="space-y-1">
                    {navItems.filter(item => item.category === category).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${activeTab === item.id
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 border border-transparent'
                          }`}
                      >
                        <item.icon size={18} className={activeTab === item.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'} />
                        <span className="text-sm font-bold tracking-tight">{item.label}</span>
                        {activeTab === item.id && (
                          <motion.div
                            layoutId="active-pill"
                            className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ユーザーエリア */}
            <div className="p-6 border-t border-slate-800/60">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">AD</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">Administrator</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate">admin@nexus.io</p>
                </div>
                <button className="text-slate-600 hover:text-rose-500 transition-colors px-1">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* モバイルメニュー展開時の背景オーバーレイ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}