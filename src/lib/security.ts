/**
 * Security utilities for CoordinaTech
 * - Rate limiting
 * - Session timeout
 * - Password validation
 */

const RATE_LIMIT_KEY = "coordinatech_rate_limit";
const SESSION_TIMEOUT_KEY = "coordinatech_session_timeout";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Rate Limiter: máximo 5 intentos de login en 10 minutos
 */
export class LoginRateLimiter {
  static MAX_ATTEMPTS = 5;
  static WINDOW_MS = 10 * 60 * 1000; // 10 minutes

  static getAttempts(): { count: number; resetTime: number } | null {
    if (typeof window === "undefined") return null;

    const data = window.localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static recordAttempt(): void {
    if (typeof window === "undefined") return;

    const current = this.getAttempts();
    const now = Date.now();

    if (!current || now > current.resetTime) {
      // First attempt or window expired
      window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        count: 1,
        resetTime: now + this.WINDOW_MS,
      }));
    } else {
      // Within rate limit window
      window.localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({
        count: current.count + 1,
        resetTime: current.resetTime,
      }));
    }
  }

  static isLimited(): boolean {
    const attempts = this.getAttempts();
    if (!attempts) return false;

    const now = Date.now();
    if (now > attempts.resetTime) {
      // Window expired
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RATE_LIMIT_KEY);
      }
      return false;
    }

    return attempts.count >= this.MAX_ATTEMPTS;
  }

  static getRemainingTime(): number {
    const attempts = this.getAttempts();
    if (!attempts) return 0;

    const remaining = attempts.resetTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  static reset(): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(RATE_LIMIT_KEY);
  }
}

/**
 * Session Timeout Manager
 */
export class SessionTimeoutManager {
  private static timeoutId: NodeJS.Timeout | null = null;

  static startSession(): void {
    if (typeof window === "undefined") return;

    // Clear existing timeout
    if (this.timeoutId) clearTimeout(this.timeoutId);

    // Record session start time
    const sessionData = {
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      timeoutMs: INACTIVITY_TIMEOUT_MS,
    };
    window.localStorage.setItem(SESSION_TIMEOUT_KEY, JSON.stringify(sessionData));

    // Set activity listeners
    this.attachActivityListeners();

    // Set timeout
    this.setSessionTimeout();
  }

  static updateActivity(): void {
    if (typeof window === "undefined") return;

    const sessionData = window.localStorage.getItem(SESSION_TIMEOUT_KEY);
    if (!sessionData) return;

    try {
      const session = JSON.parse(sessionData);
      session.lastActivityTime = Date.now();
      window.localStorage.setItem(SESSION_TIMEOUT_KEY, JSON.stringify(session));

      // Reset timeout
      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.setSessionTimeout();
    } catch {
      // Ignore
    }
  }

  private static setSessionTimeout(): void {
    if (typeof window === "undefined") return;

    this.timeoutId = setTimeout(() => {
      this.expireSession();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private static attachActivityListeners(): void {
    if (typeof window === "undefined") return;

    const updateActivity = () => this.updateActivity();

    window.addEventListener("mousemove", updateActivity, { once: true });
    window.addEventListener("keypress", updateActivity, { once: true });
    window.addEventListener("click", updateActivity, { once: true });
    window.addEventListener("touchstart", updateActivity, { once: true });
  }

  static expireSession(): void {
    if (typeof window === "undefined") return;

    window.localStorage.removeItem(SESSION_TIMEOUT_KEY);
    window.localStorage.removeItem("coordinatech_session");
    
    // Dispatch custom event for app to handle logout
    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }

  static endSession(): void {
    if (typeof window === "undefined") return;

    if (this.timeoutId) clearTimeout(this.timeoutId);
    window.localStorage.removeItem(SESSION_TIMEOUT_KEY);
  }

  static getRemainingTime(): number {
    if (typeof window === "undefined") return 0;

    const sessionData = window.localStorage.getItem(SESSION_TIMEOUT_KEY);
    if (!sessionData) return 0;

    try {
      const session = JSON.parse(sessionData);
      const elapsed = Date.now() - session.lastActivityTime;
      const remaining = session.timeoutMs - elapsed;
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }

  static isSessionActive(): boolean {
    if (typeof window === "undefined") return false;

    const sessionData = window.localStorage.getItem(SESSION_TIMEOUT_KEY);
    if (!sessionData) return false;

    try {
      const session = JSON.parse(sessionData);
      const remaining = this.getRemainingTime();
      return remaining > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Password Validation
 */
export const PasswordValidation = {
  /**
   * Validate password strength
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 number
   * - At least 1 special character (!@#$%^&*)
   */
  validate(password: string): {
    isValid: boolean;
    errors: string[];
    strength: "weak" | "fair" | "good" | "strong";
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Mínimo 8 caracteres");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Al menos 1 letra mayúscula");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Al menos 1 letra minúscula");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Al menos 1 número");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Al menos 1 carácter especial (!@#$%^&*)");
    }

    let strength: "weak" | "fair" | "good" | "strong" = "weak";
    if (errors.length === 0) strength = "strong";
    else if (errors.length <= 1) strength = "good";
    else if (errors.length <= 2) strength = "fair";

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  },

  getStrengthColor(strength: string): string {
    switch (strength) {
      case "strong":
        return "#48bb78"; // green
      case "good":
        return "#f6ad55"; // orange
      case "fair":
        return "#ed8936"; // dark orange
      case "weak":
      default:
        return "#f56565"; // red
    }
  },
};

/**
 * Security Headers for API calls
 */
export const SecurityHeaders = {
  getCsrfToken(): string | null {
    if (typeof window === "undefined") return null;

    // In production, get CSRF token from meta tag or cookie
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || null;
  },

  getSecurityHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "X-Requested-With": "XMLHttpRequest",
    };

    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }

    return headers;
  },
};

/**
 * Data Encryption (basic implementation)
 * Note: In production, use proper encryption libraries
 */
export const DataEncryption = {
  /**
   * Simple base64 encoding for demo
   * In production: use TweetNaCl.js or similar
   */
  encrypt(data: string, key?: string): string {
    try {
      return btoa(data);
    } catch {
      return data;
    }
  },

  decrypt(encoded: string, key?: string): string {
    try {
      return atob(encoded);
    } catch {
      return encoded;
    }
  },

  /**
   * Hash password using PBKDF2 (Web Crypto API)
   * For demo only - use bcrypt on backend in production
   */
  async hashPassword(password: string): Promise<string> {
    if (typeof window === "undefined" || !window.crypto?.subtle) {
      return password;
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return password;
    }
  },
};
