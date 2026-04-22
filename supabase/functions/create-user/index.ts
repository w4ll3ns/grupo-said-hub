import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const validatePassword = (pw: string): string | null => {
  if (!pw || pw.length < 10) return "Senha deve ter no mínimo 10 caracteres";
  if (!/[A-Za-z]/.test(pw)) return "Senha deve conter letras";
  if (!/[0-9]/.test(pw)) return "Senha deve conter números";
  return null;
};

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return jsonResponse({ error: "Token inválido" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) return jsonResponse({ error: "Apenas administradores podem criar usuários" }, 403);

    const body = await req.json().catch(() => null);
    if (!body) return jsonResponse({ error: "Body inválido" }, 400);

    const { email, password, nome, cargo, matricula, perfil_id, empresa_ids } = body as {
      email?: string; password?: string; nome?: string; cargo?: string;
      matricula?: string; perfil_id?: string; empresa_ids?: string[];
    };

    if (!email || !validateEmail(email)) return jsonResponse({ error: "Email inválido" }, 400);
    const pwErr = validatePassword(password ?? "");
    if (pwErr) return jsonResponse({ error: pwErr }, 400);
    if (!nome || nome.trim().length < 2) return jsonResponse({ error: "Nome deve ter no mínimo 2 caracteres" }, 400);
    if (!perfil_id || !empresa_ids?.length) return jsonResponse({ error: "perfil_id e empresa_ids obrigatórios" }, 400);

    // Admin só pode vincular empresas às quais ele próprio pertence.
    const { data: adminEmpresas } = await adminClient
      .from("usuario_empresas").select("empresa_id").eq("user_id", caller.id);
    const adminEmpresaIds = new Set((adminEmpresas ?? []).map((r) => r.empresa_id));
    if (adminEmpresaIds.size > 0) {
      const invalid = empresa_ids.filter((id) => !adminEmpresaIds.has(id));
      if (invalid.length) {
        return jsonResponse({ error: `Você não tem acesso às empresas: ${invalid.join(", ")}` }, 403);
      }
    }

    // Perfil deve existir e, se for de empresa específica, ela deve estar em empresa_ids.
    const { data: perfil, error: perfilErr } = await adminClient
      .from("perfis").select("id, empresa_id, sistema").eq("id", perfil_id).maybeSingle();
    if (perfilErr || !perfil) return jsonResponse({ error: "Perfil não encontrado" }, 400);
    if (perfil.empresa_id && !empresa_ids.includes(perfil.empresa_id)) {
      return jsonResponse({ error: "Perfil pertence a uma empresa que não está em empresa_ids" }, 400);
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { nome },
    });
    if (createError || !newUser?.user) {
      return jsonResponse({ error: createError?.message ?? "Erro ao criar usuário" }, 400);
    }

    const userId = newUser.user.id;

    const rollback = async (msg: string) => {
      try { await adminClient.auth.admin.deleteUser(userId); } catch (_) {}
      return jsonResponse({ error: msg }, 500);
    };

    const { error: profileErr } = await adminClient
      .from("profiles").update({ nome, cargo: cargo ?? null, matricula: matricula ?? null })
      .eq("id", userId);
    if (profileErr) return rollback("Erro ao atualizar profile: " + profileErr.message);

    const { error: perfilLinkErr } = await adminClient
      .from("usuario_perfis").insert({ user_id: userId, perfil_id });
    if (perfilLinkErr) return rollback("Erro ao vincular perfil: " + perfilLinkErr.message);

    const empresaRows = empresa_ids.map((empresa_id) => ({ user_id: userId, empresa_id }));
    const { error: empresaLinkErr } = await adminClient
      .from("usuario_empresas").insert(empresaRows);
    if (empresaLinkErr) return rollback("Erro ao vincular empresas: " + empresaLinkErr.message);

    return jsonResponse({ success: true, user_id: userId }, 201);
  } catch (err) {
    console.error("create-user fatal error:", err);
    return jsonResponse({ error: (err as Error).message ?? "Erro interno" }, 500);
  }
});
