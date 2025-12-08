import { ExpenseModel } from "../models/expense.model";
import { SettlementModel } from "../models/settlement.model";

export async function computeGroupBalances(groupId: string) {
  const expenses = await ExpenseModel.findByGroup(groupId);
  const settlements = await SettlementModel.findByGroup(groupId);

  const balance: Record<string, number> = {};

  // STEP 1 — Apply expenses
  for (const exp of expenses) {
    for (const p of exp.payers || []) {
      balance[p.user_id] = (balance[p.user_id] || 0) + Number(p.paid_amount);
    }

    for (const s of exp.splits || []) {
      balance[s.user_id] = (balance[s.user_id] || 0) - Number(s.owed_amount);
    }
  }

  // STEP 2 — Apply settlements
  for (const st of settlements) {
    balance[st.from_user] = (balance[st.from_user] || 0) - Number(st.amount);
    balance[st.to_user] = (balance[st.to_user] || 0) + Number(st.amount);
  }

  return balance;
}
