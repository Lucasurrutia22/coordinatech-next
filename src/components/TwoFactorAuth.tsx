"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Lock, ArrowRight } from "lucide-react";

interface TwoFactorAuthProps {
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  email: string;
  loading?: boolean;
}

export function TwoFactorAuth({ onVerify, onCancel, email, loading = false }: TwoFactorAuthProps) {
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInput = (index: number, value: string) => {
    // Solo permite dígitos
    if (!/^\d*$/.test(value)) return;

    // Limita a 1 dígito
    const digit = value.slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-focus al siguiente campo si se ingresó un dígito
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    setError("");
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite borrar con backspace
    if (event.key === "Backspace") {
      if (code[index] === "") {
        // Si el campo está vacío, retrocede al campo anterior
        if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // Si hay contenido, borra el contenido actual
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
      return;
    }

    // Permite tecla izquierda/derecha para navegar
    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text");
    const digits = pastedData.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < Math.min(digits.length, 6); i++) {
        newCode[i] = digits[i];
      }
      setCode(newCode);

      // Focus en el siguiente campo vacío o el último
      const emptyIndex = newCode.findIndex((d) => d === "");
      if (emptyIndex !== -1) {
        inputRefs.current[emptyIndex]?.focus();
      } else {
        inputRefs.current[5]?.focus();
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Por favor ingresa los 6 dígitos");
      return;
    }

    setVerifying(true);
    try {
      await onVerify(fullCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido. Intenta de nuevo.");
      // Reset code inputs
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="two-factor-container" style={{ padding: "2rem", textAlign: "center" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "64px",
          height: "64px",
          margin: "0 auto 1rem",
          borderRadius: "12px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}>
          <Lock size={32} color="white" />
        </div>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: "600",
          marginBottom: "0.5rem",
          color: "#1a202c",
        }}>
          Verificación de dos factores
        </h2>
        <p style={{
          fontSize: "0.95rem",
          color: "#718096",
          marginBottom: "0.25rem",
        }}>
          Hemos enviado un código de 6 dígitos a
        </p>
        <p style={{
          fontSize: "0.95rem",
          fontWeight: "500",
          color: "#2d3748",
        }}>
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.5rem" }}>
        {/* Code input fields */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginBottom: "1rem",
        }}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={loading || verifying}
              placeholder="•"
              style={{
                width: "48px",
                height: "48px",
                fontSize: "1.5rem",
                fontWeight: "600",
                textAlign: "center",
                border: error ? "2px solid #f56565" : "2px solid #cbd5e0",
                borderRadius: "8px",
                background: digit ? "#f7fafc" : "#fff",
                transition: "all 0.2s ease",
                cursor: loading || verifying ? "not-allowed" : "pointer",
                opacity: loading || verifying ? 0.6 : 1,
                letterSpacing: "0.5em",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = error ? "#f56565" : "#667eea";
                e.target.style.boxShadow = error ? "0 0 0 3px rgba(245, 101, 101, 0.1)" : "0 0 0 3px rgba(102, 126, 234, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? "#f56565" : "#cbd5e0";
                e.target.style.boxShadow = "none";
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{
            fontSize: "0.9rem",
            color: "#c53030",
            background: "#fff5f5",
            padding: "0.75rem",
            borderRadius: "6px",
            border: "1px solid #fc8181",
          }}>
            {error}
          </p>
        )}

        {/* Instructions */}
        <p style={{
          fontSize: "0.85rem",
          color: "#718096",
          lineHeight: "1.5",
        }}>
          Ingresa los 6 dígitos del código que recibiste
        </p>

        {/* Submit button */}
        <button
          type="submit"
          disabled={code.join("").length !== 6 || loading || verifying}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            width: "100%",
            padding: "0.875rem 1rem",
            fontSize: "0.95rem",
            fontWeight: "600",
            color: "white",
            background: code.join("").length === 6 && !loading && !verifying ? "#667eea" : "#cbd5e0",
            border: "none",
            borderRadius: "8px",
            cursor: code.join("").length === 6 && !loading && !verifying ? "pointer" : "not-allowed",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            if (code.join("").length === 6 && !loading && !verifying) {
              (e.currentTarget as HTMLButtonElement).style.background = "#5568d3";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            }
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#667eea";
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          }}
        >
          {verifying ? "Verificando..." : (
            <>
              Verificar código
              <ArrowRight size={18} />
            </>
          )}
        </button>

        {/* Cancel button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading || verifying}
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            fontSize: "0.95rem",
            fontWeight: "500",
            color: "#718096",
            background: "transparent",
            border: "1px solid #cbd5e0",
            borderRadius: "8px",
            cursor: loading || verifying ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: loading || verifying ? 0.5 : 1,
          }}
          onMouseOver={(e) => {
            if (!loading && !verifying) {
              (e.currentTarget as HTMLButtonElement).style.background = "#f7fafc";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#a0aec0";
            }
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e0";
          }}
        >
          Volver atrás
        </button>
      </form>
    </div>
  );
}
