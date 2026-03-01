'use client';

import { useEffect, useState } from 'react';

export default function FooterDate() {
  const [year, setYear] = useState<number>(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <span className="font-mono text-[10px] tracking-widest text-slate-500">
      © {year} DISASTER BREAD SYSTEM / ALL RIGHTS RESERVED.
    </span>
  );
}