import { Request, Response } from "express";
import { ExpenseModel } from "../models/expense.model";

function toCents(amount: number) {
  return Math.round(Number(amount) * 100);
}
function fromCents(cents: number) {
  return Number((cents / 100).toFixed(2));
}

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
        payers,
        participants,
        split_type,
        split_values
      } = req.body;

      // Accept different names for the split-between field (defensive)
      const rawSplitBetween =
        req.body.split_between ||
        req.body.splitBetween ||
        req.body.splitAmong ||
        req.body.split_between_ids ||
        req.body.splitBetweenIds ||
        null;

      console.log("[createExpense] rawSplitBetween (raw):", JSON.stringify(rawSplitBetween));

      // defensive validation
      total_amount = Number(total_amount || 0);
      if (!group_id || !total_amount || !Array.isArray(payers) || !Array.isArray(participants)) {
        return res.status(400).json({ error: "group_id, total_amount, payers, participants are required." });
      }
      if (!created_by) return res.status(400).json({ error: "created_by is required" });

      // ensure payer(s) included in participants set (server-side safety)
      const payerIds = new Set(payers.map((p: any) => p.user_id));
      const participantsSet = new Set(participants);
      for (const pid of payerIds) participantsSet.add(pid);
      participants = Array.from(participantsSet);

      // Resolve splitBetween array defensively:
      let splitBetween: string[] | null = null;
      if (Array.isArray(rawSplitBetween) && rawSplitBetween.length > 0) {
        // normalize to strings and ensure they are included in participants set
        splitBetween = Array.from(new Set(rawSplitBetween.map((x: any) => String(x))));
        for (const s of splitBetween) participantsSet.add(s);
        // ensure splitBetween items present in final participants list
        participants = Array.from(participantsSet);
      }

      // If no rawSplitBetween was provided, splitBetween remains null and we'll default to participants
      const splitAmong = Array.isArray(splitBetween) && splitBetween.length > 0 ? splitBetween : participants.slice();

      console.log("[createExpense] splitBetween resolved to:", JSON.stringify(splitBetween));
      console.log("[createExpense] final participants used for storage:", JSON.stringify(participants));
      console.log("[createExpense] splitAmong (who will share):", JSON.stringify(splitAmong));

      // Create expense
      const expense = await ExpenseModel.createExpense({
        group_id,
        description,
        total_amount,
        created_by
      });

      // Insert payer rows
      await ExpenseModel.addPayers(expense.id, payers);

      // Build finalSplits for ALL participants (owed_amount for each)
      const finalSplits: { user_id: string; owed_amount: number }[] = [];
      const totalCents = toCents(total_amount);

      if (!split_type || split_type === "equal") {
        const n = splitAmong.length;
        if (n === 0) {
          for (const uid of participants) finalSplits.push({ user_id: uid, owed_amount: 0 });
        } else {
          const base = Math.floor(totalCents / n);
          const remainder = totalCents - base * n;
          const owedCentsMap = new Map<string, number>();
          for (let i = 0; i < n; i++) {
            const uid = splitAmong[i];
            owedCentsMap.set(uid, base + (i < remainder ? 1 : 0));
          }
          for (const uid of participants) {
            finalSplits.push({ user_id: uid, owed_amount: fromCents(owedCentsMap.get(uid) || 0) });
          }
        }
      } else if (split_type === "percentage") {
        // Accept percentage arrays matching splitAmong or participants
        let percents: number[] = [];
        if (Array.isArray(split_values) && split_values.length === splitAmong.length) {
          percents = split_values.map((v: any) => Number(v || 0));
        } else if (Array.isArray(split_values) && split_values.length === participants.length) {
          const pmap = new Map<string, number>();
          participants.forEach((uid: string, idx: number) => pmap.set(uid, Number(split_values[idx] || 0)));
          percents = splitAmong.map(uid => Number(pmap.get(uid) || 0));
        } else {
          return res.status(400).json({ error: "percentage split_values length must match split_between or participants length" });
        }
        const sumPct = percents.reduce((a, b) => a + b, 0);
        if (sumPct <= 0) return res.status(400).json({ error: "percentage values must sum to > 0" });

        const owedCentsMap = new Map<string, number>();
        let assigned = 0;
        for (let i = 0; i < splitAmong.length; i++) {
          const uid = splitAmong[i];
          const cents = Math.floor((percents[i] / sumPct) * totalCents);
          owedCentsMap.set(uid, cents);
          assigned += cents;
        }
        let rem = totalCents - assigned;
        let idx = 0;
        while (rem > 0) {
          const uid = splitAmong[idx % splitAmong.length];
          owedCentsMap.set(uid, (owedCentsMap.get(uid) || 0) + 1);
          rem--;
          idx++;
        }
        for (const uid of participants) finalSplits.push({ user_id: uid, owed_amount: fromCents(owedCentsMap.get(uid) || 0) });
      } else if (split_type === "manual") {
        // manual values mapping similar to percentage handling
        let manual: number[] = [];
        if (Array.isArray(split_values) && split_values.length === splitAmong.length) {
          manual = split_values.map((v: any) => Number(v || 0));
        } else if (Array.isArray(split_values) && split_values.length === participants.length) {
          const pmap = new Map<string, number>();
          participants.forEach((uid: string, idx: number) => pmap.set(uid, Number(split_values[idx] || 0)));
          manual = splitAmong.map(uid => Number(pmap.get(uid) || 0));
        } else {
          return res.status(400).json({ error: "manual split_values length must match split_between or participants length" });
        }

        const manualCents = manual.map(v => toCents(v));
        const sumManual = manualCents.reduce((a, b) => a + b, 0);

        if (sumManual === 0) {
          // fallback equal
          const n = splitAmong.length;
          const base = Math.floor(totalCents / n);
          const remainder = totalCents - base * n;
          const owedCentsMap = new Map<string, number>();
          for (let i = 0; i < n; i++) {
            const uid = splitAmong[i];
            owedCentsMap.set(uid, base + (i < remainder ? 1 : 0));
          }
          for (const uid of participants) finalSplits.push({ user_id: uid, owed_amount: fromCents(owedCentsMap.get(uid) || 0) });
        } else {
          const owedCentsMap = new Map<string, number>();
          let assigned = 0;
          for (let i = 0; i < splitAmong.length; i++) {
            const uid = splitAmong[i];
            const cents = Math.floor((manualCents[i] / sumManual) * totalCents);
            owedCentsMap.set(uid, cents);
            assigned += cents;
          }
          let rem = totalCents - assigned;
          let idx2 = 0;
          while (rem > 0) {
            const uid = splitAmong[idx2 % splitAmong.length];
            owedCentsMap.set(uid, (owedCentsMap.get(uid) || 0) + 1);
            rem--;
            idx2++;
          }
          for (const uid of participants) finalSplits.push({ user_id: uid, owed_amount: fromCents(owedCentsMap.get(uid) || 0) });
        }
      } else {
        return res.status(400).json({ error: "Invalid split_type" });
      }

      console.log("[createExpense] finalSplits:", JSON.stringify(finalSplits, null, 2));

      // Save splits
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
