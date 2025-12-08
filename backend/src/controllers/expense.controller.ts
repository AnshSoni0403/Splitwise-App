import { Request, Response } from "express";
import { ExpenseModel } from "../models/expense.model";

export const ExpenseController = {
  // POST /api/expenses
  async createExpense(req: Request, res: Response) {
    try {
      console.log("[createExpense] incoming body:", JSON.stringify(req.body));

      let {
        group_id,
        description,
        total_amount,
        created_by,
        payers,        // [{ user_id, paid_amount }]
        participants,  // [user_id,...]
        split_type,    // "equal" | "percentage" | "manual"
        split_values   // for percentage/manual: array matching participants order
      } = req.body;

      // Defensive parsing + validation
      total_amount = Number(total_amount || 0);
      if (!group_id || !total_amount || !Array.isArray(payers) || !Array.isArray(participants)) {
        return res.status(400).json({ error: "group_id, total_amount, payers, participants are required." });
      }
      if (!created_by) return res.status(400).json({ error: "created_by is required" });

      // Ensure payer(s) included in participants (server-side)
      const payerIds = new Set(payers.map((p: any) => p.user_id));
      const participantsSet = new Set(participants);
      for (const pid of payerIds) participantsSet.add(pid);
      participants = Array.from(participantsSet);

      // Create main expense row
      const expense = await ExpenseModel.createExpense({
        group_id,
        description,
        total_amount,
        created_by
      });

      // Insert payers rows
      await ExpenseModel.addPayers(expense.id, payers);

      // === Build finalSplits for ALL participants (payer included) ===
      let finalSplits: { user_id: string; owed_amount: number }[] = [];

      if (!split_type || split_type === "equal") {
        // equal share across ALL participants (including payer)
        const rawShare = Number(total_amount) / participants.length;
        const share = Number(rawShare.toFixed(2));
        finalSplits = participants.map((uid: string) => ({ user_id: uid, owed_amount: share }));
      } else if (split_type === "percentage") {
        if (!Array.isArray(split_values) || split_values.length !== participants.length) {
          return res.status(400).json({ error: "percentage split_values must match participants length" });
        }
        finalSplits = participants.map((uid: string, idx: number) => {
          const pct = Number(split_values[idx] || 0);
          const owed = Number(((pct / 100) * total_amount).toFixed(2));
          return { user_id: uid, owed_amount: owed };
        });
      } else if (split_type === "manual") {
        if (!Array.isArray(split_values) || split_values.length !== participants.length) {
          return res.status(400).json({ error: "manual split_values must match participants length" });
        }
        finalSplits = participants.map((uid: string, idx: number) => {
          const amt = Number(split_values[idx] || 0);
          return { user_id: uid, owed_amount: Number(amt.toFixed ? amt.toFixed(2) : Number(amt)) };
        });
      } else {
        return res.status(400).json({ error: "Invalid split_type. Use equal | percentage | manual" });
      }

      // Rounding correction: ensure sum(owed_amount) === total_amount
      const sumOwed = finalSplits.reduce((s, r) => s + Number(r.owed_amount), 0);
      const diff = Number((total_amount - sumOwed).toFixed(2));
      if (Math.abs(diff) >= 0.01) {
        // Add/subtract diff to the first participant to fix cents rounding
        finalSplits[0].owed_amount = Number((Number(finalSplits[0].owed_amount) + diff).toFixed(2));
      }

      console.log("[createExpense] finalSplits:", JSON.stringify(finalSplits, null, 2));

      // Insert splits (for all participants)
      await ExpenseModel.addSplits(expense.id, finalSplits);

      return res.status(201).json({ message: "Expense created", expense, splits: finalSplits });
    } catch (err: any) {
      console.error("[createExpense] error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // GET /api/expenses/group/:groupId
  async getExpensesForGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const expenses = await ExpenseModel.findByGroup(groupId);
      return res.json({ expenses });
    } catch (err: any) {
      console.error("getExpensesForGroup error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  }
};
