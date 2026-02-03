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

      // If profile doesn't exist, try to find and link existing profile by email
      if (!profileData) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const userEmail = userData.user.email?.toLowerCase();
          
          if (!userEmail) {
            console.error("User has no email");
            return;
          }
          
          // First, check if there's already a profile with this email (regardless of user_id)
          const { data: existingProfiles, error: existingError } = await supabase
            .from("profiles")
            .select("*")
            .ilike("email", userEmail);

          if (existingError) {
            console.error("Error finding existing profile:", existingError);
          }

          // Find profile that either has no user_id or has THIS user_id
          const profileToLink = existingProfiles?.find(p => 
            p.user_id === null || p.user_id === userId
          );

          if (profileToLink) {
            // Link existing profile to this user if not already linked
            if (profileToLink.user_id !== userId) {
              const { data: updatedProfile, error: updateError } = await supabase
                .from("profiles")
                .update({ user_id: userId })
                .eq("id", profileToLink.id)
                .select()
                .single();

              if (updateError) {
                console.error("Error linking profile to user:", updateError);
                return;
              }

              setProfile(updatedProfile as Profile);
            } else {
              setProfile(profileToLink as Profile);
            }
          } else if (!existingProfiles || existingProfiles.length === 0) {
            // No existing profile found with this email, create new one
            const fullName = userData.user.user_metadata?.full_name ||
                            userData.user.user_metadata?.name ||
                            userData.user.email?.split('@')[0] ||
                            'Usuário';
            
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                user_id: userId,
                full_name: fullName,
                email: userData.user.email,
                sex: userData.user.user_metadata?.sex || null,
                is_driver: userData.user.user_metadata?.is_driver || false,
                is_exempt: userData.user.user_metadata?.is_exempt || false,
                congregation_id: userData.user.user_metadata?.congregation_id || null,
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating profile:", createError);
              return;
            }

            setProfile(newProfile as Profile);
          } else {
            // Profile exists but is linked to a different user - this shouldn't happen normally
            console.error("Profile exists with email but is linked to different user:", existingProfiles);
          }
        }
      } else {
        setProfile(profileData as Profile | null);
      }

      // Check if user is admin or super admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"]);

      const roles = roleData || [];
      setIsAdmin(roles.some(r => r.role === "admin" || r.role === "super_admin"));
      setIsSuperAdmin(roles.some(r => r.role === "super_admin"));
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
