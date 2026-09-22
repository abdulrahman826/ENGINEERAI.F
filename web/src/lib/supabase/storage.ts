import { getSupabaseBrowserClient } from "./client";

/**
 * Upload a photo directly to Supabase Storage (client-side, bypasses FastAPI).
 * Returns the public URL to pass to the vision-analysis endpoint.
 */
export async function uploadPhoto(
  file: File,
  userId: string,
  inspectionId: string
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${inspectionId}/photo.${ext}`;

  const { error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage
    .from("inspection-photos")
    .getPublicUrl(path);

  return data.publicUrl;
}
