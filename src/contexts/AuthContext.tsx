import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
 * Checks both user_roles table and congregation_administrators table.
 */
async function fetchRoles(userId: string, profileId: string) {
  // Check user_roles table for admin/super_admin roles
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);

  const roles = roleData || [];
  const hasAdminRole = roles.some(r => r.role === "admin" || r.role === "super_admin");
  const hasSuperAdminRole = roles.some(r => r.role === "super_admin");

  // Check congregation_administrators table for congregation admin designation
  const { data: congAdminData } = await supabase
    .from("congregation_administrators")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  const isCongregationAdmin = !!congAdminData;

  return {
    isAdmin: hasAdminRole || isCongregationAdmin,
    isSuperAdmin: hasSuperAdminRole,
  };
}

/**
 * Verifica se deve pular o reload do perfil baseado no evento
 */
function shouldSkipProfileReload(
  event: string, 
  profileRef: Profile | null, 
  sessionUserId?: string
): boolean {
  const SKIP_EVENTS = ['TOKEN_REFRESHED', 'USER_UPDATED'];
  
  if (SKIP_EVENTS.includes(event)) return true;
  
  if (event === 'SIGNED_IN' && profileRef?.user_id === sessionUserId) {
    return true;
  }

  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use ref to track profile state in event listeners
  const profileRef = useRef<Profile | null>(null);
  const lastProfileLoadRef = useRef<number>(0);
  const PROFILE_LOAD_COOLDOWN = 5000; // 5 seconds

  // Funções auxiliares
  const canLoadProfile = (): boolean => {
    const now = Date.now();
    if (now - lastProfileLoadRef.current < PROFILE_LOAD_COOLDOWN) {
      return false;
    }
    lastProfileLoadRef.current = now;
    return true;
  };

  const validateAndNormalizeEmail = (email: string): string => {
    if (!email) {
      throw new Error("No email available");
    }
    return email.toLowerCase().trim();
  };

  const resetProfileState = () => {
    setProfile(null);
    profileRef.current = null;
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  const ensureProfileLinked = async (profile: Profile, userId: string): Promise<Profile> => {
    return profile.congregation_id 
      ? await linkProfileToUser(profile, userId)
      : profile;
  };

  const updateProfileAndRoles = async (profile: Profile, userId: string) => {
    setProfile(profile);
    profileRef.current = profile;

    if (profile.congregation_id) {
      const { isAdmin: admin, isSuperAdmin: superAdmin } = await fetchRoles(userId, profile.id);
      setIsAdmin(admin);
      setIsSuperAdmin(superAdmin);
    } else {
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  const resetAuthState = () => {
    setProfile(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsLoading(false);
  };

  const loadProfile = async (userId: string, userEmail: string) => {
    if (!canLoadProfile()) {
      console.log('[Auth] Skipping profile reload (cooldown active)');
      return;
    }

    try {
      const normalizedEmail = validateAndNormalizeEmail(userEmail);
      const foundProfile = await findProfile(userId, normalizedEmail);
      
      if (!foundProfile) {
        resetProfileState();
        return;
      }

      const linkedProfile = await ensureProfileLinked(foundProfile, userId);
      await updateProfileAndRoles(linkedProfile, userId);
      
    } catch (error) {
      console.error("[Auth] Unexpected error loading profile:", error);
      resetProfileState();
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

    const handleProfileLoad = (user: User) => {
      if (!profileRef.current || profileRef.current.user_id !== user.id) {
        console.log('[Auth] Profile needs reload - loading...');
        setTimeout(async () => {
          if (isMounted) {
            try {
              await loadProfile(user.id, user.email || "");
            } finally {
              if (isMounted) setIsLoading(false);
            }
          }
        }, 0);
      } else {
        console.log('[Auth] Profile already loaded, skipping reload');
        setIsLoading(false);
      }
    };

    // Listener for ONGOING auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted || !initialLoadDone) return;

        // Verificar se deve pular o reload
        if (shouldSkipProfileReload(event, profileRef.current, session?.user?.id)) {
          console.log(`[Auth] Skipping profile reload for event: ${event}`);
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        console.log(`[Auth] Processing auth event: ${event}`);

        if (event === 'SIGNED_IN') {
          setIsLoading(true);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          handleProfileLoad(session.user);
        } else {
          resetAuthState();
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
