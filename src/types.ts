// =========================================================
// Disaster Bread System — TypeScript型定義 (スキーマv4対応)
// =========================================================

// --- マスタ ---

export interface MProduct {
  id: string;
  product_code: string;
  product_name: string;
  mfg_type: string;
  units_per_kg: number;
  units_per_cs: number;
  product_category: string;
  is_active: boolean;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MItem {
  id: string;
  item_code: string;
  item_name: string;
  category: '原材料' | '資材';
  unit: string;
  min_stock: number;
  is_active?: boolean;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MBom {
  id: string;
  product_code: string;
  item_code: string;
  category: '原材料' | '資材';
  usage_rate: number;
  unit: string;
  basis_unit: '製造量' | '受注数';
  remarks?: string;
  created_at?: string;
}

export interface MDestination {
  id: string;
  destination_code: string;
  destination_name: string;
  zip_code?: string;
  address?: string;
  tel?: string;
  contact_person?: string;
  remarks?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- トランザクション ---

export interface TOrder {
  id: string;
  order_code: string;
  order_date: string;
  destination_code: string;
  product_code: string;
  product_name_at_order: string;
  quantity_cs: number;
  quantity_p: number;
  request_delivery_date: string;
  status: '受注済' | '製造中' | '完了' | '出荷済';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TMfgPlan {
  id: string;
  plan_code: string;
  order_code: string;
  product_code: string;
  scheduled_date: string;
  mfg_lot?: string;
  expiry_date?: string;
  amount_kg: number;
  amount_total_pcs?: number;
  amount_cs: number;
  amount_p?: number;
  status: '計画' | '製造中' | '完了';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TMfgResult {
  id: string;
  mfg_lot: string;
  product_code: string;
  actual_total_pcs: number;
  actual_cs: number;
  actual_p: number;
  recorded_at?: string;
}

export interface TItemStock {
  id: string;
  item_code: string;
  actual_stock: number;
  min_stock_level?: number;
  planned_usage?: number;
  available_stock?: number;
  stock_status?: '適正' | '在庫低下' | '欠品';
  remarks?: string;
  updated_at: string;
}

export interface TProductStock {
  id: string;
  mfg_lot: string;
  product_code: string;
  stock_cs: number;
  stock_p: number;
  expiry_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TReceiving {
  id: string;
  receiving_code: string;
  item_code: string;
  scheduled_date: string;
  order_quantity: number;
  actual_quantity?: number;
  status: '未入荷' | '一部入荷' | '入荷済';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TStocktakingLog {
  id: string;
  item_code: string;
  before_stock: number;
  after_stock: number;
  difference?: number;
  remarks: string;
  adjusted_at: string;
}

export interface TStockLog {
  id: string;
  tx_type: '入荷' | '製造消費' | '製造完了' | '出荷' | '棚卸調整';
  target_type: '品目' | '製品';
  item_code?: string;
  lot_no?: string;
  quantity: number;
  related_code?: string;
  executed_at?: string;
  remarks?: string;
}

export interface TShipping {
  id: string;
  shipping_code: string;
  order_code: string;
  product_code: string;
  scheduled_date: string;
  shipping_cs: number;
  shipping_p: number;
  status: '未出荷' | '出荷済';
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

// ユーザー管理はSupabase Authで行うため、
// UIコンポーネントとの互換性のために型定義のみ残す
export interface MUser {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

