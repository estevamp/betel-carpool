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

    // Check if an auth user already exists with this email
    // If they signed up via Google/Apple before being invited, we should link their profile
    let existingAuthUserId: string | null = null;
    
    // Paginate through auth.users to find existing user
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
      
      const existingUser = usersPage.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        existingAuthUserId = existingUser.id;
        break;
      }
      
      if (usersPage.users.length < perPage) {
        break;
      }
      page++;
    }

    // Create or update profile
    // The profile will be linked to the auth user when they sign in
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, user_id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile - link to auth user if we found one and profile isn't already linked
      const updateData: any = {
        full_name: fullName,
        sex: sex || null,
        is_driver: isDriver || false,
        is_exempt: isExempt || false,
        congregation_id: congregationId || null,
      };
      
      // If auth user exists and profile isn't linked, link them now
      if (existingAuthUserId && !existingProfile.user_id) {
        updateData.user_id = existingAuthUserId;
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", existingProfile.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }
    } else {
      // Create new profile
      // Link to existing auth user if found, otherwise leave user_id null (will be linked on first login)
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          full_name: fullName,
          email: email,
          sex: sex || null,
          is_driver: isDriver || false,
          is_exempt: isExempt || false,
          congregation_id: congregationId || null,
          user_id: existingAuthUserId || null,
        });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error(`Erro ao criar perfil: ${profileError.message}`);
      }
    }

    // We no longer use inviteUserByEmail to avoid creating duplicate auth.users entries
    // Users will sign in via Google, Apple, or other methods
    // The profile will be linked when they sign in via AuthContext
    
    const isUpdate = !!existingProfile;
    const wasLinked = existingAuthUserId && (!existingProfile?.user_id || existingProfile.user_id !== existingAuthUserId);

    return new Response(
      JSON.stringify({
        success: true,
        message: isUpdate 
          ? `Perfil de ${email} atualizado com sucesso` 
          : `Perfil criado para ${email}. O usuário pode entrar com Google ou Apple.`,
        profileId: existingProfile?.id || null,
        wasLinked,
        existingAuthUserId,
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
