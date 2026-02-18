import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Betelita {
  id: string;
  full_name: string;
  email: string | null;
  sex: "Homem" | "Mulher" | null;
  is_driver: boolean | null;
  is_exempt: boolean | null;
  is_married: boolean | null;
  pix_key: string | null;
  spouse_id: string | null;
  spouse_name: string | null;
  is_admin: boolean;
  congregation_id: string | null;
  user_id: string | null;
}

import { useIsCongregationAdmin } from "./useIsCongregationAdmin";
import { useIsSuperAdmin } from "./useIsSuperAdmin";
import { useSelectedCongregation } from "@/contexts/CongregationContext";

export function useBetelitas(options?: { congregationId?: string }) {
  const { isSuperAdmin } = useIsSuperAdmin();
  const { isCongregationAdmin } = useIsCongregationAdmin();
  const { selectedCongregationId } = useSelectedCongregation();
  const { profile } = useAuth();

  // Prioritize explicitly passed congregationId over context selectedCongregationId
  // This allows administrative pages to fetch betelitas from specific congregations
  const effectiveCongregationId = options?.congregationId ?? (
    (isSuperAdmin || isCongregationAdmin) ? selectedCongregationId : profile?.congregation_id
  );

  return useQuery({
    queryKey: ["betelitas", effectiveCongregationId],
    queryFn: async (): Promise<Betelita[]> => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, sex, is_driver, is_exempt, is_married, pix_key, spouse_id, congregation_id")
        .order("full_name", { ascending: true });

      if (effectiveCongregationId) {
        query = query.eq("congregation_id", effectiveCongregationId);
      }

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Fetch admin user_ids from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin"); // Apenas 'admin'

      if (rolesError) throw rolesError;

      // Fetch congregation administrators (profile-based admin designation)
      let congAdminsQuery = supabase
        .from("congregation_administrators")
        .select("profile_id, congregation_id"); // Incluir congregation_id

      if (effectiveCongregationId) {
        congAdminsQuery = congAdminsQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { data: congAdmins, error: congAdminsError } = await congAdminsQuery;

      if (congAdminsError) throw congAdminsError;

      // Create a map of profile_id -> Set of congregation_ids they admin
      const adminCongregationsMap = new Map<string, Set<string>>();
      (congAdmins ?? []).forEach((ca) => {
        if (!adminCongregationsMap.has(ca.profile_id)) {
          adminCongregationsMap.set(ca.profile_id, new Set());
        }
        adminCongregationsMap.get(ca.profile_id)!.add(ca.congregation_id);
      });

      // Fetch user_id mapping from profiles
      let profilesWithUserIdQuery = supabase
        .from("profiles")
        .select("id, user_id");

      if (effectiveCongregationId) {
        profilesWithUserIdQuery = profilesWithUserIdQuery.eq("congregation_id", effectiveCongregationId);
      }

      const { data: profilesWithUserId, error: userIdError } = await profilesWithUserIdQuery;

      if (userIdError) throw userIdError;

      const adminUserIds = new Set(adminRoles?.map((r) => r.user_id) ?? []);
      const profileUserIdMap = new Map(
        profilesWithUserId?.map((p) => [p.id, p.user_id]) ?? []
      );

      // Create a map for spouse names
      const profileNameMap = new Map(
        profiles?.map((p) => [p.id, p.full_name]) ?? []
      );

      // Map profiles with admin status and spouse name
      return (profiles ?? []).map((profile) => {
        const userId = profileUserIdMap.get(profile.id);
        const hasAdminRole = userId ? adminUserIds.has(userId) : false;

        // Check if user is admin of THEIR OWN congregation
        const adminCongregations = adminCongregationsMap.get(profile.id);
        const isAdminOfOwnCongregation =
          profile.congregation_id &&
          adminCongregations?.has(profile.congregation_id);

        return {
          ...profile,
          spouse_name: profile.spouse_id
            ? profileNameMap.get(profile.spouse_id) ?? null
            : null,
          is_admin: !!isAdminOfOwnCongregation, // Use the table congregation_administrators as source of truth
          user_id: userId ?? null,
        };
      });
    },
  });
}
