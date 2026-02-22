import { getSupabaseServer } from "./supabase";
import { isSupabaseConfigured } from "./auth";
import { TokenUsage } from "./gemini";
import { cookies } from "next/headers";

const SESSION_COOKIE = "sb-session";

/**
 * Get the current client ID from the session cookie.
 * Returns null if not authenticated or Supabase not configured.
 */
export async function getClientId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return "local-dev";
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.id || null;
  } catch {
    return null;
  }
}

/**
 * Log a generation event (AI call) to the database.
 * Silently skips if Supabase is not configured or client is not authenticated.
 */
export async function trackGeneration(opts: {
  clientId: string | null;
  generationType: string;
  tokenUsage?: TokenUsage | null;
  model?: string;
  status?: "success" | "failed";
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  if (!isSupabaseConfigured() || !opts.clientId) return null;

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("generations")
      .insert({
        client_id: opts.clientId,
        generation_type: opts.generationType,
        input_tokens: opts.tokenUsage?.inputTokens ?? 0,
        output_tokens: opts.tokenUsage?.outputTokens ?? 0,
        total_tokens: opts.tokenUsage?.totalTokens ?? 0,
        model_used: opts.model || "gemini-2.5-flash",
        status: opts.status || "success",
        metadata: opts.metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to track generation:", error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Track generation error:", err);
    return null;
  }
}

/**
 * Store an image record in the database.
 */
export async function trackImage(opts: {
  generationId: string | null;
  clientId: string;
  label: string;
  storagePath: string;
  fileSizeBytes: number;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("images")
      .insert({
        generation_id: opts.generationId,
        client_id: opts.clientId,
        label: opts.label,
        storage_path: opts.storagePath,
        file_size_bytes: opts.fileSizeBytes,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to track image:", error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.error("Track image error:", err);
    return null;
  }
}

/**
 * Log a download event.
 */
export async function trackDownload(opts: {
  imageId: string;
  clientId: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const sb = getSupabaseServer();
    await sb.from("downloads").insert({
      image_id: opts.imageId,
      client_id: opts.clientId,
    });
  } catch (err) {
    console.error("Track download error:", err);
  }
}

/**
 * Upload an image to Supabase Storage and return the storage path.
 * Returns null if Supabase is not configured.
 */
export async function uploadImage(
  clientId: string,
  base64: string,
  label: string
): Promise<{ path: string; size: number } | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const sb = getSupabaseServer();
    const raw = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    const fileName = `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    const storagePath = `${clientId}/${fileName}`;

    const { error } = await sb.storage
      .from("sorapixel-images")
      .upload(storagePath, buffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error.message);
      return null;
    }

    return { path: storagePath, size: buffer.length };
  } catch (err) {
    console.error("Upload image error:", err);
    return null;
  }
}
