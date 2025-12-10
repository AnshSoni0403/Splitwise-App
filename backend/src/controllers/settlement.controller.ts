// backend/src/controllers/settlement.controller.ts
import { Request, Response } from "express";
import { SettlementModel } from "../models/settlement.model";

export const SettlementController = {
  // POST /api/settlements
  async createSettlement(req: Request, res: Response) {
    try {
      const { group_id, from_user, to_user, amount, note, created_by } = req.body;
      if (!group_id || !from_user || !to_user || !amount) {
        return res.status(400).json({ error: "group_id, from_user, to_user, amount are required" });
      }
      if (from_user === to_user) {
        return res.status(400).json({ error: "from_user and to_user cannot be the same" });
      }
      const amt = Number(amount);
      if (isNaN(amt) || amt <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }

      const settlement = await SettlementModel.create({
        group_id,
        from_user,
        to_user,
        amount: Number(amt.toFixed(2)),
        note: note || null,
        created_by: created_by || null
      });

      return res.status(201).json({ settlement });
    } catch (err: any) {
      console.error("createSettlement error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // GET /api/settlements/group/:groupId
  async getSettlementsForGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      if (!groupId) return res.status(400).json({ error: "groupId required" });
      const settlements = await SettlementModel.findByGroup(groupId);
      return res.json({ settlements });
    } catch (err: any) {
      console.error("getSettlementsForGroup error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // DELETE /api/settlements/:id
  async deleteSettlement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "id required" });
      await SettlementModel.deleteById(id);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("deleteSettlement error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  }
};
