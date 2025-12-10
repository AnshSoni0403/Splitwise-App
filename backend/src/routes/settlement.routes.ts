// backend/src/routes/settlement.routes.ts
import { Router } from "express";
import { SettlementController } from "../controllers/settlement.controller";

const router = Router();

router.post("/", SettlementController.createSettlement);
router.get("/group/:groupId", SettlementController.getSettlementsForGroup);
router.delete("/:id", SettlementController.deleteSettlement);

export default router;
