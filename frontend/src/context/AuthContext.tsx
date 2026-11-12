"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "user" | "affiliate" | "admin" | string;
  bio?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        const devRole =
          process.env.NODE_ENV === "development" && typeof window !== "undefined"
            ? localStorage.getItem("amiele_dev_role")
            : null;
        setProfile({
          id: data.id,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          role: devRole || data.role,
          bio: data.bio,
          avatarUrl: data.avatar_url,
        });
      }
    } catch (err) {
      console.warn("Profile fetch error:", err);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
        const devRole = localStorage.getItem("amiele_dev_role");
        if (devRole === "admin") {
          setUser({
            id: "dev-admin-id",
            email: "admin@amiele.et",
            app_metadata: {},
            user_metadata: { full_name: "Amiele Admin" },
            aud: "authenticated",
            created_at: new Date().toISOString(),
          } as any);
          setProfile({
            id: "dev-admin-id",
            fullName: "Amiele Admin",
            email: "admin@amiele.et",
            role: "admin",
          });
        } else {
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
