import { supabaseAdmin } from "../config/supabaseClient";

export const SettlementModel = {
  async createSettlement({ group_id, from_user, to_user, amount }: any) {
    const { data, error } = await supabaseAdmin
      .from("settlements")
      .insert([{ group_id, from_user, to_user, amount }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByGroup(groupId: string) {
    const { data, error } = await supabaseAdmin
      .from("settlements")
      .select("*")
      .eq("group_id", groupId);

    if (error) throw error;
    return data;
  }
};
