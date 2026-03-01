import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
      <body className={`${inter.className} min-h-screen`}>
        {children}
      </body>
    </html>
  );
}