import { Router } from "express";
import { lookupUsers } from "../controllers/user.controller";

const router = Router();

router.post("/lookup", lookupUsers);

export default router;
