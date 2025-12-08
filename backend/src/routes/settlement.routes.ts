import { Router } from "express";
import { SettlementController } from "../controllers/settlement.controller";

const router = Router();

router.post("/", SettlementController.createSettlement);

router.get("/group/:groupId", SettlementController.getSettlementHistory);

export default router;
