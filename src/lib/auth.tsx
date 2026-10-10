"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type { AdminProfile, AuthPayload, Data } from "./types";

const STORAGE_KEY = "wallpaper.admin.session";

type Status = "loading" | "ready" | "anonymous";

type AuthContextValue = {
  status: Status;
  admin: AdminProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Stored = {
  accessToken: string;
  csrfToken: string;
  admin: AdminProfile;
  expiresAt: number;
};

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
}

function writeStored(payload: AuthPayload | null) {
  if (!payload) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  const stored: Stored = {
    accessToken: payload.accessToken,
    csrfToken: payload.csrfToken,
    admin: payload.admin,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    api.onSession = (payload) => {
      writeStored(payload);
      if (cancelled) return;
      setAdmin(payload.admin);
      setExpiresAt(Date.now() + payload.expiresIn * 1000);
      setStatus("ready");
    };

    api.onUnauthorized = () => {
      writeStored(null);
      api.clear();
      if (cancelled) return;
      setAdmin(null);
      setExpiresAt(null);
      setStatus("anonymous");
    };

    async function bootstrap() {
      const saved = readStored();
      if (saved?.accessToken) {
        api.setSession(saved.accessToken, saved.csrfToken);
        setExpiresAt(saved.expiresAt);
      }

      if (api.accessToken) {
        try {
          const me = await api.get<Data<AdminProfile>>("/api/v1/admin/auth/me");
          if (cancelled) return;
          setAdmin(me.data);
          const current = readStored();
          if (current) {
            current.admin = me.data;
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
          }
          setStatus("ready");
          return;
        } catch {
          /* access token expired or missing; try the refresh cookie */
        }
      }

      try {
        await api.refresh();
      } catch {
        if (cancelled) return;
        api.clear();
        writeStored(null);
        setAdmin(null);
        setStatus("anonymous");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== "ready" || !expiresAt) return;
    const delay = Math.max(expiresAt - Date.now() - 20_000, 5_000);
    const timer = setTimeout(() => {
      void api.refresh().catch(() => undefined);
    }, delay);
    return () => clearTimeout(timer);
  }, [status, expiresAt]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      admin,
      async login(email, password) {
        await api.login(email.trim(), password);
      },
      async logout() {
        try {
          await api.logout();
        } catch {
          /* local session still ends */
        }
        api.clear();
        writeStored(null);
        setAdmin(null);
        setExpiresAt(null);
        setStatus("anonymous");
      },
      async reload() {
        const me = await api.get<Data<AdminProfile>>("/api/v1/admin/auth/me");
        setAdmin(me.data);
      },
    }),
    [status, admin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
