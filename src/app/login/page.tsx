"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Grid3x3, Mail, Lock, Eye, EyeOff, ArrowRight, Users } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { TwoFactorAuth } from "@/components/TwoFactorAuth";
import { LoginRateLimiter, SessionTimeoutManager } from "@/lib/security";
import { UserRole } from "@/types/domain";

export default function LoginPage() {
  const router = useRouter();
  const { login, technicians } = useAppContext();
  const [email, setEmail] = useState("juan.perez@company.com");
  const [password, setPassword] = useState("tech123");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  
  // 2FA states
  const [show2FA, setShow2FA] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let active = true;

    const checkRateLimit = async () => {
      if (!(await LoginRateLimiter.isLimited()) || !active) {
        return;
      }

      const remainingMs = await LoginRateLimiter.getRemainingTime();
      const remainingMin = Math.ceil(remainingMs / 1000 / 60);
      setRateLimitMessage(`Demasiados intentos. Intenta de nuevo en ${remainingMin} minuto(s).`);
      setError("Has excedido el límite de intentos. Por favor espera antes de intentar de nuevo.");
    };

    void checkRateLimit();

    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setRateLimitMessage("");

    // Check rate limiting
    if (await LoginRateLimiter.isLimited()) {
      const remainingMs = await LoginRateLimiter.getRemainingTime();
      const remainingMin = Math.ceil(remainingMs / 1000 / 60);
      setError(`Demasiados intentos. Intenta de nuevo en ${remainingMin} minuto(s).`);
      return;
    }

    setLoading(true);
    
    // Auto-detect role: admin email uses admin path, all others use tech path
    const role: UserRole = email === "maria.gonzalez@company.com" ? "admin" : "tech";
    const success = await login(email, password, role);
    setLoading(false);
    
    if (!success) {
      await LoginRateLimiter.recordAttempt();
      const attempts = await LoginRateLimiter.getAttempts();
      const remainingAttempts = LoginRateLimiter.MAX_ATTEMPTS - (attempts?.count || 0);
      
      setError(`Credenciales inválidas. Te quedan ${remainingAttempts} intento(s).`);
      return;
    }

    // Mostrar 2FA
    await LoginRateLimiter.reset(); // Clear rate limit on successful login
    await SessionTimeoutManager.startSession(); // Start session timeout
    setPendingRole(role);
    setShow2FA(true);
  };

  const handleVerify2FA = async (code: string) => {
    // Código demo para pruebas
    if (code !== "123123") {
      throw new Error("Código incorrecto. Usa 123123 para pruebas.");
    }
    
    // Si el código es correcto, redirect a la app
    router.replace("/");
  };

  const handleCancel2FA = () => {
    setShow2FA(false);
    setPendingRole(null);
  };

  return (
    <main className="login-screen">
      {/* ── Left: Visual Anchor ── */}
      <section className="login-visual">
        <div className="login-gradient-overlay" />

        {/* Stat badge — top left */}
        <div className="login-stat-badge">
          <Users size={20} />
          <div>
            <p className="stat-label">Técnicos Activos</p>
            <p className="stat-value">{technicians.filter(t => t.active).length.toLocaleString('es-ES')}</p>
          </div>
        </div>

        {/* Bottom headline */}
        <div className="login-headline">
          <h2>Precisión logística en cada movimiento.</h2>
          <p>Gestione flotas, técnicos y horarios con la plataforma de coordinación más avanzada del sector.</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", opacity: 0.5 }}>
            <div style={{ height: "4px", width: "48px", background: "white", borderRadius: "9999px" }} />
            <div style={{ height: "4px", width: "32px", background: "rgba(255,255,255,0.4)", borderRadius: "9999px" }} />
            <div style={{ height: "4px", width: "32px", background: "rgba(255,255,255,0.4)", borderRadius: "9999px" }} />
          </div>
        </div>
      </section>

      {/* ── Right: Login Form ── */}
      <section className="login-form-panel">
        <div className="login-card-stitch">
          {/* Brand header */}
          <div className="login-brand-header">
            <div className="login-logo-icon">
              <Grid3x3 size={20} color="white" strokeWidth={1.5} />
            </div>
            <span className="login-wordmark">Coordinatech</span>
          </div>

          {!show2FA ? (
            <>
              <h1 className="login-title">Bienvenido de nuevo</h1>
              <p className="login-subtitle">Ingrese sus credenciales para acceder a su panel de despacho.</p>

              <form onSubmit={submit} style={{ display: "grid", gap: "1rem", marginTop: "0.25rem" }}>
                {/* Email */}
                <div style={{ display: "grid", gap: "6px" }}>
                  <label className="stitch-label" htmlFor="email">Correo Electrónico</label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nombre@empresa.com"
                      className="stitch-input"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="stitch-label" htmlFor="password">Contraseña</label>
                    <Link href="/forgot-password" className="stitch-link-sm">¿Olvidé mi contraseña?</Link>
                  </div>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="stitch-input"
                      style={{ paddingRight: "2.75rem" }}
                      required
                    />
                    <button
                      type="button"
                      className="input-eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "2px 0" }}>
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="stitch-checkbox"
                  />
                  <label htmlFor="remember" className="stitch-body-label">Recordarme</label>
                </div>

                {error && <p className="error-text">{error}</p>}

                {/* Submit */}
                <button type="submit" className="stitch-submit-btn" disabled={loading}>
                  {loading ? "Iniciando..." : (
                    <>Iniciar sesión <ArrowRight size={18} /></>
                  )}
                </button>
              </form>

              {/* Footer link */}
              <div className="login-footer-divider">
                <p>¿No tiene una cuenta? <a href="#" className="stitch-link">Contacte a Soporte</a></p>
              </div>

            </>
          ) : (
            <TwoFactorAuth 
              email={email} 
              onVerify={handleVerify2FA}
              onCancel={handleCancel2FA}
              loading={loading}
            />
          )}
        </div>
      </section>
    </main>
  );
}
