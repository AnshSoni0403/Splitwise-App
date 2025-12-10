// backend/src/models/settlement.model.ts
import { supabaseAdmin } from "../config/supabaseClient";

export const SettlementModel = {
  async create(settlement: {
    group_id: string;
    from_user: string;
    to_user: string;
    amount: number;
    note?: string;
    created_by?: string;
  }) {
    const { data, error } = await supabaseAdmin
      .from("settlements")
      .insert([settlement])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByGroup(groupId: string) {
    const { data, error } = await supabaseAdmin
      .from("settlements")
      .select("id, group_id, from_user, to_user, amount, note, created_by, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async deleteById(id: string) {
    const { data, error } = await supabaseAdmin
      .from("settlements")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return data;
  }
};
