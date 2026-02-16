// app/lib/apiClient.ts
type ApiInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  idToken: string;
  idempotencyKey?: string;
};

export async function apiFetch(path: string, opts: ApiInit) {
  const { idToken, idempotencyKey, headers = {}, method, body } = opts;

  const mergedHeaders: Record<string, string> = {
    ...headers,
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) mergedHeaders["Idempotency-Key"] = idempotencyKey;

  const base = process.env.EXPO_PUBLIC_API_BASE_URL!;
  const fetchOptions: { headers: Record<string, string>; method?: string; body?: string } = {
    headers: mergedHeaders,
  };
  if (method) fetchOptions.method = method;
  if (body !== undefined) fetchOptions.body = body;

  const res = await fetch(`${base}${path}`, fetchOptions);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res;
}
