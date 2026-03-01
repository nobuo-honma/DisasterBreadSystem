# Disaster Bread System Ver.2

マニュアル（操作マニュアル Ver 1.2）に沿った受注・製造・在庫・入出荷管理の Web アプリです。Supabase をバックエンドに使用します。

## 必要な環境

- Node.js 18+
- Supabase アカウント

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase の設定

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. **SQL Editor** で `supabase/migrations/00001_schema_v4_uuid.sql` の内容を実行してテーブルを作成する
3. プロジェクトの **Settings → API** から **Project URL** と **anon public** キーをコピーする

### 3. 環境変数

`.env.example` をコピーして `.env.local` を作成し、値を設定します。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。トップはダッシュボードにリダイレクトされます。

## ページ構成（マニュアル対応）

| パス | 内容 |
|------|------|
| `/dashboard` | 在庫不足アラート・本日の予定・棚卸履歴 |
| `/orders` | 受注登録・受注一覧・必要資材シミュレーション |
| `/manufacturing` | 製造計画入力・予定表一覧 |
| `/inventory` | 原材料/資材/製品在庫・棚卸（`?inventory=true` で棚卸モード） |
| `/receiving` | 入荷予定登録・受入処理 |
| `/shipping` | 出荷待ちリスト・ロット指定出荷 |
| `/master` | マスタの役割と Supabase 編集案内 |
| `/faq` | よくある質問・トラブル対処 |

## データの準備

- **m_destinations**: 出荷先を登録
- **m_products**: 製品（製品コード・製造種類・1kg/1c/s 個数）
- **m_items**: 品目（原材料・資材・単位・安全在庫）
- **m_bom**: 部品表（製品×品目・使用率・基準単位）
- **t_item_stock**: 品目ごとの在庫（品目マスタ登録後にレコードを追加）

Supabase ダッシュボードの **Table Editor** から編集できます。

## ビルド

```bash
npm run build
npm start
```
