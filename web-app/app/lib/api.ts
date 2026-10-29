const rawUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8002";
export const API_BASE_URL = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
  ? rawUrl.replace(/\/+$/, "")
  : `https://${rawUrl.replace(/\/+$/, "")}`;

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorBody.detail || `API error ${response.status}`);
  }

  return response.json();
}
