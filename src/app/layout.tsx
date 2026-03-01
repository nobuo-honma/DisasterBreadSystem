import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// エラー回避策：エイリアス(@/)が効かない場合、相対パス(../)で直接指定する
import FooterDate from '../components/FooterDate';
import Sidebar from '../components/AppNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DisasterBread System Ver.2',
  description: 'Production and Inventory Management for Disaster Relief',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className="bg-slate-950 text-slate-200">
      <body className={`${inter.className} min-h-screen flex overflow-x-hidden`}>

        {/* SIDEBAR - 存在しない場合のエラーを防ぐためコンポーネントとして呼び出し */}
        <aside className="w-64 fixed inset-y-0 left-0 z-50 border-r border-slate-900 bg-slate-950/50 backdrop-blur-xl">
          <Sidebar />
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <main className="flex-1 p-6 md:p-10 lg:p-12 overflow-y-auto">
            {children}
          </main>

          {/* FOOTER */}
          <footer className="border-t border-slate-900 p-8 flex flex-col items-center gap-4 bg-slate-950">
            <div className="h-px w-12 bg-orange-500/50 mb-4" />
            <FooterDate />
            <div className="flex gap-6 text-[10px] font-black text-slate-600 uppercase tracking-tighter italic">
              <span>Terminal_v2.0.1</span>
              <span>Stable_Build</span>
              <span>Auth_Verified</span>
            </div>
          </footer>
        </div>

      </body>
    </html>
  );
}