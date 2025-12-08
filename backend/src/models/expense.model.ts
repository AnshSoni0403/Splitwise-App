import { supabaseAdmin } from "../config/supabaseClient";

export class ExpenseModel {

  // Create expense main record
  static async createExpense({ group_id, description, total_amount, created_by }: any) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .insert([{ group_id, description, total_amount, created_by }])
    .select()
    .single();

  if (error) throw error;
  return data;
}


  // Add payers array
  static async addPayers(expenseId: string, payers: any[]) {
    // payers = [{ user_id, paid_amount }]
    const rows = payers.map(p => ({
      expense_id: expenseId,
      user_id: p.user_id,
      paid_amount: p.paid_amount
    }));

    const { error } = await supabaseAdmin
      .from("expense_payers")
      .insert(rows);

    if (error) throw error;
  }

  // Add splits array
  static async addSplits(expenseId: string, splits: any[]) {
    // splits = [{ user_id, owed_amount }]
    const rows = splits.map(s => ({
      expense_id: expenseId,
      user_id: s.user_id,
      owed_amount: s.owed_amount
    }));

    const { error } = await supabaseAdmin
      .from("expense_splits")
      .insert(rows);

    if (error) throw error;
  }

  // Fetch expenses for a group
  static async findByGroup(groupId: string) {
    const { data, error } = await supabaseAdmin
      .from("expenses")
      .select(`
        id,
        description,
        total_amount,
        created_at,
        payers:expense_payers(user_id, paid_amount),
        splits:expense_splits(user_id, owed_amount)
      `)
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
}
