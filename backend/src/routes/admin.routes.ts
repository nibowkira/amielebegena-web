import { Router } from "express";
import {
  getAnalytics,
  getAffiliateApplications,
  reviewAffiliateApplication,
  getWithdrawalRequests,
  reviewWithdrawal,
} from "../controllers/admin.controller.js";

const router = Router();

router.get("/analytics", getAnalytics);
router.get("/applications", getAffiliateApplications);
router.patch("/applications/:id", reviewAffiliateApplication);
router.get("/withdrawals", getWithdrawalRequests);
router.patch("/withdrawals/:id", reviewWithdrawal);

export default router;
