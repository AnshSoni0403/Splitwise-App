import { supabaseAdmin } from "../config/supabaseClient";

export const UserModel = {
  async createUser(data: { username: string; name: string; email: string; password: string }) {
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return user;
  },

  async findByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data;
  },

  async findByUsername(username: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error) return null;
    return data;
  },

  async findById(id: string) {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  }
};
