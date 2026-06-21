"use client";

import { FormEvent, useState } from "react";
import { Grid3x3, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "confirmation">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // En producción: integrar con Supabase Auth
      // Por ahora, simulamos el envío
      if (!email || !email.includes("@")) {
        throw new Error("Por favor ingresa un correo válido");
      }

      // Simulamos envío de email
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      setStep("confirmation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      {/* ── Left: Visual Anchor ── */}
      <section className="login-visual">
        <div className="login-gradient-overlay" />

        <div className="login-headline">
          <h2>Seguridad de tu cuenta</h2>
          <p>Recupera el acceso a tu cuenta de forma segura en minutos.</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", opacity: 0.5 }}>
            <div style={{ height: "4px", width: "48px", background: "white", borderRadius: "9999px" }} />
            <div style={{ height: "4px", width: "32px", background: "rgba(255,255,255,0.4)", borderRadius: "9999px" }} />
            <div style={{ height: "4px", width: "32px", background: "rgba(255,255,255,0.4)", borderRadius: "9999px" }} />
          </div>
        </div>
      </section>

      {/* ── Right: Form ── */}
      <section className="login-form-panel">
        <div className="login-card-stitch">
          {/* Brand header */}
          <div className="login-brand-header">
            <div className="login-logo-icon">
              <Grid3x3 size={20} color="white" strokeWidth={1.5} />
            </div>
            <span className="login-wordmark">Coordinatech</span>
          </div>

          {step === "email" ? (
            <>
              <h1 className="login-title">¿Olvidaste tu contraseña?</h1>
              <p className="login-subtitle">Ingresa tu correo electrónico y te enviaremos un enlace para resetear tu contraseña.</p>

              <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
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
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && <p className="error-text">{error}</p>}

                <button type="submit" className="stitch-submit-btn" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <div className="login-footer-divider">
                <Link href="/login" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#667eea", textDecoration: "none", fontSize: "0.95rem", fontWeight: "500" }}>
                  <ArrowLeft size={16} />
                  Volver al login
                </Link>
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", paddingTop: "1rem" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}>
                  <CheckCircle size={64} color="#48bb78" />
                </div>

                <h1 className="login-title">Email enviado</h1>
                <p className="login-subtitle" style={{ marginBottom: "1.5rem" }}>
                  Hemos enviado un enlace de recuperación a:<br />
                  <strong>{email}</strong>
                </p>

                <div style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1.5rem",
                  fontSize: "0.9rem",
                  color: "#166534",
                  lineHeight: "1.6",
                }}>
                  <p style={{ margin: 0, marginBottom: "0.5rem" }}>✓ Revisa tu bandeja de entrada</p>
                  <p style={{ margin: 0, marginBottom: "0.5rem" }}>✓ Si no ves el email, revisa spam</p>
                  <p style={{ margin: 0 }}>✓ El enlace expira en 1 hora</p>
                </div>

                <p style={{ fontSize: "0.9rem", color: "#718096", marginBottom: "1.5rem" }}>
                  ¿No recibiste el email?
                </p>

                <button
                  onClick={() => setStep("email")}
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    background: "#667eea",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#5568d3";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#667eea";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  Enviar de nuevo
                </button>

                <div className="login-footer-divider">
                  <Link href="/login" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#667eea", textDecoration: "none", fontSize: "0.95rem", fontWeight: "500" }}>
                    <ArrowLeft size={16} />
                    Volver al login
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
