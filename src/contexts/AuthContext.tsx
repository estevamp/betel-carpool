import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  sex: "Homem" | "Mulher" | null;
  is_exempt: boolean;
  pix_key: string | null;
  is_married: boolean;
  is_driver: boolean;
  show_tips: boolean;
  spouse_id: string | null;
  congregation_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Finds a profile by user_id first, then falls back to case-insensitive email search.
 * Handles duplicate profiles by prioritizing the one with a congregation_id.
 */
async function findProfile(userId: string, userEmail: string): Promise<Profile | null> {
  // 1. Try by user_id (strongest link)
  const { data: idProfile, error: idError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (idProfile) {
    console.log(`[Auth] Profile found by user_id: ${idProfile.full_name}`);
    return idProfile as Profile;
  }

  if (idError) {
    console.warn("[Auth] Error finding profile by user_id:", idError.message);
  }

  // 2. Fallback: case-insensitive email search using ilike
  const { data: emailProfiles, error: emailError } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", userEmail);

  if (emailError) {
    console.error("[Auth] Error finding profile by email:", emailError.message);
    return null;
  }

  if (!emailProfiles || emailProfiles.length === 0) {
    console.log("[Auth] No profile found for email:", userEmail);
    return null;
  }

  // 3. If multiple profiles, prioritize the one with congregation_id
  if (emailProfiles.length > 1) {
    console.warn(`[Auth] Found ${emailProfiles.length} profiles for email ${userEmail}, prioritizing one with congregation_id`);
    const withCongregation = emailProfiles.find(p => p.congregation_id);
    return (withCongregation || emailProfiles[0]) as Profile;
  }

  return emailProfiles[0] as Profile;
}

/**
 * Links a profile to a user_id if not already linked.
 */
async function linkProfileToUser(profile: Profile, userId: string): Promise<Profile> {
  if (profile.user_id === userId) return profile;

  console.log(`[Auth] Linking profile ${profile.id} to user ${userId}`);
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ user_id: userId })
    .eq("id", profile.id)
    .select()
    .single();

  if (error) {
    console.error("[Auth] Error linking profile:", error.message);
    return profile; // Return unlinked profile so user isn't blocked
  }

  return updated as Profile;
}

/**
 * Fetches admin/super_admin roles for a user.
 */
async function fetchRoles(userId: string) {
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);

  const roles = roleData || [];
  return {
    isAdmin: roles.some(r => r.role === "admin" || r.role === "super_admin"),
    isSuperAdmin: roles.some(r => r.role === "super_admin"),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (userId: string, userEmail: string) => {
    try {
      if (!userEmail) {
        console.error("[Auth] No email available");
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      const normalizedEmail = userEmail.toLowerCase().trim();

      // Find profile
      const foundProfile = await findProfile(userId, normalizedEmail);

      if (!foundProfile) {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      // Link profile to user if needed
      const linkedProfile = foundProfile.congregation_id
        ? await linkProfileToUser(foundProfile, userId)
        : foundProfile;

      setProfile(linkedProfile);

      // Only fetch roles if profile has congregation (user is fully set up)
      if (linkedProfile.congregation_id) {
        const { isAdmin: admin, isSuperAdmin: superAdmin } = await fetchRoles(userId);
        setIsAdmin(admin);
        setIsSuperAdmin(superAdmin);
      } else {
        setIsAdmin(false);
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error("[Auth] Unexpected error loading profile:", error);
      setProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.email) {
      await loadProfile(user.id, user.email);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    // Listener for ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        // During initial load, skip — initializeAuth handles it
        if (!initialLoadDone) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            if (isMounted) {
              await loadProfile(session.user.id, session.user.email || "");
            }
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }
      }
    );

    // INITIAL load (controls isLoading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id, session.user.email || "");
        }
      } catch (error) {
        console.error("[Auth] Error initializing:", error);
      } finally {
        if (isMounted) {
          initialLoadDone = true;
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isSuperAdmin,
        isLoading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
