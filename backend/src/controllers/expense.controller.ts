import { Request, Response } from "express";
import { ExpenseModel } from "../models/expense.model";

export const ExpenseController = {

  // ------------------------------------------------------------
  // POST /api/expenses
  // ------------------------------------------------------------
  async createExpense(req: Request, res: Response) {
    try {
      const {
        group_id,
        description,
        total_amount,
        created_by,
        payers,          // [{ user_id, paid_amount }]
        participants,    // [user_id,user_id...]
        split_type,      // "equal" | "percentage" | "manual"
        split_values     // percentage or manual values
      } = req.body;

      // Validation
      if (!group_id || !total_amount || !payers || !participants) {
        return res.status(400).json({
          error: "group_id, total_amount, payers, participants are required."
        });
      }

      if (!created_by) {
        return res.status(400).json({ error: "created_by is required" });
      }

      // Create main expense
      const expense = await ExpenseModel.createExpense({
        group_id,
        description,
        total_amount,
        created_by
      });

      // Insert payers
      await ExpenseModel.addPayers(expense.id, payers);

      // ------------------------------------------------------------
      // SPLIT LOGIC
      // ------------------------------------------------------------
      let finalSplits: any[] = [];

      if (split_type === "equal") {
        const share = Number(total_amount) / participants.length;

        finalSplits = participants.map((user_id: string) => ({
          user_id,
          owed_amount: Number(share.toFixed(2))
        }));
      }

      else if (split_type === "percentage") {
        if (!split_values || split_values.length !== participants.length) {
          return res.status(400).json({
            error: "percentage split_values must match participants count"
          });
        }

        finalSplits = participants.map((user_id: string, index: number) => ({
          user_id,
          owed_amount: Number(((split_values[index] / 100) * total_amount).toFixed(2))
        }));
      }

      else if (split_type === "manual") {
        if (!split_values || split_values.length !== participants.length) {
          return res.status(400).json({
            error: "manual split_values must match participants count"
          });
        }

        const sum = split_values.reduce((a: number, b: number) => a + b, 0);
        if (sum !== Number(total_amount)) {
          return res.status(400).json({
            error: "manual split_values must sum to total_amount"
          });
        }

        finalSplits = participants.map((user_id: string, index: number) => ({
          user_id,
          owed_amount: Number(split_values[index])
        }));
      }

      else {
        return res.status(400).json({
          error: "Invalid split_type. Use equal | percentage | manual"
        });
      }

      // Insert splits
      await ExpenseModel.addSplits(expense.id, finalSplits);

      return res.status(201).json({
        message: "Expense created successfully",
        expense
      });

    } catch (err: any) {
      console.error("createExpense error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // ------------------------------------------------------------
  // GET /api/expenses/group/:groupId
  // ------------------------------------------------------------
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
