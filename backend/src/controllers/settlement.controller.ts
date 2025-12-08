import { Request, Response } from "express";
import { SettlementModel } from "../models/settlement.model";

export const SettlementController = {

  // POST /api/settlements
  async createSettlement(req: Request, res: Response) {
    try {
      const { group_id, from_user, to_user, amount } = req.body;

      if (!group_id || !from_user || !to_user || !amount) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const settlement = await SettlementModel.createSettlement({
        group_id,
        from_user,
        to_user,
        amount
      });

      return res.status(201).json({ settlement });

    } catch (err: any) {
      console.error("createSettlement error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },


  // GET /api/settlements/group/:groupId
  async getSettlementHistory(req: Request, res: Response) {
    try {
      const { groupId } = req.params;

      const settlements = await SettlementModel.findByGroup(groupId);

      return res.json({ settlements });

    } catch (err: any) {
      console.error("getSettlementHistory error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  }
};
