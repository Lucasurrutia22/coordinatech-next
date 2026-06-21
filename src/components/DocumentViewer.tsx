"use client";

import { FileText, ImageIcon, Download, X } from "lucide-react";
import { useState } from "react";

export interface WorkDocument {
  name: string;
  type: string;
  data: string; // base64 data URL
  uploadedAt: string;
}

export function DocumentViewer({ documents }: { documents?: WorkDocument[] }) {
  if (!documents || documents.length === 0) {
    return (
      <div style={{ padding: "0.75rem 1rem", background: "var(--surface-alt)", borderRadius: "var(--r-sm)", textAlign: "center" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", margin: 0 }}>Sin documentos adjuntos</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {documents.map((doc, idx) => (
        <DocumentItem key={idx} doc={doc} />
      ))}
    </div>
  );
}

function DocumentItem({ doc }: { doc: WorkDocument }) {
  const [preview, setPreview] = useState(false);
  const isImage = doc.type.startsWith("image/");

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = doc.data;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-sm)",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0, flex: 1 }}>
          {isImage ? (
            <ImageIcon size={18} color="var(--brand)" style={{ flexShrink: 0 }} />
          ) : (
            <FileText size={18} color="var(--brand)" style={{ flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.82rem",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doc.name}
            </p>
            <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)" }}>
              {new Date(doc.uploadedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
          {isImage && (
            <button
              type="button"
              onClick={() => setPreview(true)}
              style={{
                background: "none",
                border: "1px solid var(--line)",
                padding: "0.4rem 0.6rem",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                color: "var(--muted)",
                fontSize: "0.7rem",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-alt)";
                e.currentTarget.style.color = "var(--ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--muted)";
              }}
            >
              Ver
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "0.4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--brand)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
            title="Descargar"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Modal de preview */}
      {preview && isImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setPreview(false)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              background: "white",
              borderRadius: "var(--r-lg)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>{doc.name}</p>
              <button
                type="button"
                onClick={() => setPreview(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "0.3rem",
                }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={doc.data}
              alt={doc.name}
              style={{
                maxWidth: "100%",
                maxHeight: "calc(90vh - 60px)",
                objectFit: "contain",
                borderRadius: "var(--r-sm)",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
