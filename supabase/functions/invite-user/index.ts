import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
  fullName: string;
  sex?: "Homem" | "Mulher";
  isDriver?: boolean;
  isExempt?: boolean;
  congregationId?: string | null;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header to verify admin status
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Create client with user's token to verify admin role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabasePublishableKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";
    const supabaseSecretKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";

    const userClient = createClient(supabaseUrl, supabasePublishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Apenas administradores podem convidar usuários");
    }

    // Parse request body
    const { email, fullName, sex, isDriver, isExempt, congregationId }: InviteRequest = await req.json();

    if (!email || !fullName) {
      throw new Error("Email e nome são obrigatórios");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if profile already exists with this email
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, user_id, email, congregation_id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      // Profile already exists - just update it, don't create duplicate
      // Preserve current congregation_id unless a different congregation was explicitly provided.
      // This avoids accidentally unlinking users when re-sending invites.
      const nextCongregationId =
        congregationId && congregationId !== existingProfile.congregation_id
          ? congregationId
          : existingProfile.congregation_id ?? null;

      const { error: updateError } = await adminClient
        .from("profiles")
        .update({
          full_name: fullName,
          sex: sex || null,
          is_driver: isDriver || false,
          is_exempt: isExempt || false,
          congregation_id: nextCongregationId,
        })
        .eq("id", existingProfile.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        throw new Error(`Erro ao atualizar perfil: ${updateError.message}`);
      }

      // Check if auth user exists for this profile
      let authUserExists = false;
      if (existingProfile.user_id) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(existingProfile.user_id);
        authUserExists = !!authUser?.user;
      }

      // If no auth user linked, try to send invite
      if (!authUserExists) {
        // Try to invite - this will fail gracefully if user already exists in auth
        const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
          data: {
            full_name: fullName,
            sex: sex || null,
            is_driver: isDriver || false,
            is_exempt: isExempt || false,
            congregation_id: nextCongregationId,
          },
          redirectTo: `${req.headers.get("origin")}/`,
        });

        if (inviteError && !inviteError.message?.toLowerCase().includes("already")) {
          console.error("Invite error:", inviteError);
          // Don't throw - profile was updated successfully
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Perfil de ${email} atualizado com sucesso`,
          profileId: existingProfile.id,
          isUpdate: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // No existing profile - create new one
    // First, check if auth user already exists (e.g., signed up via Google before being invited)
    let existingAuthUserId: string | null = null;
    let page = 1;
    const perPage = 1000;
    
    while (!existingAuthUserId) {
      const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (listError || !usersPage?.users?.length) {
        break;
      }
      
      const existingUser = usersPage.users.find((u: any) => 
        u.email?.toLowerCase() === normalizedEmail
      );
      
      if (existingUser) {
        existingAuthUserId = existingUser.id;
        break;
      }
      
      if (usersPage.users.length < perPage) {
        break;
      }
      page++;
    }

    // Create new profile linked to existing auth user if found
    const { data: newProfile, error: profileError } = await adminClient
      .from("profiles")
      .insert({
        full_name: fullName,
        email: normalizedEmail,
        sex: sex || null,
        is_driver: isDriver || false,
        is_exempt: isExempt || false,
        congregation_id: congregationId || null,
        user_id: existingAuthUserId || null,
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    // If no existing auth user, send invite
    if (!existingAuthUserId) {
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
        data: {
          full_name: fullName,
          sex: sex || null,
          is_driver: isDriver || false,
          is_exempt: isExempt || false,
          congregation_id: congregationId || null,
        },
        redirectTo: `${req.headers.get("origin")}/`,
      });

      if (inviteError) {
        console.error("Invite error:", inviteError);
        // Profile was created, but invite failed - don't throw, just log
        return new Response(
          JSON.stringify({
            success: true,
            message: `Perfil criado para ${email}, mas o convite por email falhou. O usuário pode entrar com Google ou Apple.`,
            profileId: newProfile.id,
            inviteError: inviteError.message,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Convite enviado para ${email}`,
          profileId: newProfile.id,
          userId: inviteData.user.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Perfil criado e vinculado ao usuário existente ${email}`,
        profileId: newProfile.id,
        userId: existingAuthUserId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error in invite-user function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
