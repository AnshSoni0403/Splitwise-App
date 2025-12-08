import { Router } from "express";
import { ExpenseController } from "../controllers/expense.controller";
import { GroupController } from "../controllers/group.controller";

const router = Router();

// Create expense
router.post("/", ExpenseController.createExpense);

// Get expenses for a group
router.get("/group/:groupId", ExpenseController.getExpensesForGroup);

router.get("/:id/balances", GroupController.getGroupBalances);

export default router;
