/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Package, Box, Layers, MapPin, Users, ShoppingCart, Truck, History, Settings, LogOut, Factory } from 'lucide-react';
import { motion } from 'framer-motion';

interface AppNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AppNav({ activeTab, onTabChange }: AppNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Main' },
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

  return (
    <nav className="w-72 bg-slate-950 border-r border-slate-800/60 flex flex-col h-screen sticky top-0 overflow-hidden">
      <div className="p-8 border-b border-slate-800/60">
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

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {categories.map(category => (
          <div key={category} className="space-y-2">
            <h2 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">{category}</h2>
            <div className="space-y-1">
              {navItems.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
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

      <div className="p-6 border-t border-slate-800/60 space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">AD</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate">Administrator</p>
            <p className="text-[10px] font-medium text-slate-500 truncate">admin@nexus.io</p>
          </div>
          <button className="text-slate-600 hover:text-rose-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </nav>
  );
}
