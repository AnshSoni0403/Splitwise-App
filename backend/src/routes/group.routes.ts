// backend/src/routes/group.routes.ts
import { Router } from "express";
import { GroupController } from "../controllers/group.controller";
import { supabaseAdmin } from "../config/supabaseClient";

const router = Router();

router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // get all group_ids where user is a member
    const { data: memberships, error: err1 } = await supabaseAdmin
      .from("group_members")
      .select("group_id")
      .eq("user_id", userId);

    if (err1) return res.status(500).json({ error: err1.message });

    if (!memberships || memberships.length === 0)
      return res.json({ groups: [] });

    const groupIds = memberships.map((m) => m.group_id);

    // fetch group details
    const { data: groups, error: err2 } = await supabaseAdmin
      .from("groups")
      .select("*")
      .in("id", groupIds);

    if (err2) return res.status(500).json({ error: err2.message });

    return res.json({ groups });
  } catch (err: any) {
    console.error("Groups for user error:", err);
    return res.status(500).json({ error: err.message });
  }
});


router.get("/all", async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("groups").select("*");
  if (error) return res.status(500).json({ error });
  return res.json({ groups: data });
});


router.post("/", GroupController.createGroup);
router.post("/:id/members", GroupController.addMember);
router.get("/:id", GroupController.getGroup);

export default router;
