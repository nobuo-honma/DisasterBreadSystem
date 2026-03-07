/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from 'react';
import AppNav from './AppNav';
import FooterDate from './FooterDate';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function DashboardLayout({ children, activeTab, onTabChange }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* サイドナビゲーション (スマホ時はドロワーとして機能) */}
      <AppNav activeTab={activeTab} onTabChange={onTabChange} />
      
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* メインコンテンツエリア 
          lg:pt-0: デスクトップでは上部パディングなし
          pt-20: スマホ用固定ヘッダー(h-16)分の余白を確保
        */}
        <main className="flex-1 p-4 md:p-8 pt-20 lg:pt-8 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="max-w-[1600px] mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* フッター（日付・システムステータス） */}
        <div className="px-4 md:px-8 pb-4">
          <FooterDate />
        </div>
      </div>

      {/* モバイル用：画面下部のグラデーション（スクロール時の視認性向上） */}
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-linear-to-t from-slate-950 to-transparent pointer-events-none z-10 lg:hidden" />
    </div>
  );
}