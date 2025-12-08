// backend/src/controllers/expense.controller.ts
import { Request, Response } from "express";
import { ExpenseModel } from "../models/expense.model";

export const ExpenseController = {
  async createExpense(req: Request, res: Response) {
    try {
      const {
        group_id,
        description,
        total_amount,
        created_by,
        payers,          // [{ user_id, paid_amount }]
        participants,    // [user_id,...]
        split_type,      // "equal" | "percentage" | "manual"
        split_values     // for percentage: [percent,...] matching participants order
                         // for manual: [amount,...] matching participants order
      } = req.body;

      // basic validation
      if (!group_id || total_amount == null || !Array.isArray(payers) || !Array.isArray(participants)) {
        return res.status(400).json({ error: "group_id, total_amount, payers, participants are required." });
      }
      if (!created_by) return res.status(400).json({ error: "created_by is required" });

      // create main expense row
      const expense = await ExpenseModel.createExpense({
        group_id,
        description,
        total_amount,
        created_by
      });

      // insert payer rows
      await ExpenseModel.addPayers(expense.id, payers);

      // Prepare sets and arrays
      const payerIds = new Set(payers.map((p: any) => p.user_id));
      const partIds: string[] = participants.slice(); // copy

      // Identify participants who must PAY (exclude payers)
      const payersInParticipants = partIds.filter(pid => payerIds.has(pid));
      const oweParticipants = partIds.filter(pid => !payerIds.has(pid)); // these will be assigned owed_amount

      // Handle case: if no one owes (everyone is a payer or oweParticipants length = 0)
      if (oweParticipants.length === 0) {
        // nobody owes (all participants are payers) -> create zero splits or skip
        // We'll insert zero owed_amount rows for participants (optional)
        const zeroSplits = partIds.map(uid => ({ user_id: uid, owed_amount: 0 }));
        await ExpenseModel.addSplits(expense.id, zeroSplits);
        return res.status(201).json({ message: "Expense created (no owing participants)", expense });
      }

      // Compute finalSplits according to split_type, BUT only for oweParticipants.
      let finalSplits: { user_id: string; owed_amount: number }[] = [];

      if (split_type === "equal" || !split_type) {
        // split equally among oweParticipants (exclude payer(s))
        const each = Number(total_amount) / oweParticipants.length;
        finalSplits = oweParticipants.map(uid => ({ user_id: uid, owed_amount: Number(each.toFixed(2)) }));
      } else if (split_type === "percentage") {
        // split_values expected to be an array of percentages corresponding to participants[]
        if (!Array.isArray(split_values) || split_values.length !== partIds.length) {
          return res.status(400).json({ error: "percentage split_values must match participants length" });
        }

        // Build map participant -> percent
        const percentMap = new Map<string, number>();
        partIds.forEach((pid, idx) => percentMap.set(pid, Number(split_values[idx] || 0)));

        // Remove payer percents (set to 0) and compute remaining total percent
        let remainingPercent = 0;
        for (const uid of oweParticipants) {
          remainingPercent += (percentMap.get(uid) || 0);
        }
        // If remainingPercent is 0 (no percent assigned to non-payers), distribute equally
        if (remainingPercent === 0) {
          const each = Number(total_amount) / oweParticipants.length;
          finalSplits = oweParticipants.map(uid => ({ user_id: uid, owed_amount: Number(each.toFixed(2)) }));
        } else {
          // Rescale their percents to sum to 100% of the owed portion
          for (const uid of oweParticipants) {
            const p = Number(percentMap.get(uid) || 0);
            const scaledPercent = (p / remainingPercent) * 100; // proportional scaling
            const owed = Number(((scaledPercent / 100) * Number(total_amount)).toFixed(2));
            finalSplits.push({ user_id: uid, owed_amount: owed });
          }
        }
      } else if (split_type === "manual") {
        // split_values expected to be exact amounts array corresponding to participants[]
        if (!Array.isArray(split_values) || split_values.length !== partIds.length) {
          return res.status(400).json({ error: "manual split_values must match participants length" });
        }

        // Build map participant -> manual amount
        const manualMap = new Map<string, number>();
        partIds.forEach((pid, idx) => manualMap.set(pid, Number(split_values[idx] || 0)));

        // Sum manual amounts for oweParticipants
        let manualSum = 0;
        for (const uid of oweParticipants) manualSum += (manualMap.get(uid) || 0);

        if (manualSum === 0) {
          // No manual amounts for oweParticipants -> split equally
          const each = Number(total_amount) / oweParticipants.length;
          finalSplits = oweParticipants.map(uid => ({ user_id: uid, owed_amount: Number(each.toFixed(2)) }));
        } else {
          // If manualSum differs from total_amount (because original manual included payer shares),
          // we rescale the manual amounts for oweParticipants proportionally to sum to total_amount.
          // This ensures owed_amounts for non-payers add up to total_amount.
          for (const uid of oweParticipants) {
            const val = manualMap.get(uid) || 0;
            const owed = Number(((val / manualSum) * Number(total_amount)).toFixed(2));
            finalSplits.push({ user_id: uid, owed_amount: owed });
          }
        }
      } else {
        return res.status(400).json({ error: "Invalid split_type (equal|percentage|manual)" });
      }

      // Last step: small rounding fix — ensure sum(owed_amount) == total_amount (adjust by tiny diff)
      const sumOwed = finalSplits.reduce((s, r) => s + Number(r.owed_amount), 0);
      const diff = Number(Number(total_amount) - sumOwed).toFixed(2);
      if (Number(diff) !== 0) {
        // adjust the first non-payer by the difference
        finalSplits[0].owed_amount = Number((Number(finalSplits[0].owed_amount) + Number(diff)).toFixed(2));
      }

      // insert splits
      await ExpenseModel.addSplits(expense.id, finalSplits);

      return res.status(201).json({ message: "Expense created", expense, splits: finalSplits });
    } catch (err: any) {
      console.error("createExpense error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // ... keep getExpensesForGroup unchanged ...
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
