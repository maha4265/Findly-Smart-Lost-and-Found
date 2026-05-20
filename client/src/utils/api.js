export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  const normalizedToken = token ? (token.startsWith("Bearer ") ? token : `Bearer ${token}`) : "";
  const headers = {
    ...(options.headers || {}),
    ...(normalizedToken ? { Authorization: normalizedToken } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Request failed");
  }
  return response.json();
}

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL.replace("/api", "")}${path}`;
}
