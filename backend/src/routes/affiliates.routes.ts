import { Router } from "express";
import {
  recordClick,
  getAffiliateStats,
  submitApplication,
  submitWithdrawal,
} from "../controllers/affiliates.controller.js";
import { getApplicationStatusForUser } from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/click", recordClick);
router.get("/stats/:identifier", requireAuth, getAffiliateStats);
router.post("/apply", submitApplication);
router.get("/application-status/:userId", getApplicationStatusForUser);
router.post("/withdraw", requireAuth, submitWithdrawal);

export default router;
