// Cloudflare auth client — cheamă workerul avyrontech (cross-origin în preview / same-origin în prod).
// Access token (JWT 15min) e ținut in-memory + refresh via cookie `sid`.
import { apiUrl } from "./apiBase";


export type Role = "user" | "staff" | "admin";

export type CfUser = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  email_verified: 0 | 1;
  must_change_password: 0 | 1;
  created_at: number;
};

export type CfProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  entity_type: "individual" | "srl" | "pfa" | "ii" | "other" | null;
  company_name: string | null;
  cui: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  website: string | null;
  language: "ro" | "en";
  theme: "light" | "dark" | "system";
  pseudonym: string | null;
  staff_role: "dev" | "designer" | "marketing" | "support" | null;
};

type Listener = () => void;
type ApiErrorBody = { error?: { message?: string; code?: string } };
type SessionResponse = { access_token: string; expires_in: number; user: { id: string; roles: Role[] } };

class CfAuth {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private listeners = new Set<Listener>();

  onChange(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() { this.listeners.forEach((l) => l()); }

  getToken() {
    return this.accessToken && Date.now() < this.expiresAt ? this.accessToken : null;
  }

  private setSession(access: string, expiresIn: number) {
    this.accessToken = access;
    this.expiresAt = Date.now() + (expiresIn - 30) * 1000;
    this.emit();
  }

  private clearSession() {
    this.accessToken = null;
    this.expiresAt = 0;
    this.emit();
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.ensureToken();
    const headers = new Headers(init.headers);
    if (token) headers.set("authorization", `Bearer ${token}`);
    if (init.body && !headers.has("content-type") && !(init.body instanceof FormData) && !(init.body instanceof Blob)) {
      headers.set("content-type", "application/json");
    }
    const res = await fetch(apiUrl(path), { ...init, headers, credentials: "include" });
    if (res.status === 401) {
      this.clearSession();
      const refreshed = await this.refresh();
      if (refreshed) {
        headers.set("authorization", `Bearer ${this.accessToken}`);
        const retry = await fetch(apiUrl(path), { ...init, headers, credentials: "include" });
        if (!retry.ok) throw await this.errorFrom(retry);
        return retry.json() as Promise<T>;
      }
    }
    if (!res.ok) throw await this.errorFrom(res);
    return res.json() as Promise<T>;
  }

  private async errorFrom(res: Response): Promise<Error> {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json() as ApiErrorBody;
      msg = j?.error?.message || j?.error?.code || msg;
    } catch {
      // Keep the HTTP status fallback when the body is not JSON.
    }
    return new Error(msg);
  }

  private async ensureToken(): Promise<string | null> {
    if (this.getToken()) return this.accessToken;
    return (await this.refresh()) ? this.accessToken : null;
  }

  async refresh(): Promise<boolean> {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), { method: "POST", credentials: "include" });
      if (!res.ok) return false;
      const j = await res.json() as SessionResponse;
      this.setSession(j.access_token, j.expires_in);
      return true;
    } catch {
      return false;
    }
  }

  async signup(input: { email: string; password: string; displayName?: string; entityType?: string }) {
    const res = await fetch(apiUrl("/api/auth/signup"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    const j = await res.json() as SessionResponse & ApiErrorBody;
    if (!res.ok) throw new Error(j?.error?.message || j?.error?.code || "signup_failed");
    this.setSession(j.access_token, j.expires_in);
    return j;
  }

  async login(email: string, password: string) {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const j = await res.json() as SessionResponse & ApiErrorBody;
    if (!res.ok) throw new Error(j?.error?.message || j?.error?.code || "login_failed");
    this.setSession(j.access_token, j.expires_in);
    return j;
  }

  async logout() {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" }).catch(() => {});
    this.clearSession();
  }

  async me(): Promise<{ user: CfUser; profile: CfProfile; roles: Role[] } | null> {
    try {
      const result = await this.request<{ user: CfUser; profile: CfProfile; roles: Role[] }>("/api/auth/me");
      if (result.user.avatar_url?.startsWith("/")) result.user.avatar_url = apiUrl(result.user.avatar_url);
      if (result.profile.avatar_url?.startsWith("/")) result.profile.avatar_url = apiUrl(result.profile.avatar_url);
      return result;
    } catch {
      return null;
    }
  }

  async forgot(email: string) {
    const res = await fetch(apiUrl("/api/auth/forgot"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw await this.errorFrom(res);
  }

  async reset(token: string, password: string) {
    const res = await fetch(apiUrl("/api/auth/reset"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const j = await res.json() as { ok?: true } & ApiErrorBody;
    if (!res.ok) throw new Error(j?.error?.message || j?.error?.code || "reset_failed");
    return j;
  }

  async updateProfile(patch: Partial<CfProfile>): Promise<CfProfile> {
    const j = await this.request<{ profile: CfProfile }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    return j.profile;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ ok: true }>("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async uploadAvatar(file: File): Promise<string> {
    const j = await this.request<{ avatar_url: string }>("/api/profile/avatar", {
      method: "POST",
      headers: { "content-type": file.type || "image/jpeg" },
      body: file,
    });
    return apiUrl(j.avatar_url);
  }
}

export const cfAuth = new CfAuth();
