/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * マスターデータ定義 (M_)
 */
export interface MProduct {
  id: string;
  product_code: string;
  product_name: string;
  mfg_type: string;
  units_per_kg: number;
  units_per_cs: number;
  product_category: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface MItem {
  id: string;
  item_code: string;
  item_name: string;
  category: '原材料' | '資材';
  unit: string;
  min_stock: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface MBom {
  id: string;
  product_code: string;
  item_code: string;
  category: '原材料' | '資材';
  usage_rate: number;
  unit: string;
  basis_unit: '製造量' | '受注数';
  remarks: string;
  created_at: string;
}

export interface MDestination {
  id: string;
  destination_code: string;
  destination_name: string;
  zip_code: string;
  address: string;
  tel: string;
  fax: string;
  contact_person: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

/**
 * トランザクションデータ定義 (T_)
 */
export type OrderStatus = '受注済' | '製造中' | '完了' | '出荷済';

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
  status: OrderStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export type MfgPlanStatus = '計画' | '製造中' | '完了';

export interface TMfgPlan {
  id: string;
  plan_code: string;
  order_code: string;
  product_code: string;
  scheduled_date: string;
  mfg_lot: string;
  expiry_date: string | null;
  amount_kg: number;
  amount_total_pcs: number;
  amount_cs: number;
  amount_p: number;
  status: MfgPlanStatus;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface TProductStock {
  id: string;
  mfg_lot: string;
  product_code: string;
  stock_cs: number;
  stock_p: number;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TItemStock {
  id: string;
  item_code: string;
  actual_stock: number;
  min_stock_level: number;
  planned_usage: number;
  available_stock: number;
  stock_status: '適正' | '在庫低下' | '欠品';
  remarks: string;
  updated_at: string;
}

export interface TReceiving {
  id: string;
  receiving_code: string;
  item_code: string;
  scheduled_date: string;
  order_quantity: number;
  actual_quantity: number | null;
  status: '未入荷' | '一部入荷' | '入荷済';
  remarks: string;
  created_at: string;
  updated_at: string;
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
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface TStocktakingLog {
  id: string;
  item_code: string;
  before_stock: number;
  after_stock: number;
  difference: number;
  remarks: string;
  adjusted_at: string;
}

/**
 * Supabase Client 用の Database 型定義 (追加分)
 * これにより supabase.from('table_name') の結果に自動で型がつきます。
 */
export interface Database {
  public: {
    Tables: {
      m_products: {
        Row: MProduct;
        Insert: Partial<Omit<MProduct, 'id' | 'created_at'>>;
        Update: Partial<MProduct>;
      };
      m_items: {
        Row: MItem;
        Insert: Partial<Omit<MItem, 'id' | 'created_at'>>;
        Update: Partial<MItem>;
      };
      m_boms: {
        Row: MBom;
        Insert: Partial<Omit<MBom, 'id' | 'created_at'>>;
        Update: Partial<MBom>;
      };
      m_destinations: {
        Row: MDestination;
        Insert: Partial<Omit<MDestination, 'id' | 'created_at'>>;
        Update: Partial<MDestination>;
      };
      t_orders: {
        Row: TOrder;
        Insert: Partial<Omit<TOrder, 'id' | 'created_at'>>;
        Update: Partial<TOrder>;
      };
      t_mfg_plans: {
        Row: TMfgPlan;
        Insert: Partial<Omit<TMfgPlan, 'id' | 'created_at'>>;
        Update: Partial<TMfgPlan>;
      };
      t_product_stocks: {
        Row: TProductStock;
        Insert: Partial<Omit<TProductStock, 'id' | 'created_at'>>;
        Update: Partial<TProductStock>;
      };
      t_item_stocks: {
        Row: TItemStock;
        Insert: Partial<TItemStock>;
        Update: Partial<TItemStock>;
      };
      t_receivings: {
        Row: TReceiving;
        Insert: Partial<Omit<TReceiving, 'id' | 'created_at'>>;
        Update: Partial<TReceiving>;
      };
      t_shippings: {
        Row: TShipping;
        Insert: Partial<Omit<TShipping, 'id' | 'created_at'>>;
        Update: Partial<TShipping>;
      };
    };
  };
}