import { supabase } from '../lib/supabase/client';
import { MProduct, MItem, MBom, MDestination } from '../types';

export const masterService = {
  // --- 製品マスタ ---
  async getProducts(): Promise<MProduct[]> {
    const { data, error } = await supabase
      .from('m_products')
      .select('*')
      .order('product_code');
    if (error) throw error;
    return data ?? [];
  },

  async saveProduct(product: Partial<MProduct>): Promise<void> {
    if (product.id) {
      const { error } = await supabase
        .from('m_products')
        .update(product)
        .eq('id', product.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('m_products')
        .insert(product);
      if (error) throw error;
    }
  },

  // --- 品目マスタ ---
  async getItems(): Promise<MItem[]> {
    const { data, error } = await supabase
      .from('m_items')
      .select('*')
      .order('item_code');
    if (error) throw error;
    return data ?? [];
  },

  async saveItem(item: Partial<MItem>): Promise<void> {
    if (item.id) {
      const { error } = await supabase
        .from('m_items')
        .update(item)
        .eq('id', item.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('m_items')
        .insert(item);
      if (error) throw error;
    }
  },

  // --- BOM ---
  async getBOM(productCode: string): Promise<MBom[]> {
    const { data, error } = await supabase
      .from('m_bom')
      .select('*')
      .eq('product_code', productCode)
      .order('item_code');
    if (error) throw error;
    return data ?? [];
  },

  async saveBOM(productCode: string, entries: Partial<MBom>[]): Promise<void> {
    // 既存BOMを削除して再登録（全置換方式）
    const { error: delErr } = await supabase
      .from('m_bom')
      .delete()
      .eq('product_code', productCode);
    if (delErr) throw delErr;

    if (entries.length > 0) {
      const rows = entries.map(e => ({ ...e, product_code: productCode }));
      const { error: insErr } = await supabase
        .from('m_bom')
        .insert(rows);
      if (insErr) throw insErr;
    }
  },

  // --- 出荷先マスタ ---
  async getDestinations(): Promise<MDestination[]> {
    const { data, error } = await supabase
      .from('m_destinations')
      .select('*')
      .order('destination_code');
    if (error) throw error;
    return data ?? [];
  },

  async saveDestination(dest: Partial<MDestination>): Promise<void> {
    if (dest.id) {
      const { error } = await supabase
        .from('m_destinations')
        .update(dest)
        .eq('id', dest.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('m_destinations')
        .insert(dest);
      if (error) throw error;
    }
  },

  // --- ユーザー管理 (Supabase Auth管理 / 参照のみ) ---
  // ユーザー管理はSupabase Auth側で行うため、
  // このメソッドは現在スタブです。本番運用時はAuth Admin APIを使用してください。
  async getUsers(): Promise<import('../types').MUser[]> {
    console.warn('getUsers: ユーザー管理はSupabase Authで行ってください');
    return [];
  },

  async saveUser(_user: Partial<import('../types').MUser>): Promise<void> {
    console.warn('saveUser: ユーザー管理はSupabase Authで行ってください');
  },
};
