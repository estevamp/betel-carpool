import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
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
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      // If profile doesn't exist for the current userId, try to find and link an existing profile by email
      if (!profileData) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const userEmail = userData.user.email?.toLowerCase();
          
          if (!userEmail) {
            console.error("User has no email");
            return;
          }
          
          console.log(`[DEBUG] Current auth.uid(): ${userId}`);
          console.log(`[DEBUG] Searching for profile by email: ${userEmail}`);

          // Try to find any profile by email (regardless of user_id)
          const { data: emailProfile, error: emailProfileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", userEmail)
            .maybeSingle();

          if (emailProfileError) {
            console.error("[DEBUG] Error finding profile by email:", emailProfileError);
          }
          console.log(`[DEBUG] Profile found by email: ${JSON.stringify(emailProfile)}`);

          if (emailProfile) {
            // If found, and it's either unlinked or linked to a different user, link it to the current user
            if (!emailProfile.user_id || emailProfile.user_id !== userId) {
              const { data: updatedProfile, error: updateError } = await supabase
                .from("profiles")
                .update({ user_id: userId })
                .eq("id", emailProfile.id)
                .select()
                .single();

              if (updateError) {
                console.error("Error linking profile to user:", updateError);
                return;
              }
              setProfile(updatedProfile as Profile);
              console.log(`[DEBUG] Profile re-linked/linked: ${updatedProfile.full_name}, User ID: ${updatedProfile.user_id}`);
            } else {
              // Profile found by email and already linked to the current user (shouldn't happen if profileData was null)
              setProfile(emailProfile as Profile);
              console.log(`[DEBUG] Profile found by email and already linked to current user: ${emailProfile.full_name}, User ID: ${emailProfile.user_id}`);
            }
          } else {
            // No profile found by email, this user needs an admin to create a profile for them
            console.error("No existing profile found for this email. Please contact an administrator to create your profile.");
            setProfile(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
          }
        }
      } else {
        setProfile(profileData as Profile | null);
        console.log(`[DEBUG] Existing profile loaded for current user: ${profileData.full_name}, User ID: ${profileData.user_id}`);
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
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential deadlocks
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
        }

        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      }

      setIsLoading(false);
    });

    return () => {
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
