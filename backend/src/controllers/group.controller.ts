// backend/src/controllers/group.controller.ts
import { Request, Response } from "express";
import { GroupModel } from "../models/group.model";
import { supabaseAdmin } from "../config/supabaseClient";
import { ExpenseModel } from "../models/expense.model";
import { SettlementModel } from "../models/settlement.model";
import { computeGroupBalances } from "../utils/balances";

/**
 * Resolve member entries:
 * members[] may contain:
 *   { user_id: "..." }
 *   { identifier: "emailOrUsername" }
 *   { email: "..." }
 *   { username: "..." }
 */
async function resolveMembersInput(members: any[]) {
  const finalList: { user_id: string; role: string }[] = [];

  // Collect identifiers that need lookup
  const identifiers = members
    .filter(m => !m.user_id)
    .map(m =>
      (m.identifier || m.email || m.username || "")
        .toString()
        .trim()
        .toLowerCase()
    );

  // Lookup loop (email OR username)
  const lookupResults: any[] = [];
  for (const id of identifiers) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, username, email, name")
      .or(`email.ilike.${id},username.ilike.${id}`);

    if (data && data.length > 0) {
      lookupResults.push(data[0]);
    }
  }

  for (const m of members) {
    if (m.user_id) {
      // direct user_id
      finalList.push({ user_id: m.user_id, role: m.role || "member" });
    } else {
      const ident = (m.identifier || m.email || m.username || "")
        .toString()
        .trim()
        .toLowerCase();

      const found = lookupResults.find(
        u =>
          (u.email || "").toLowerCase() === ident ||
          (u.username || "").toLowerCase() === ident
      );

      if (found) {
        finalList.push({ user_id: found.id, role: m.role || "member" });
      }
      // If not found → skip. You may choose to return an error instead.
    }
  }

  return finalList;
}

export const GroupController = {
  // -------------------------------------------------------------------------
  // POST /api/groups
  // -------------------------------------------------------------------------
  async createGroup(req: Request, res: Response) {
    try {
      const { name, currency, created_by, members } = req.body;

      if (!name) return res.status(400).json({ error: "Group name is required" });
      if (!created_by) return res.status(400).json({ error: "created_by is required" });

      // Create Group
      const group = await GroupModel.create({ name, currency, created_by });

      // Always add creator as admin
      const baseMembers = [{ user_id: created_by, role: "admin" }];

      let finalMembers = baseMembers;

      if (Array.isArray(members) && members.length > 0) {
        const resolved = await resolveMembersInput(members);
        finalMembers = [...baseMembers, ...resolved];

        // Deduplicate by user_id
        const unique = new Map();
        for (const m of finalMembers) {
          unique.set(m.user_id, m);
        }
        finalMembers = Array.from(unique.values());

        // Insert into group_members
        if (finalMembers.length > 0) {
          await GroupModel.addMembers(group.id, finalMembers);
        }
      }

      return res.status(201).json({ group });
    } catch (err: any) {
      console.error("createGroup error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  },

  // -------------------------------------------------------------------------
  // POST /api/groups/:id/members
  // Add single member later — supports user_id OR identifier
  // -------------------------------------------------------------------------
  async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { user_id, identifier, email, username, role } = req.body;

      let finalUserId = user_id;

      // If identifier was provided, resolve it
      if (!finalUserId && (identifier || email || username)) {
        const ident = (identifier || email || username).toString().trim().toLowerCase();

        const { data } = await supabaseAdmin
          .from("users")
          .select("id, email, username")
          .or(`email.ilike.${ident},username.ilike.${ident}`);

        if (!data || data.length === 0) {
          return res.status(404).json({ error: "User not found for identifier" });
        }

        finalUserId = data[0].id;
      }

      if (!finalUserId) {
        return res.status(400).json({ error: "user_id or identifier is required" });
      }

      const added = await GroupModel.addMember(id, finalUserId, role || "member");
      return res.status(201).json({ member: added });
    } catch (err: any) {
      console.error("addMember error:", err);

      if (err.code === "23505") {
        return res.status(409).json({ error: "User already in group" });
      }

      return res.status(500).json({ error: err.message || err });
    }
  },

  // -------------------------------------------------------------------------
  // GET /api/groups/:id
  // -------------------------------------------------------------------------
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
  },

  async getGroupBalances(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Use the centralized computeGroupBalances utility that includes both expenses AND settlements
      const balances = await computeGroupBalances(id);

      // Round values to 2 decimals
      Object.keys(balances).forEach(k => {
        balances[k] = Number(balances[k].toFixed(2));
      });

      return res.json({ balances });
    } catch (err: any) {
      console.error("getGroupBalances error:", err);
      return res.status(500).json({ error: err.message || err });
    }
  }
};

