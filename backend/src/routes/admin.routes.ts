import { Router } from "express";
import {
  getAnalytics,
  getAffiliateApplications,
  reviewAffiliateApplication,
  getWithdrawalRequests,
  reviewWithdrawal,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Enforce admin permissions server-side on all admin routes
router.use(requireAdmin);

router.get("/analytics", getAnalytics);
router.get("/applications", getAffiliateApplications);
router.patch("/applications/:id", reviewAffiliateApplication);
router.get("/withdrawals", getWithdrawalRequests);
router.patch("/withdrawals/:id", reviewWithdrawal);

export default router;
