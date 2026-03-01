'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Factory, 
  Truck, 
  ClipboardList, 
  Settings,
  Database
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: '受注管理', href: '/orders', icon: ShoppingCart },
  { name: '製造管理', href: '/manufacturing', icon: Factory },
  { name: '在庫一覧', href: '/inventory', icon: Package },
  { name: '入荷管理', href: '/receiving', icon: Database },
  { name: '出荷管理', href: '/shipping', icon: Truck },
  { name: 'マスタ管理', href: '/masters', icon: Settings },
];

export default function AppNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
              ${isActive 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }
            `}
          >
            <Icon 
              size={18} 
              className={`transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-300'
              }`} 
            />
            <span className="tracking-wide">{item.name}</span>
            
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}