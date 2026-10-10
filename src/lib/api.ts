import type { AuthPayload, Data } from "./types";

type ErrorBody = {
  statusCode?: number;
  error?: string;
  message?: string | string[];
  details?: unknown;
};

export class ApiRequestError extends Error {
  status: number;
  body: ErrorBody | null;

  constructor(status: number, body: ErrorBody | null) {
    const raw = body?.message;
    const message = Array.isArray(raw) ? raw.join("، ") : raw || body?.error || `HTTP ${status}`;
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

export function errorText(err: unknown) {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof TypeError) return "تعذر الاتصال بالخادم. تأكد أن الواجهة البرمجية تعمل وأن API_PROXY_TARGET صحيح.";
  if (err instanceof Error) return err.message;
  return "حدث خطأ غير متوقع";
}

export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

type RequestInitEx = RequestInit & { auth?: boolean; retry?: boolean };

export class ApiClient {
  accessToken: string | null = null;
  csrfToken: string | null = null;
  onSession?: (payload: AuthPayload) => void;
  onUnauthorized?: () => void;
  private refreshing: Promise<boolean> | null = null;

  setSession(accessToken: string | null, csrfToken: string | null) {
    this.accessToken = accessToken;
    this.csrfToken = csrfToken;
  }

  clear() {
    this.accessToken = null;
    this.csrfToken = null;
  }

  csrfValue() {
    return this.csrfToken || readCookie("csrf_token") || readCookie("csrfToken");
  }

  async request<T>(path: string, init: RequestInitEx = {}): Promise<T> {
    const auth = init.auth !== false;
    const headers = new Headers(init.headers);
    if (auth && this.accessToken) headers.set("Authorization", `Bearer ${this.accessToken}`);
    const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (init.body && !isForm && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

    const res = await fetch(path, { ...init, headers, credentials: "include" });

    if (res.status === 401 && auth && !init.retry) {
      const refreshed = await this.tryRefresh();
      if (refreshed) return this.request<T>(path, { ...init, retry: true });
      this.clear();
      this.onUnauthorized?.();
    } else if (res.status === 401 && auth && init.retry) {
      this.clear();
      this.onUnauthorized?.();
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: text.slice(0, 300) };
      }
    }
    if (!res.ok) throw new ApiRequestError(res.status, body as ErrorBody | null);
    return body as T;
  }

  private tryRefresh() {
    if (!this.refreshing) {
      this.refreshing = this.refresh()
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  async refresh() {
    let csrf = this.csrfValue();
    if (!csrf) {
      const got = await this.request<Data<{ csrfToken: string }>>("/api/v1/admin/auth/csrf", { auth: false });
      csrf = got.data.csrfToken;
      this.csrfToken = csrf;
    }
    const res = await this.request<Data<AuthPayload>>("/api/v1/admin/auth/refresh", {
      method: "POST",
      auth: false,
      headers: { "X-CSRF-Token": csrf },
    });
    this.setSession(res.data.accessToken, res.data.csrfToken);
    this.onSession?.(res.data);
    return res.data;
  }

  async login(email: string, password: string) {
    const res = await this.request<Data<AuthPayload>>("/api/v1/admin/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    this.setSession(res.data.accessToken, res.data.csrfToken);
    this.onSession?.(res.data);
    return res.data;
  }

  async logout() {
    const csrf = this.csrfValue();
    if (csrf) {
      await this.request<void>("/api/v1/admin/auth/logout", {
        method: "POST",
        auth: false,
        headers: { "X-CSRF-Token": csrf },
      });
    }
    this.clear();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
  }

  del(path: string) {
    return this.request<void>(path, { method: "DELETE" });
  }

  upload<T>(path: string, form: FormData) {
    return this.request<T>(path, { method: "POST", body: form });
  }
}

export const api = new ApiClient();
