import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ApiError } from "@/lib/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string
  ) {
    super(message);
    this.name = "ApiException";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let body: ApiError = { error_code: "error", message: res.statusText };
    try {
      body = await res.json();
    } catch {}
    throw new ApiException(res.status, body.error_code, body.message);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}
