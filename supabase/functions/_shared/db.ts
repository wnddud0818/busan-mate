import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export const createAdminClient = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

export const requireAuthUser = async (request: Request) => {
  const admin = createAdminClient();
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace("Bearer ", "").trim();

  if (!token) {
    throw new Error("Missing authorization token.");
  }

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw error ?? new Error("Unable to resolve the authenticated user.");
  }

  return data.user;
};

export const requireOwnedProfile = async ({
  admin,
  profileId,
  authUserId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  profileId: string;
  authUserId: string;
}) => {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data?.id) {
    throw error ?? new Error("The requested profile is not owned by the current user.");
  }

  return data.id;
};
