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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // Get user email from current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        console.error("[fetchProfile] No session or email found");
        return;
      }

      const userEmail = session.user.email.toLowerCase();
      console.log(`[fetchProfile] Searching for profile by email: ${userEmail}`);

      // Search for profile by email (regardless of user_id)
      const { data: emailProfile, error: emailProfileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", userEmail)
        .maybeSingle();

      if (emailProfileError) {
        console.error("[fetchProfile] Error finding profile by email:", emailProfileError);
        return;
      }

      if (!emailProfile) {
        console.log("[fetchProfile] No profile found for this email.");
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      console.log(`[fetchProfile] Profile found:`, emailProfile);

      // Check if profile has congregation_id
      if (!emailProfile.congregation_id) {
        console.log("[fetchProfile] Profile found but no congregation_id.");
        setProfile(emailProfile as Profile);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      // Profile has congregation_id, link user_id if needed
      if (!emailProfile.user_id || emailProfile.user_id !== userId) {
        console.log(`[fetchProfile] Linking user_id: ${userId}`);
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update({ user_id: userId })
          .eq("id", emailProfile.id)
          .select()
          .single();

        if (updateError) {
          console.error("[fetchProfile] Error linking profile to user:", updateError);
          return;
        }

        setProfile(updatedProfile as Profile);
        console.log(`[fetchProfile] Profile linked: ${updatedProfile.full_name}`);
      } else {
        setProfile(emailProfile as Profile);
        console.log(`[fetchProfile] Profile already linked: ${emailProfile.full_name}`);
      }

      // Check if user is admin or super admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"]);

      const roles = roleData || [];
      const currentIsAdmin = roles.some(r => r.role === "admin" || r.role === "super_admin");
      const currentIsSuperAdmin = roles.some(r => r.role === "super_admin");

      setIsAdmin(currentIsAdmin);
      setIsSuperAdmin(currentIsSuperAdmin);

    } catch (error) {
      console.error("Error in fetchProfile:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;

    const fetchProfileWithRetry = async (userId: string, userEmail: string, attempt = 1) => {
      try {
        console.log(`[AuthContext] fetchProfileWithRetry called for userId: ${userId}, email: ${userEmail}, attempt: ${attempt}`);
        
        if (!userEmail) {
          console.error("User has no email");
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        if (!isMounted) {
          console.log(`[AuthContext] Component unmounted, aborting profile fetch`);
          return;
        }

        console.log(`[AuthContext] Searching for profile by email: ${userEmail}`);

        // STEP 1: Search for profile by email (regardless of user_id)
        const { data: emailProfile, error: emailProfileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", userEmail)
          .maybeSingle();

        if (emailProfileError) {
          console.error("[AuthContext] Error finding profile by email:", emailProfileError);
          if (emailProfileError.code === '42P17' && attempt < 3) {
            console.log(`Retrying profile fetch in 2 seconds...`);
            retryTimeout = setTimeout(() => fetchProfileWithRetry(userId, userEmail, attempt + 1), 2000);
            return;
          }
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        // STEP 2: If no profile found by email, user needs to be invited
        if (!emailProfile) {
          console.log("[AuthContext] No profile found for this email. User needs to be invited.");
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        console.log(`[AuthContext] Profile found by email:`, emailProfile);

        // STEP 3: Check if profile has congregation_id
        if (!emailProfile.congregation_id) {
          console.log("[AuthContext] Profile found but no congregation_id. Access restricted.");
          // Set profile so ProtectedRoute can show restricted access message
          setProfile(emailProfile as Profile);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setIsLoading(false);
          return;
        }

        // STEP 4: Profile has congregation_id, check if it needs user_id
        if (!emailProfile.user_id || emailProfile.user_id !== userId) {
          console.log(`[AuthContext] Profile has congregation but no user_id. Linking user_id: ${userId}`);
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update({ user_id: userId })
            .eq("id", emailProfile.id)
            .select()
            .single();

          if (updateError) {
            console.error("[AuthContext] Error linking profile to user:", updateError);
            setProfile(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsLoading(false);
            return;
          }

          console.log(`[AuthContext] Profile linked successfully: ${updatedProfile.full_name}, User ID: ${updatedProfile.user_id}, Congregation ID: ${updatedProfile.congregation_id}`);
          setProfile(updatedProfile as Profile);
        } else {
          // Profile already has correct user_id
          console.log(`[AuthContext] Profile already linked: ${emailProfile.full_name}, User ID: ${emailProfile.user_id}, Congregation ID: ${emailProfile.congregation_id}`);
          setProfile(emailProfile as Profile);
        }

        // Check if user is admin or super admin
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["admin", "super_admin"]);

        const roles = roleData || [];
        const currentIsAdmin = roles.some(r => r.role === "admin" || r.role === "super_admin");
        const currentIsSuperAdmin = roles.some(r => r.role === "super_admin");

        setIsAdmin(currentIsAdmin);
        setIsSuperAdmin(currentIsSuperAdmin);
        
        console.log(`[AuthContext] Profile loading complete, setting isLoading to false`);
        setIsLoading(false);

      } catch (error) {
        console.error("Unhandled error in fetchProfileWithRetry:", error);
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    };

    const handleAuthStateChange = async (event: string, session: Session | null) => {
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fire profile fetch without awaiting - it will set isLoading(false) when done
        console.log('[AuthContext] User authenticated, profile fetch initiated');
        const userEmail = session.user.email?.toLowerCase() || '';
        fetchProfileWithRetry(session.user.id, userEmail);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        handleAuthStateChange('INITIAL_SESSION', session);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(retryTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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
