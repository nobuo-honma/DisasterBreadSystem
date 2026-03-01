'use client';

import { useState, useEffect, useRef } from 'react';
import {
    BookOpen, ChevronRight, ChevronDown, Info, AlertTriangle,
    LayoutDashboard, ShoppingCart, Factory, Layers, Truck,
    Package, Settings, Search, Hash, CheckCircle2, Terminal,
    Database, Users, ArrowRight, BookMarked, X
} from 'lucide-react';

// ─── 型 ──────────────────────────────────────────────────────────────────────
interface Section {
    id: string;
    title: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
}

interface Chapter {
    id: string;
    number: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    sections: Section[];
}

// ─── コンポーネント ───────────────────────────────────────────────────────────

function TipBox({ title, children, type = 'info' }: {
    title: string;
    children: React.ReactNode;
    type?: 'info' | 'warning' | 'tip';
}) {
    const styles = {
        info: 'border-sky-500/30    bg-sky-500/5    text-sky-400',
        warning: 'border-amber-500/30  bg-amber-500/5  text-amber-400',
        tip: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    };
    const icons = {
        info: <Info size={13} />,
        warning: <AlertTriangle size={13} />,
        tip: <CheckCircle2 size={13} />,
    };
    return (
        <div className={`rounded-xl border px-4 py-3 my-4 ${styles[type]}`}>
            <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-widest mb-1.5">
                {icons[type]}
                {title}
            </div>
            <div className="text-[12px] text-slate-400 leading-relaxed">{children}</div>
        </div>
    );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="overflow-x-auto my-4 rounded-xl border border-slate-800 shadow-xl">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-800/60">
                        {headers.map((h, i) => (
                            <th key={i} className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-700">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-900/20'}>
                            {row.map((cell, ci) => (
                                <td key={ci} className="py-2.5 px-4 text-[12px] text-slate-300">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Steps({ items }: { items: string[] }) {
    return (
        <ol className="my-4 space-y-2">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/30 border border-blue-500/50 text-blue-400 text-[10px] font-black flex items-center justify-center mt-0.5">
                        {i + 1}
                    </span>
                    <span className="text-[12px] text-slate-300 leading-relaxed pt-0.5">{item}</span>
                </li>
            ))}
        </ol>
    );
}

function Bullets({ items }: { items: string[] }) {
    return (
        <ul className="my-3 space-y-1.5">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                    <span className="text-[12px] text-slate-300 leading-relaxed">{item}</span>
                </li>
            ))}
        </ul>
    );
}

function StatusBadge({ label, color }: { label: string; color: 'gray' | 'amber' | 'green' | 'red' | 'sky' }) {
    const cls = {
        gray: 'bg-slate-800    text-slate-400  border-slate-700',
        amber: 'bg-amber-950   text-amber-400  border-amber-800',
        green: 'bg-emerald-950 text-emerald-400 border-emerald-800',
        red: 'bg-rose-950    text-rose-400   border-rose-800',
        sky: 'bg-sky-950     text-sky-400    border-sky-800',
    }[color];
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black border ${cls}`}>
            {label}
        </span>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return <p className="text-[12px] text-slate-300 leading-relaxed my-2">{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-[13px] font-black text-slate-200 mt-6 mb-2 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full inline-block" />
            {children}
        </h3>
    );
}

// ─── コンテンツ定義 ───────────────────────────────────────────────────────────

const chapters: Chapter[] = [
    {
        id: 'overview',
        number: '1',
        title: 'システム概要',
        icon: <BookOpen size={15} />,
        color: 'text-blue-400',
        sections: [
            {
                id: 'overview-intro',
                title: 'はじめに',
                content: (
                    <>
                        <P>
                            本システムは、パン製造・食品メーカー向けに設計された生産・在庫管理システムです。
                            受注から製造計画、在庫管理、出荷に至るまでの一連の業務を一元管理します。
                        </P>
                        <DataTable
                            headers={['機能', '概要', '主なできること']}
                            rows={[
                                ['ダッシュボード', 'システムの全体状況を一目で確認', '在庫アラート・本日の製造予定・棚卸履歴'],
                                ['受注管理', '顧客からの受注を登録・管理', '受注入力・BOM連動で必要原材料を自動計算'],
                                ['製造管理', '製造計画の作成・進捗管理', '計画編集・カレンダービュー・DB保存'],
                                ['在庫管理', '原材料・資材・製品の在庫照会と棚卸', '在庫照会・棚卸入力・棚卸ログ確認'],
                                ['入荷管理', '仕入れ品の入荷予定と受入処理', '入荷予定登録・受入処理・カレンダー表示'],
                                ['出荷管理', '製品の出荷確定・在庫ロット引当', '出荷実行・FIFO引当・在庫自動更新'],
                                ['マスタ管理', '各種マスタデータの登録・編集', '製品・品目・BOM・取引先・ユーザー管理'],
                            ]}
                        />
                    </>
                ),
            },
            {
                id: 'overview-tech',
                title: '技術環境',
                content: (
                    <>
                        <Bullets items={[
                            'フレームワーク: Next.js（App Router）',
                            'データベース: Supabase（PostgreSQL）',
                            '推奨ブラウザ: Google Chrome 最新版',
                            '接続設定: .env.local に SUPABASE_URL および ANON_KEY が必要',
                        ]} />
                        <TipBox title="接続エラーが出た場合" type="warning">
                            .env.local に <code className="font-mono bg-slate-800 px-1 rounded text-amber-300">NEXT_PUBLIC_SUPABASE_URL</code> と{' '}
                            <code className="font-mono bg-slate-800 px-1 rounded text-amber-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
                            が正しく設定されているか確認してください。設定後はサーバーを再起動してください。
                        </TipBox>
                    </>
                ),
            },
        ],
    },
    {
        id: 'navigation',
        number: '2',
        title: '画面構成とナビゲーション',
        icon: <LayoutDashboard size={15} />,
        color: 'text-emerald-400',
        sections: [
            {
                id: 'nav-sidebar',
                title: 'サイドバーメニュー',
                content: (
                    <>
                        <P>画面左側に固定サイドバーが表示されます。各機能へはサイドバーのメニューから移動します。</P>
                        <DataTable
                            headers={['メニュー名', 'URL', '説明']}
                            rows={[
                                ['Dashboard', '/dashboard', 'システム全体の概要・アラート表示'],
                                ['受注管理', '/orders', '受注の新規入力と一覧'],
                                ['製造管理', '/manufacturing', '製造計画の作成・編集・カレンダー'],
                                ['在庫一覧', '/inventory', '在庫照会・棚卸入力'],
                                ['入荷管理', '/receiving', '入荷予定登録・受入処理'],
                                ['出荷管理', '/shipping', '出荷確定・ロット引当'],
                                ['マスタ管理', '/masters', '各種マスタデータ管理'],
                            ]}
                        />
                        <TipBox title="TIPS" type="tip">
                            現在表示中のページはサイドバーでグリーンのドットが点灯します。
                        </TipBox>
                    </>
                ),
            },
        ],
    },
    {
        id: 'dashboard',
        number: '3',
        title: 'ダッシュボード',
        icon: <LayoutDashboard size={15} />,
        color: 'text-sky-400',
        sections: [
            {
                id: 'dashboard-overview',
                title: '表示内容',
                content: (
                    <>
                        <P>ダッシュボードはシステム起動時に最初に表示される画面です。工場の現在状況を一目で把握できます。</P>
                        <H3>在庫不足アラート</H3>
                        <P>
                            在庫ステータスが「在庫低下」または「欠品」の品目を一覧表示します。
                            欠品は<StatusBadge label="欠品" color="red" />、在庫低下は<StatusBadge label="在庫低下" color="amber" />で表示されます。
                            問題がない場合は「現在、在庫不足の品目はありません」と表示されます。
                        </P>
                        <H3>本日の製造予定</H3>
                        <P>当日の日付で登録されている製造計画を一覧表示します。製造計画コード・製品コード・製造量（kg）・ステータスが確認できます。</P>
                        <H3>最新棚卸履歴</H3>
                        <P>直近10件の棚卸ログを表示します。品目コード・調整日時・調整前後の在庫数・増減（▲/▼）を確認できます。</P>
                    </>
                ),
            },
        ],
    },
    {
        id: 'orders',
        number: '4',
        title: '受注管理',
        icon: <ShoppingCart size={15} />,
        color: 'text-orange-400',
        sections: [
            {
                id: 'orders-register',
                title: '受注の新規登録',
                content: (
                    <>
                        <P>受注管理では顧客からの注文を登録します。BOMマスタと連動し、受注内容から必要原材料の理論値を自動計算します。</P>
                        <Steps items={[
                            '画面左の「受注管理」をクリック',
                            '出荷先の入力欄をクリックし、検索ボックスに取引先名またはコードを入力して選択',
                            '希望納期を日付入力欄で指定',
                            '明細行で製品名を選択し、続いて製造種類（味）を選択',
                            '数量（ケース数）を入力',
                            '明細行を追加する場合は「＋」ボタンをクリック',
                            '「受注を確定して登録する」ボタンをクリックして保存',
                        ]} />
                        <DataTable
                            headers={['項目', '説明']}
                            rows={[
                                ['受注伝票番号', '自動採番（ORD-YYYYMMDD-XXXX 形式）'],
                                ['出荷先', '取引先マスタから検索・選択（必須）'],
                                ['希望納期', '日付を直接入力（必須）'],
                                ['製品名', '製品マスタに登録された製品名（必須）'],
                                ['製造種類（味）', '製品に紐づく製造タイプ（必須）'],
                                ['数量（ケース）', '1以上の整数（必須）'],
                            ]}
                        />
                        <TipBox title="注意" type="warning">
                            製品と味の両方が選択されないと受注を確定できません。必要資源の計算はBOMマスタへの登録内容に依存します。
                        </TipBox>
                    </>
                ),
            },
            {
                id: 'orders-preview',
                title: '必要資源プレビュー',
                content: (
                    <>
                        <P>
                            画面右側に「必要資源の予測」パネルが表示されます。製品と数量を入力すると、
                            BOMマスタに基づいて必要な原材料・資材の理論数量がリアルタイムで計算されます。
                        </P>
                        <TipBox title="TIPS" type="tip">
                            対象品目（SKU）数がパネル下部に表示されます。BOMが未登録の製品は必要資源が計算されません。
                        </TipBox>
                    </>
                ),
            },
        ],
    },
    {
        id: 'manufacturing',
        number: '5',
        title: '製造管理',
        icon: <Factory size={15} />,
        color: 'text-orange-400',
        sections: [
            {
                id: 'mfg-editor',
                title: '計画編集ビュー',
                content: (
                    <>
                        <P>製造管理では、受注に基づいて製造計画を作成・編集します。計画編集ビューとカレンダービューを切り替えて使用できます。</P>
                        <P>画面左のサイドバーに受注一覧が表示されます。受注をクリックすると、中央の編集エリアで製造計画を作成できます。</P>
                        <Steps items={[
                            '受注一覧から対象の受注をクリック',
                            '受注の必要総量・計画済み量・残量・進捗率が上部メトリクスに表示される',
                            '日付・重量（kg）・ステータス・現場備考を入力',
                            '「計画行を追加」ボタンで複数日に分けた計画を入力可能',
                            '「DB 保存」ボタンをクリックして保存',
                        ]} />
                        <DataTable
                            headers={['ステータス', '表示色', '意味']}
                            rows={[
                                ['計画', 'グレー', '製造予定として登録済み'],
                                ['製造中', 'アンバー', '現在製造中'],
                                ['完了', 'グリーン', '製造完了'],
                            ]}
                        />
                    </>
                ),
            },
            {
                id: 'mfg-calendar',
                title: 'カレンダービュー',
                content: (
                    <>
                        <P>ヘッダーの「カレンダー」タブをクリックすると、当月の製造予定をカレンダー形式で確認できます。各日付のセルに製品名・製造量（kg/CS換算）・ステータスが表示されます。</P>
                        <TipBox title="印刷機能" type="tip">
                            ヘッダー右端の印刷ボタン（プリンターアイコン）をクリックすると、カレンダーをA4横向きで印刷できます。
                        </TipBox>
                    </>
                ),
            },
            {
                id: 'mfg-progress',
                title: '進捗管理',
                content: (
                    <>
                        <P>計画済み重量が必要総量を超えると進捗バーがグリーンになり、残量が「超過」と表示されます。超過している場合は計画を見直してください。</P>
                    </>
                ),
            },
        ],
    },
    {
        id: 'inventory',
        number: '6',
        title: '在庫管理（棚卸）',
        icon: <Layers size={15} />,
        color: 'text-blue-400',
        sections: [
            {
                id: 'inv-view',
                title: '在庫照会',
                content: (
                    <>
                        <P>「在庫一覧」メニューを開くと、デフォルトで「原材料」カテゴリの在庫が表示されます。カテゴリは「原材料」「資材」「製品」の3種類があります。</P>
                        <DataTable
                            headers={['列名', '説明']}
                            rows={[
                                ['品目名 / コード', '品目名称と品目コード'],
                                ['現在庫', '現時点の実在庫数'],
                                ['計画使用', '完了以外の製造計画 × BOM使用量から算出した計画消費量'],
                                ['引当可能', '現在庫 − 計画使用量（マイナスは赤色表示）'],
                                ['ステータス', '欠品・在庫低下・適正のいずれか'],
                            ]}
                        />
                        <H3>ステータスの判定ロジック</H3>
                        <Bullets items={[
                            '欠品: 現在庫 < 計画使用量',
                            '在庫低下: 現在庫 < 計画使用量 + 最低在庫数',
                            '適正: 上記以外',
                        ]} />
                    </>
                ),
            },
            {
                id: 'inv-stocktaking',
                title: '棚卸入力',
                content: (
                    <>
                        <P>ヘッダーの「棚卸入力」タブをクリックすると棚卸モードになります。</P>
                        <Steps items={[
                            '「棚卸入力」タブをクリック（画面が黄色バナーで棚卸モードに切替）',
                            '実際に数えた在庫数を各行の「実在庫数」入力欄に入力',
                            '入力値が現在庫と異なる場合、差分（▲/▼）が自動表示される',
                            '変更品目数が画面下部に表示されたら「棚卸確定」をクリック',
                            '確認ダイアログで「確定保存」をクリック',
                        ]} />
                        <TipBox title="注意" type="warning">
                            棚卸確定後は元に戻せません。入力内容を十分に確認してから確定してください。未入力の行は変更なしとして扱われます。
                        </TipBox>
                    </>
                ),
            },
            {
                id: 'inv-log',
                title: '棚卸ログ確認',
                content: (
                    <>
                        <P>ヘッダーの「ログ」ボタンをクリックすると、直近50件の棚卸履歴が表示されます。品目・調整日時・調整前後の数値・差分・備考を確認できます。</P>
                    </>
                ),
            },
        ],
    },
    {
        id: 'receiving',
        number: '7',
        title: '入荷管理',
        icon: <Truck size={15} />,
        color: 'text-emerald-400',
        sections: [
            {
                id: 'recv-register',
                title: '入荷予定の登録',
                content: (
                    <>
                        <P>入荷管理では、原材料・資材の入荷予定を登録し、実際の入荷時に受入処理を行います。受入処理を実行すると、在庫が自動的に更新されます。</P>
                        <Steps items={[
                            'ヘッダーの「入荷予定登録」ボタンをクリック',
                            'フォームで「対象品目」を選択',
                            '「入荷予定日」を入力',
                            '「予定数量」を入力',
                            '必要に応じて「備考」を入力（仕入先情報など）',
                            '「登録」ボタンをクリック',
                        ]} />
                        <P>登録されると入荷コードが自動採番（<code className="font-mono text-emerald-400 bg-slate-800 px-1 rounded">INC-YYYYMMDD-XXX</code> 形式）され、一覧に追加されます。</P>
                    </>
                ),
            },
            {
                id: 'recv-receive',
                title: '受入処理',
                content: (
                    <>
                        <Steps items={[
                            'リストビューで入荷予定の行を確認',
                            '「実入荷数」欄に実際に入荷した数量を入力',
                            '「受入」ボタンをクリック',
                        ]} />
                        <DataTable
                            headers={['ステータス', '説明']}
                            rows={[
                                ['未入荷', '受入処理前の状態'],
                                ['一部入荷', '実入荷数が予定数量より少ない場合'],
                                ['入荷済', '実入荷数が予定数量以上の場合'],
                            ]}
                        />
                        <TipBox title="印刷" type="tip">
                            リストビュー・カレンダービューともに印刷ボタンから帳票出力できます。
                        </TipBox>
                    </>
                ),
            },
            {
                id: 'recv-calendar',
                title: 'カレンダービュー',
                content: (
                    <>
                        <P>ヘッダーの「カレンダー」タブで月次カレンダーに入荷予定を表示できます。予定日が過ぎた未入荷品目は赤色で「遅延」表示されます。</P>
                    </>
                ),
            },
        ],
    },
    {
        id: 'shipping',
        number: '8',
        title: '出荷管理',
        icon: <Package size={15} />,
        color: 'text-orange-400',
        sections: [
            {
                id: 'ship-process',
                title: '出荷処理の手順',
                content: (
                    <>
                        <P>出荷管理では、受注済みの注文に対して製品在庫を引き当て、出荷を確定します。賞味期限が近い順（FIFO）で在庫ロットが表示されます。</P>
                        <Steps items={[
                            '左側の「Pending Orders」一覧から対象の受注をクリック',
                            '右側の「出荷日（発送日）」を確認・修正',
                            '「Inventory Allocation」テーブルで各ロットの出荷数（CS）を入力',
                            '「現在の選択合計」が受注数量と一致するとグリーン表示になる',
                            '「Confirm & Execute Shipping」ボタンをクリックして出荷確定',
                        ]} />
                        <DataTable
                            headers={['確認ポイント', '内容']}
                            rows={[
                                ['受注数量との一致', '出荷ケース数合計が受注数量に一致していないと確定不可'],
                                ['在庫上限', '各ロットの入力値は在庫数を超えられない'],
                                ['ロット順序', '賞味期限が近い順（FIFO）で表示'],
                            ]}
                        />
                        <TipBox title="出荷確定後の動作" type="info">
                            出荷確定すると: (1) 製品在庫が自動で減算、(2) 受注ステータスが「出荷済」に更新、(3) 出荷明細（t_shipping_details）が記録されます。
                        </TipBox>
                    </>
                ),
            },
        ],
    },
    {
        id: 'masters',
        number: '9',
        title: 'マスタ管理',
        icon: <Settings size={15} />,
        color: 'text-indigo-400',
        sections: [
            {
                id: 'masters-intro',
                title: '概要',
                content: (
                    <>
                        <P>マスタ管理はシステムの基盤となる静的データを管理します。管理者権限が必要です。品目コードやBOMを変更すると在庫計算に即座に反映されるため、慎重に操作してください。</P>
                    </>
                ),
            },
            {
                id: 'masters-products',
                title: '製品マスタ',
                content: (
                    <>
                        <P>販売対象の完成品を管理します。</P>
                        <DataTable
                            headers={['入力項目', '説明']}
                            rows={[
                                ['製品コード', '一意のコード（例: PRD-001）（必須）'],
                                ['製品名称', '製品の名前（必須）'],
                                ['規格', '製品仕様の説明（任意）'],
                                ['入数（P/CS）', '1ケース当たりの個数'],
                                ['有効フラグ', 'グリーンドット=有効、グレー=無効'],
                            ]}
                        />
                    </>
                ),
            },
            {
                id: 'masters-items',
                title: '品目マスタ',
                content: (
                    <>
                        <P>原材料・包装資材・消耗品を管理します。</P>
                        <DataTable
                            headers={['入力項目', '説明']}
                            rows={[
                                ['品目コード', '一意のコード（例: MAT-001）（必須）'],
                                ['品目名称', '品目の名前（必須）'],
                                ['カテゴリー', '原材料 / 包装資材 / 消耗品'],
                                ['管理単位', 'kg / 枚 / 本 など'],
                                ['安全在庫数', '在庫低下アラートの閾値'],
                            ]}
                        />
                    </>
                ),
            },
            {
                id: 'masters-bom',
                title: 'BOM管理（部品構成表）',
                content: (
                    <>
                        <P>製品1単位あたりに必要な品目と使用量を定義します。BOMが未登録の製品は、在庫管理の「計画使用量」が計算されません。</P>
                        <Steps items={[
                            '左側の製品一覧から対象製品をクリック',
                            '「Add Item」ボタンで品目行を追加',
                            '「使用品目」ドロップダウンから品目を選択',
                            '「必要数量」を入力（小数3桁まで）',
                            '「Save Product Recipe (BOM)」をクリックして保存',
                        ]} />
                        <TipBox title="注意" type="warning">
                            BOM保存時は既存データを一括削除してから再登録します。編集中に誤って保存しないよう注意してください。
                        </TipBox>
                    </>
                ),
            },
            {
                id: 'masters-destinations',
                title: '取引先マスタ',
                content: (
                    <>
                        <P>出荷先・仕入先・配送業者を管理します。受注入力の「出荷先」選択に利用されます。</P>
                        <DataTable
                            headers={['入力項目', '説明']}
                            rows={[
                                ['取引先コード', '一意のコード（例: D-001）（必須）'],
                                ['区分', '出荷先 / 仕入先 / 配送業者'],
                                ['取引先名称', '会社・店舗名（必須）'],
                                ['郵便番号・住所', '配送先住所（任意）'],
                                ['電話番号・担当者', '連絡先情報（任意）'],
                            ]}
                        />
                    </>
                ),
            },
            {
                id: 'masters-users',
                title: 'ユーザー管理',
                content: (
                    <>
                        <P>システムを利用するユーザーのアカウントとアクセス権限を管理します。</P>
                        <DataTable
                            headers={['権限', 'できること']}
                            rows={[
                                ['一般', '参照のみ'],
                                ['製造担当', '入出庫・製造計画の操作'],
                                ['事務担当', '受注・出荷の操作'],
                                ['管理者', 'マスタ編集・全機能'],
                            ]}
                        />
                    </>
                ),
            },
        ],
    },
    {
        id: 'faq',
        number: '10',
        title: 'FAQ・トラブルシューティング',
        icon: <Terminal size={15} />,
        color: 'text-rose-400',
        sections: [
            {
                id: 'faq-list',
                title: 'よくある質問',
                content: (
                    <>
                        {[
                            {
                                q: '受注が製造管理の一覧に表示されない',
                                a: '製造管理ページを再読み込みしてください。既に製造計画が存在する受注は一覧に表示されます。製造計画のステータスが「完了」になっている受注は出荷待ちに移動します。',
                            },
                            {
                                q: '在庫数が合わない',
                                a: '以下を確認してください。①製造計画ステータス更新による原材料の減算が完了しているか。②入荷管理で「受入」ボタンを押す処理が実施されているか（予定登録だけでは在庫は増えません）。③棚卸を実施して差異を確認する。',
                            },
                            {
                                q: '在庫不足アラートが表示される',
                                a: '品目マスタの「安全在庫数」を下回っています。入荷管理から入荷予定を登録し、入荷受入処理を実施して在庫を補充してください。',
                            },
                            {
                                q: '出荷確定ボタンが押せない',
                                a: '出荷ケース数の合計が受注数量と一致していない場合、ボタンは無効になります。各ロットへの割当数を調整して合計を一致させてください（一致するとグリーン表示になります）。',
                            },
                            {
                                q: 'データが更新されない・表示がおかしい',
                                a: '①ヘッダーの更新ボタン（循環矢印アイコン）をクリック、②Ctrl+Shift+R でブラウザキャッシュをクリア、③別ページに移動してから戻る、のいずれかをお試しください。',
                            },
                            {
                                q: '「System Configuration Error」が表示される',
                                a: 'Supabase の接続設定に問題があります。.env.local ファイルを確認し、NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が正しく設定されているか確認してください。',
                            },
                            {
                                q: 'BOMを変更したが在庫計算が変わらない',
                                a: 'BOM変更後は在庫管理ページで更新ボタンを押し、データを再取得してください。ブラウザを完全に再読み込み（Ctrl+Shift+R）することで最新のBOMが反映されます。',
                            },
                        ].map((faq, i) => (
                            <div key={i} className="border border-slate-800 rounded-xl mb-3 overflow-hidden">
                                <div className="bg-slate-900/60 px-4 py-3 flex items-start gap-3">
                                    <span className="text-[10px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded mt-0.5 shrink-0">Q</span>
                                    <p className="text-[12px] font-bold text-slate-200">{faq.q}</p>
                                </div>
                                <div className="bg-slate-950/40 px-4 py-3 flex items-start gap-3 border-t border-slate-800">
                                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded mt-0.5 shrink-0">A</span>
                                    <p className="text-[12px] text-slate-400 leading-relaxed">{faq.a}</p>
                                </div>
                            </div>
                        ))}
                    </>
                ),
            },
        ],
    },
];

// ─── メインコンポーネント ──────────────────────────────────────────────────────
export default function ManualPage() {
    const [activeChapter, setActiveChapter] = useState('overview');
    const [activeSection, setActiveSection] = useState('overview-intro');
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set(['overview']));
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<{ chapterId: string; sectionId: string; title: string; chapterTitle: string }[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    const currentChapter = chapters.find(c => c.id === activeChapter);
    const currentSection = currentChapter?.sections.find(s => s.id === activeSection);

    const toggleChapter = (id: string) => {
        setExpandedChapters(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const navigateTo = (chapterId: string, sectionId: string) => {
        setActiveChapter(chapterId);
        setActiveSection(sectionId);
        setExpandedChapters(prev => {
            const next = new Set(prev);
            next.add(chapterId);
            return next;
        });
        setSearch('');
        setSearchResults([]);
        if (contentRef.current) contentRef.current.scrollTop = 0;
    };

    // 検索
    useEffect(() => {
        if (!search.trim()) { setSearchResults([]); return; }
        const kw = search.toLowerCase();
        const results: typeof searchResults = [];
        chapters.forEach(ch => {
            ch.sections.forEach(sec => {
                if (sec.title.toLowerCase().includes(kw) || ch.title.toLowerCase().includes(kw)) {
                    results.push({ chapterId: ch.id, sectionId: sec.id, title: sec.title, chapterTitle: ch.title });
                }
            });
        });
        setSearchResults(results);
    }, [search]);

    // prev / next section navigation
    const allSections = chapters.flatMap(c => c.sections.map(s => ({ ...s, chapterId: c.id })));
    const currentIdx = allSections.findIndex(s => s.id === activeSection);
    const prevSection = currentIdx > 0 ? allSections[currentIdx - 1] : null;
    const nextSection = currentIdx < allSections.length - 1 ? allSections[currentIdx + 1] : null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">

            {/* ── ヘッダー ── */}
            <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
                            <BookOpen size={14} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[13px] font-black text-white tracking-wide leading-none">操作マニュアル</h1>
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">DisasterBread System Ver.2</p>
                        </div>
                    </div>

                    {/* 検索 */}
                    <div className="relative w-64">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="セクションを検索..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-[12px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-600 transition-colors"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                {searchResults.map((r, i) => (
                                    <button key={i} onClick={() => navigateTo(r.chapterId, r.sectionId)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0">
                                        <p className="text-[11px] font-bold text-white">{r.title}</p>
                                        <p className="text-[9px] text-slate-500">{r.chapterTitle}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto w-full flex flex-1">

                {/* ── サイドバー（目次） ── */}
                <aside className="w-64 shrink-0 border-r border-slate-800 overflow-y-auto sticky top-[49px] h-[calc(100vh-49px)]">
                    <div className="p-3">
                        {chapters.map(ch => (
                            <div key={ch.id} className="mb-1">
                                {/* 章ヘッダー */}
                                <button
                                    onClick={() => {
                                        toggleChapter(ch.id);
                                        if (ch.sections.length > 0) navigateTo(ch.id, ch.sections[0].id);
                                    }}
                                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all ${activeChapter === ch.id
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                                        }`}
                                >
                                    <span className={`text-[10px] font-black font-mono ${ch.color} shrink-0`}>{ch.number}</span>
                                    <span className={`text-[11px] font-bold flex-1 truncate ${activeChapter === ch.id ? 'text-white' : ''}`}>{ch.title}</span>
                                    <ChevronDown
                                        size={11}
                                        className={`shrink-0 transition-transform ${expandedChapters.has(ch.id) ? 'rotate-0' : '-rotate-90'} text-slate-600`}
                                    />
                                </button>

                                {/* セクション一覧 */}
                                {expandedChapters.has(ch.id) && ch.sections.length > 1 && (
                                    <div className="ml-5 mt-0.5 space-y-0.5 border-l border-slate-800 pl-2">
                                        {ch.sections.map(sec => (
                                            <button
                                                key={sec.id}
                                                onClick={() => navigateTo(ch.id, sec.id)}
                                                className={`w-full text-left px-2 py-1.5 rounded text-[10px] transition-all truncate ${activeSection === sec.id
                                                        ? `font-bold ${ch.color}`
                                                        : 'text-slate-600 hover:text-slate-400'
                                                    }`}
                                            >
                                                {sec.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </aside>

                {/* ── コンテンツ ── */}
                <main ref={contentRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-8 py-8">

                        {/* パンくず */}
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 mb-6">
                            <BookMarked size={10} />
                            <span>{currentChapter?.number}. {currentChapter?.title}</span>
                            {currentSection && currentChapter?.sections.length && currentChapter.sections.length > 1 && (
                                <>
                                    <ChevronRight size={10} />
                                    <span className="text-slate-400">{currentSection.title}</span>
                                </>
                            )}
                        </div>

                        {/* タイトル */}
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 ${currentChapter?.color}`}>
                                    {currentChapter?.icon}
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${currentChapter?.color}`}>
                                        Chapter {currentChapter?.number}
                                    </p>
                                    <h2 className="text-2xl font-black text-white leading-tight">{currentChapter?.title}</h2>
                                </div>
                            </div>
                            {currentSection && currentChapter?.sections.length && currentChapter.sections.length > 1 && (
                                <h3 className="text-[15px] font-bold text-slate-300 mt-2 border-l-2 border-blue-500 pl-3">
                                    {currentSection.title}
                                </h3>
                            )}
                        </div>

                        {/* セクションタブ（複数セクションある章） */}
                        {currentChapter && currentChapter.sections.length > 1 && (
                            <div className="flex gap-1 flex-wrap mb-6 pb-5 border-b border-slate-800">
                                {currentChapter.sections.map(sec => (
                                    <button
                                        key={sec.id}
                                        onClick={() => { setActiveSection(sec.id); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeSection === sec.id
                                                ? `bg-blue-600 text-white shadow`
                                                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {sec.title}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* コンテンツ本文 */}
                        <div className="prose-sm">
                            {currentSection?.content}
                        </div>

                        {/* 前後ナビ */}
                        <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800">
                            {prevSection ? (
                                <button
                                    onClick={() => navigateTo(prevSection.chapterId, prevSection.id)}
                                    className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-white transition-colors group"
                                >
                                    <ChevronRight size={13} className="rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                                    <span>{prevSection.title}</span>
                                </button>
                            ) : <div />}

                            {nextSection ? (
                                <button
                                    onClick={() => navigateTo(nextSection.chapterId, nextSection.id)}
                                    className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-white transition-colors group"
                                >
                                    <span>{nextSection.title}</span>
                                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                </button>
                            ) : <div />}
                        </div>
                    </div>
                </main>

                {/* ── 右サイドバー（このページのセクション） ── */}
                {currentChapter && currentChapter.sections.length > 2 && (
                    <aside className="w-48 shrink-0 border-l border-slate-800 sticky top-[49px] h-[calc(100vh-49px)] overflow-y-auto">
                        <div className="p-4">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3">このページの内容</p>
                            {currentChapter.sections.map(sec => (
                                <button
                                    key={sec.id}
                                    onClick={() => { setActiveSection(sec.id); if (contentRef.current) contentRef.current.scrollTop = 0; }}
                                    className={`block w-full text-left text-[10px] py-1.5 px-2 rounded transition-colors ${activeSection === sec.id
                                            ? `font-bold ${currentChapter.color}`
                                            : 'text-slate-600 hover:text-slate-400'
                                        }`}
                                >
                                    {sec.title}
                                </button>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}