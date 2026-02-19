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
    .select("id, email, company_name, contact_name, is_active, is_admin, created_at, allowed_sections, token_balance, studio_free_used")
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

  const { email, password, companyName, contactName, allowedSections } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const sections = Array.isArray(allowedSections) && allowedSections.length > 0
    ? allowedSections
    : ["studio", "jewelry"];

  const sb = getSupabaseServer();

  let userId: string;
  const { data: authData, error: authError } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      const { data: listData } = await sb.auth.admin.listUsers();
      const existing = listData?.users?.find((u) => u.email === email);
      if (!existing) {
        return NextResponse.json(
          { error: "User exists in Auth but could not be found" },
          { status: 400 }
        );
      }
      userId = existing.id;
    } else {
      return NextResponse.json(
        { error: authError.message || "Failed to create user" },
        { status: 400 }
      );
    }
  } else if (!authData.user) {
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 400 }
    );
  } else {
    userId = authData.user.id;
  }

  const { error: clientError } = await sb.from("clients").upsert({
    id: userId,
    email,
    company_name: companyName || "",
    contact_name: contactName || "",
    is_active: true,
    is_admin: isAdminEmail(email),
    allowed_sections: sections,
  }, { onConflict: "id" });

  if (clientError) {
    return NextResponse.json(
      { error: clientError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    client: {
      id: userId,
      email,
      companyName: companyName || "",
      contactName: contactName || "",
      allowedSections: sections,
    },
  });
}

/**
 * PATCH /api/admin/clients — update client (toggle active, update sections)
 */
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 501 });
  }

  const session = await getSessionClient();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { clientId } = body;

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 }
    );
  }

  const sb = getSupabaseServer();
  const updates: Record<string, unknown> = {};

  if (typeof body.isActive === "boolean") {
    updates.is_active = body.isActive;
  }

  if (Array.isArray(body.allowedSections)) {
    updates.allowed_sections = body.allowedSections;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "Nothing to update" },
      { status: 400 }
    );
  }

  const { error } = await sb
    .from("clients")
    .update(updates)
    .eq("id", clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
