/**
 * OmniVerify - Neon Managed Better Auth Service
 * Coordinates with Neon Auth on Lakebase Postgres to provide real email/password
 * authentication, session management, and EdDSA JWT retrieval for FastAPI.
 */

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

const AUTH_BASE_URL =
  (import.meta as any).env?.VITE_NEON_AUTH_URL ||
  'https://ep-ancient-forest-a1worxqi.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth';

const STORAGE_KEY = 'omniverify_neon_session';

class AuthService {
  private currentSession: AuthSession | null = null;
  private listeners: Array<(session: AuthSession | null) => void> = [];

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.currentSession = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AUTH] Could not restore session from storage:', e);
      this.currentSession = null;
    }
  }

  private saveSession(session: AuthSession | null) {
    this.currentSession = session;
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners();
  }

  public subscribe(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentSession);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.currentSession);
    }
  }

  public getSession(): AuthSession | null {
    return this.currentSession;
  }

  public getAuthToken(): string | null {
    return this.currentSession ? this.currentSession.token : null;
  }

  public getToken(): string | null {
    return this.getAuthToken();
  }

  public isAuthenticated(): boolean {
    return !!this.currentSession && !!this.currentSession.token;
  }

  /**
   * Signs in using email and password via Neon Managed Better Auth,
   * then fetches the EdDSA JWT token for FastAPI backend authorization.
   */
  public async signIn(email: string, password: string): Promise<AuthSession> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    // 1. Sign In
    const res = await fetch(`${AUTH_BASE_URL}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      let errorMsg = 'Failed to sign in. Please verify your credentials.';
      try {
        const err = await res.json();
        errorMsg = err.message || err.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const signInData = await res.json();
    const user: AuthUser = signInData.user || {
      id: signInData.id || 'anonymous',
      email: email,
      name: email.split('@')[0],
    };

    // 2. Fetch signed EdDSA JWT from Neon Auth
    let token = signInData.token;
    try {
      const tokenRes = await fetch(`${AUTH_BASE_URL}/token`, {
        method: 'GET',
        headers: {
          Origin: origin,
        },
        credentials: 'include',
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.token) {
          token = tokenData.token;
        }
      }
    } catch (e) {
      console.warn('[AUTH] Could not fetch remote JWT, falling back to session token:', e);
    }

    const session: AuthSession = { user, token };
    this.saveSession(session);
    return session;
  }

  /**
   * Signs up a new user via Neon Managed Better Auth.
   */
  public async signUp(email: string, password: string, name?: string): Promise<AuthSession> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';

    const res = await fetch(`${AUTH_BASE_URL}/sign-up/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
      },
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        name: name || email.split('@')[0],
      }),
    });

    if (!res.ok) {
      let errorMsg = 'Registration failed.';
      try {
        const err = await res.json();
        errorMsg = err.message || err.detail || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    const signUpData = await res.json();
    const user: AuthUser = signUpData.user || {
      id: signUpData.id || 'new_user',
      email: email,
      name: name || email.split('@')[0],
    };

    // Fetch signed EdDSA JWT
    let token = signUpData.token;
    try {
      const tokenRes = await fetch(`${AUTH_BASE_URL}/token`, {
        method: 'GET',
        headers: {
          Origin: origin,
        },
        credentials: 'include',
      });
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        if (tokenData.token) {
          token = tokenData.token;
        }
      }
    } catch (e) {
      console.warn('[AUTH] Could not fetch remote JWT on signup:', e);
    }

    const session: AuthSession = { user, token };
    this.saveSession(session);
    return session;
  }

  /**
   * Invalidates session and clears credentials.
   */
  public async signOut(): Promise<void> {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      await fetch(`${AUTH_BASE_URL}/sign-out`, {
        method: 'POST',
        headers: { Origin: origin },
        credentials: 'include',
      });
    } catch (e) {
      console.warn('[AUTH] Error during remote sign-out:', e);
    } finally {
      this.saveSession(null);
    }
  }

  /**
   * Wrapper around fetch that automatically appends Authorization: Bearer <token>
   * and handles 401 session expiration gracefully.
   */
  public async authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers || {});
    const token = this.getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    // No timeout: keep session persistent and do not redirect to expired=true
    return response;
  }
}

export const authService = new AuthService();
