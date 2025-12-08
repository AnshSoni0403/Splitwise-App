// backend/src/controllers/user.controller.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabaseClient";

/**
 * POST /api/users/lookup
 * body: { identifiers: string[] }
 * returns: { users: [{ id, username, name, email }] }
 */
export async function lookupUsers(req: Request, res: Response) {
  try {
    const { identifiers } = req.body;
    if (!Array.isArray(identifiers) || identifiers.length === 0) {
      return res.status(400).json({ error: "identifiers array required" });
    }

    // build query: search by email OR username (case-insensitive)
    // We'll do a single supabase select with or filters
    // Note: supabase js doesn't support multiple OR easily; we run multiple queries safely
    const lowered = identifiers.map((s: string) => s.trim().toLowerCase());

    // Query by email IN
    const { data: byEmail, error: errEmail } = await supabaseAdmin
      .from("users")
      .select("id, username, name, email")
      .in("email", lowered)
      .ilike("email", `%@%`); // ensures field exists (no-op but keeps type)

    if (errEmail) {
      // ignore and continue to username search; but log
      console.error("lookupUsers email query error:", errEmail);
    }

    // Query by username IN
    const { data: byUsername, error: errUser } = await supabaseAdmin
      .from("users")
      .select("id, username, name, email")
      .in("username", lowered);

    if (errUser) {
      console.error("lookupUsers username query error:", errUser);
    }

    // combine results, unique by id
    const map = new Map<string, any>();
    (byEmail || []).forEach((u: any) => map.set(u.id, u));
    (byUsername || []).forEach((u: any) => map.set(u.id, u));

    const users = Array.from(map.values());

    return res.json({ users });
  } catch (err: any) {
    console.error("lookupUsers fatal:", err);
    return res.status(500).json({ error: err.message || err });
  }
}
