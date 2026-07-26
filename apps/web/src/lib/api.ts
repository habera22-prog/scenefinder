const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : undefined) ?? "요청 처리 중 오류가 발생했습니다.";
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export async function downloadFile(
  path: string,
  token: string | null,
  filenameFallback: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      (data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : undefined) ?? "다운로드에 실패했습니다.",
      data,
    );
  }

  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? filenameFallback;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function uploadFile(
  file: File,
  token: string | null,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/uploads`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ?? "업로드에 실패했습니다.",
      data,
    );
  }
  return data as { url: string };
}
