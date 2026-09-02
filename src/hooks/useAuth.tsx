import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { cfAuth, type CfUser, type CfProfile, type Role } from "@/lib/cfAuth";

export type AppRole = Role;
export type Profile = CfProfile;
// Compat shim: many components read `user.id` / `user.email` — same on CfUser.
export type AuthUser = CfUser;

type AuthContextValue = {
  user: AuthUser | null;
  session: { access_token: string | null } | null;
  profile: Profile | null;
  roles: AppRole[];
  isStaff: boolean;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isLandingPage = () =>
  typeof window !== "undefined" && (window.location.pathname === "/" || window.location.pathname === "/en");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  // Start in loading state on every route so signed-in visitors never see a
  // "Log in" CTA flash while the (possibly deferred) session bootstrap runs.
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const me = await cfAuth.me();
    if (me) {
      setUser(me.user);
      setProfile(me.profile);
      setRoles(me.roles ?? []);
    } else {
      setUser(null);
      setProfile(null);
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initializing = true;
    const off = cfAuth.onChange(() => {
      // refresh() emits once; the initializer performs the single required
      // /me request itself and avoids a duplicate request from this listener.
      if (!initializing) void load();
    });
    const initialize = async () => {
      const refreshed = await cfAuth.refresh();
      if (refreshed && !cancelled) await load();
      if (!cancelled) setLoading(false);
      initializing = false;
    };

    // Authentication is not render-critical on the marketing landing page.
    // All private, auth and editorial routes still initialize immediately.
    const timer = isLandingPage() ? window.setTimeout(() => void initialize(), 2000) : undefined;
    if (!timer) void initialize();

    return () => {
      cancelled = true;
      initializing = false;
      if (timer) window.clearTimeout(timer);
      off();
    };
  }, [load]);

  const refreshProfile = useCallback(async () => { await load(); }, [load]);

  const signOut = useCallback(async () => {
    await cfAuth.logout();
    setUser(null); setProfile(null); setRoles([]);
  }, []);

  const value: AuthContextValue = {
    user,
    session: user ? { access_token: cfAuth.getToken() } : null,
    profile,
    roles,
    isStaff: roles.includes("staff") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
    loading,
    refreshProfile,
    signOut,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
