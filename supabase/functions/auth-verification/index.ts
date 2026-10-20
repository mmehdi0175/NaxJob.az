import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "send-code") {
      return await handleSendCode(body);
    } else if (action === "verify-and-register") {
      return await handleVerifyAndRegister(body);
    } else {
      return new Response(
        JSON.stringify({ error: "Naməlum əməliyyat." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server xətası. Bir az sonra yenidən cəhd edin." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleSendCode(body: {
  email: string;
  purpose: string;
  payload?: Record<string, string>;
}) {
  const email = (body.email || "").trim().toLowerCase();
  const purpose = body.purpose;

  if (!email || !purpose) {
    return new Response(
      JSON.stringify({ error: "Email və məqsəd tələb olunur." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (purpose !== "employer" && purpose !== "candidate") {
    return new Response(
      JSON.stringify({ error: "Yanlış məqsəd." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if user already exists in auth.users
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const userExists = existingUsers?.users?.some((u) => u.email === email);
  if (userExists) {
    return new Response(
      JSON.stringify({ error: "Bu email artıq qeydiyyatdan keçib." }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const code = generateCode();
  const codeHash = await hashCode(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate previous codes for this email+purpose
  await supabase
    .from("email_verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("email", email)
    .eq("purpose", purpose)
    .is("used_at", null);

  // Insert new code
  const { error: insertError } = await supabase
    .from("email_verification_codes")
    .insert({
      email,
      code_hash: codeHash,
      purpose,
      payload: body.payload || {},
      expires_at: expiresAt,
    });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: "Təsdiq kodu saxlanıla bilmədi." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Test mode: always return the code so it can be displayed on screen.
  // In production, replace this with an actual email send and remove dev_code.
  return new Response(
    JSON.stringify({
      success: true,
      dev_code: code,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyAndRegister(body: {
  email: string;
  code: string;
  purpose: string;
}) {
  const email = (body.email || "").trim().toLowerCase();
  const code = (body.code || "").trim();
  const purpose = body.purpose;

  if (!email || !code || !purpose) {
    return new Response(
      JSON.stringify({ error: "Email, kod və məqsəd tələb olunur." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verify code via RPC
  const { data: verifyResult, error: verifyError } = await supabase.rpc("verify_email_code", {
    p_email: email,
    p_code: code,
    p_purpose: purpose,
  });

  if (verifyError) {
    return new Response(
      JSON.stringify({ error: "Kod yoxlanıla bilmədi." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!verifyResult || verifyResult.success === false) {
    return new Response(
      JSON.stringify({ error: verifyResult?.error || "Yanlış təsdiq kodu." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const payload = verifyResult.payload || {};

  if (purpose === "employer") {
    return await registerEmployer(email, code, payload);
  } else if (purpose === "candidate") {
    return await registerCandidate(email, code, payload);
  }

  return new Response(
    JSON.stringify({ error: "Naməlum məqsəd." }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function registerEmployer(
  email: string,
  _code: string,
  payload: Record<string, string>
) {
  const password = payload.password;
  if (!password) {
    return new Response(
      JSON.stringify({ error: "Şifrə tapılmadı." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {},
  });

  if (authError) {
    const msg = authError.message || "";
    if (msg.includes("already") || msg.includes("exists")) {
      return new Response(
        JSON.stringify({ error: "Bu email artıq qeydiyyatdan keçib." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "İstifadəçi yaradıla bilmədi: " + msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // Set user_role to employer in app_metadata
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { user_role: "employer" },
  });

  // Create company record
  const { error: companyError } = await supabase.from("companies").insert({
    user_id: userId,
    company_name: payload.company_name || "",
    voen: payload.voen || "",
    contact_email: email,
    contact_phone: payload.phone || "",
  });

  if (companyError) {
    // Rollback: delete the auth user if company creation fails
    await supabase.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({ error: "Şirkət profili yaradıla bilmədi: " + companyError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function registerCandidate(
  email: string,
  _code: string,
  payload: Record<string, string>
) {
  const password = payload.password;
  if (!password) {
    return new Response(
      JSON.stringify({ error: "Şifrə tapılmadı." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message || "";
    if (msg.includes("already") || msg.includes("exists")) {
      return new Response(
        JSON.stringify({ error: "Bu email artıq qeydiyyatdan keçib." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ error: "İstifadəçi yaradıla bilmədi: " + msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = authData.user.id;

  // Set user_role to candidate in app_metadata
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { user_role: "candidate" },
  });

  // Create candidate record
  const { error: candidateError } = await supabase.from("candidates").insert({
    user_id: userId,
    first_name: payload.first_name || "",
    last_name: payload.last_name || "",
    patronymic: payload.patronymic || "",
    email,
    phone: payload.phone || "",
  });

  if (candidateError) {
    await supabase.auth.admin.deleteUser(userId);
    return new Response(
      JSON.stringify({ error: "Namizəd profili yaradıla bilmədi: " + candidateError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
