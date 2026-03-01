'use client';

import { useState } from 'react';

const faqs = [
  {
    q: '未計画の受注が一覧に表示されない',
    a: '製造管理ページを再読み込みしてください。既に製造計画が存在する受注は一覧から除外されます。',
  },
  {
    q: '出荷待ちリストに受注が表示されない',
    a: 'その受注に紐づくすべての製造計画のステータスが「完了」になっているか確認してください。1件でも「計画」や「製造中」が残っていると出荷待ちに表示されません。',
  },
  {
    q: '在庫数が合わない',
    a: '以下を確認してください。①製造中への更新で原材料が減算済みか。②入荷完了処理が実行されているか。③棚卸を実施して差異が発生していないか（ダッシュボードの棚卸履歴で確認）。',
  },
  {
    q: '在庫不足アラートが出る',
    a: '品目マスタの「安全在庫数」を下回っています。入荷管理から入荷予定を登録し、入荷完了処理で在庫を補充してください。',
  },
  {
    q: '表示がおかしい・データが更新されない',
    a: 'ブラウザのキャッシュをクリアして再読み込みしてください。Google Chrome での利用を推奨します。別タブで Supabase を直接編集した場合は、いったん別ページに移動してから戻ると最新データが表示されます。',
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">FAQ・トラブルシューティング</h1>

      <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <ul className="divide-y divide-gray-100">
          {faqs.map((faq, i) => (
            <li key={i} className="px-4 py-3">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between text-left text-sm font-medium text-gray-800"
              >
                <span>Q. {faq.q}</span>
                <span className="text-gray-400">{openIndex === i ? '−' : '+'}</span>
              </button>
              {openIndex === i && (
                <p className="mt-2 pl-4 text-sm text-gray-600">A. {faq.a}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
