// backend/src/routes/group.routes.ts
import { Router } from "express";
import { GroupController } from "../controllers/group.controller";
import { supabaseAdmin } from "../config/supabaseClient";

const router = Router();

router.get("/all", async (_req, res) => {
  const { data, error } = await supabaseAdmin.from("groups").select("*");
  if (error) return res.status(500).json({ error });
  return res.json({ groups: data });
});


router.post("/", GroupController.createGroup);
router.post("/:id/members", GroupController.addMember);
router.get("/:id", GroupController.getGroup);

export default router;
