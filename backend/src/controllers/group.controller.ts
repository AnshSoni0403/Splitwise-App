// backend/src/controllers/group.controller.ts
import { Request, Response } from "express";
import { GroupModel } from "../models/group.model";

export const GroupController = {
  // POST /api/groups
  async createGroup(req: Request, res: Response) {
    try {
      const { name, currency, created_by, members } = req.body;

      if (!name) return res.status(400).json({ error: "name is required" });

      // create group
      const group = await GroupModel.create({ name, currency, created_by });

      // add members if provided (array of { user_id, role? })
      if (Array.isArray(members) && members.length > 0) {
        try {
          await GroupModel.addMembers(group.id, members);
        } catch (err) {
          // If member insert fails, log but return group created (or you can rollback manually)
          console.error("Warning: failed to add members:", err);
        }
      }

      return res.status(201).json({ group });
    } catch (err: any) {
      console.error("createGroup error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // POST /api/groups/:id/members
  async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params; // group id
      const { user_id, role } = req.body;
      if (!user_id) return res.status(400).json({ error: "user_id required" });

      const added = await GroupModel.addMember(id, user_id, role || "member");
      return res.status(201).json({ member: added });
    } catch (err: any) {
      console.error("addMember error:", err);
      // detect unique constraint error and return a friendly message
      if (err && err.code === "23505") {
        return res.status(409).json({ error: "User already in group" });
      }
      return res.status(500).json({ error: err.message || err });
    }
  },

  // GET /api/groups/:id
  async getGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const group = await GroupModel.getGroupById(id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      return res.json({ group });
    } catch (err: any) {
      console.error("getGroup error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  }
};
