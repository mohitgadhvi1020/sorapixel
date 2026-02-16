import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { getSessionClient, isAdminEmail, isSupabaseConfigured } from "@/lib/auth";

/**
 * GET /api/admin/clients — list all clients
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const sb = getSupabaseServer();
  const { data: clients, error } = await sb
    .from("clients")
    .select("id, email, company_name, contact_name, is_active, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients });
}

/**
 * POST /api/admin/clients — create a new client
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, password, companyName, contactName } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message || "Failed to create user" },
      { status: 400 }
    );
  }

  // Create client row
  const { error: clientError } = await sb.from("clients").insert({
    id: authData.user.id,
    email,
    company_name: companyName || "",
    contact_name: contactName || "",
    is_active: true,
    is_admin: isAdminEmail(email),
  });

  if (clientError) {
    // Rollback: delete the auth user
    await sb.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: clientError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    client: {
      id: authData.user.id,
      email,
      companyName: companyName || "",
      contactName: contactName || "",
    },
  });
}

/**
 * PATCH /api/admin/clients — toggle active status
 */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { clientId, isActive } = await req.json();

  if (!clientId || typeof isActive !== "boolean") {
    return NextResponse.json(
      { error: "clientId and isActive are required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();
  const { error } = await sb
    .from("clients")
    .update({ is_active: isActive })
    .eq("id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
