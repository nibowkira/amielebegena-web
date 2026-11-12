import { Request, Response, NextFunction } from "express";
import { supabase } from "../utils/supabase.js";

export interface AuthenticatedRequest extends Request {
  user?: any;
  userRole?: string;
}

/**
 * Middleware to require authenticated user with role === 'admin'
 * Checks 'Authorization: Bearer <token>' header or x-admin-key in dev
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const adminKey = req.headers["x-admin-key"];

    // Allow dev bypass key if in development environment
    if (
      process.env.NODE_ENV === "development" &&
      adminKey === "amiele-dev-admin-override"
    ) {
      req.user = { id: "dev-admin", email: "admin@amielebegena.com" };
      req.userRole = "admin";
      return next();
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing authentication bearer token.",
      });
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired authentication token.",
      });
    }

    // Check user profile role in Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden: Administrator permissions are required for this action.",
      });
    }

    req.user = user;
    req.userRole = profile.role;
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      error: "Authentication service error.",
    });
  }
};

/**
 * Middleware to require any authenticated user.
 * Validates 'Authorization: Bearer <token>' header with Supabase Auth
 * and attaches user object and profile role to req.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Missing authentication bearer token.",
      });
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired authentication token.",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    req.user = user;
    req.userRole = profile?.role || "user";
    next();
  } catch (err: any) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      error: "Authentication service error.",
    });
  }
};
