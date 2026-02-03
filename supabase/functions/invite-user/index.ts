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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
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

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let inviteData;
    let isResend = false;

    // Try to invite the user first - if they already exist, Supabase will return an error
    const { data: newInviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
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
      // Check if the error is because user already exists
      const isUserExistsError = inviteError.message?.toLowerCase().includes("already") || 
                                 inviteError.message?.toLowerCase().includes("exists") ||
                                 inviteError.code === "email_exists" ||
                                 inviteError.message?.toLowerCase().includes("já");
      
      if (isUserExistsError) {
        // User already exists - find them and update their metadata
        isResend = true;
        
        // Get all users and find by email (paginated search)
        let existingAuthUser = null;
        let page = 1;
        const perPage = 1000;
        
        while (!existingAuthUser) {
          const { data: usersPage, error: listError } = await adminClient.auth.admin.listUsers({
            page,
            perPage,
          });
          
          if (listError || !usersPage?.users?.length) {
            break;
          }
          
          existingAuthUser = usersPage.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          
          if (usersPage.users.length < perPage) {
            break; // No more pages
          }
          page++;
        }

        if (existingAuthUser) {
          // Update user metadata
          const { error: updateError } = await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            user_metadata: {
              full_name: fullName,
              sex: sex || null,
              is_driver: isDriver || false,
              is_exempt: isExempt || false,
              congregation_id: congregationId || null,
            },
          });

          if (updateError) {
            console.error("Error updating user metadata:", updateError);
          }

          inviteData = { user: existingAuthUser };
        } else {
          // Could not find the user - this shouldn't happen, but handle gracefully
          console.error("User exists error but could not find user:", email);
          throw new Error(`Usuário com email ${email} já existe mas não foi encontrado para atualização.`);
        }
      } else {
        // Some other error
        console.error("Invite error:", inviteError);
        throw new Error(`Erro ao enviar convite: ${inviteError.message}`);
      }
    } else {
      inviteData = newInviteData;
    }

    // Create or update profile for the invited user WITHOUT user_id
    // The user_id will be linked when the user accepts the invite and logs in
    // First, check if profile already exists by email
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      const { error: profileError } = await adminClient
        .from("profiles")
        .update({
          full_name: fullName,
          sex: sex || null,
          is_driver: isDriver || false,
          is_exempt: isExempt || false,
          congregation_id: congregationId || null,
        })
        .eq("id", existingProfile.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    } else {
      // Create new profile without user_id (will be linked on first login)
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          email: email,
          sex: sex || null,
          is_driver: isDriver || false,
          is_exempt: isExempt || false,
          congregation_id: congregationId || null,
          user_id: null, // Explicitly set to null - will be linked on first login
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Don't fail completely - user was invited, profile can be created on first login
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isResend ? `Convite reenviado para ${email}` : `Convite enviado para ${email}`,
        userId: inviteData.user.id,
        isResend,
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
