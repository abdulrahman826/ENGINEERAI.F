import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = getSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  redirect(session ? "/dashboard" : "/login");
}
