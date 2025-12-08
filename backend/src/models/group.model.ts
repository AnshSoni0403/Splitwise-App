// backend/src/models/group.model.ts
import { supabaseAdmin } from "../config/supabaseClient";

export type CreateGroupPayload = {
  name: string;
  currency?: string;
  created_by?: string | null;
};

export const GroupModel = {
  async create(payload: CreateGroupPayload) {
    const { data, error } = await supabaseAdmin
      .from("groups")
      .insert([{
        name: payload.name,
        currency: payload.currency || "INR",
        created_by: payload.created_by || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addMembers(groupId: string, members: { user_id: string; role?: string }[]) {
    if (!members || members.length === 0) return [];

    const rows = members.map(m => ({
      group_id: groupId,
      user_id: m.user_id,
      role: m.role || "member"
    }));

    const { data, error } = await supabaseAdmin
      .from("group_members")
      .insert(rows)
      .select();

    if (error) throw error;
    return data || [];
  },

  async addMember(groupId: string, userId: string, role = "member") {
    const { data, error } = await supabaseAdmin
      .from("group_members")
      .insert([{ group_id: groupId, user_id: userId, role }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getGroupById(id: string) {
    // return group + members (with user info if available)
    const { data: groupRows, error: gErr } = await supabaseAdmin
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (gErr) {
      // if not found or other error, throw it
      if (gErr.code === "PGRST116") return null;
      throw gErr;
    }

    const { data: members, error: mErr } = await supabaseAdmin
      .from("group_members")
      .select("id, role, created_at, user_id, users:user_id(id, username, name, email)")
      .eq("group_id", id)
      .order("created_at", { ascending: true });

    if (mErr) throw mErr;

    return {
      ...groupRows,
      members: members || []
    };
  }
};
