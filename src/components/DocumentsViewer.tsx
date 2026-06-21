"use client";

import { FileText, ImageIcon, Download, Eye } from "lucide-react";
import { WorkOrder } from "@/types/domain";

export function DocumentsViewer({ workOrder }: { workOrder: WorkOrder }) {
  const allDocs = [...(workOrder.documents || []), ...(workOrder.photos || [])];

  if (allDocs.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>
        No hay documentos adjuntos
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const handlePreview = (doc: (typeof allDocs)[0]) => {
    if (doc.url.startsWith("data:")) {
      if (doc.type.startsWith("image/")) {
        // Abre imagen en nueva ventana
        const img = new Image();
        img.src = doc.url;
        const w = window.open("");
        if (w) {
          w.document.write(img.outerHTML);
        }
      } else if (doc.type === "application/pdf") {
        // Para PDF, intenta abrir en navegador
        const w = window.open(doc.url);
      }
    }
  };

  const handleDownload = (doc: (typeof allDocs)[0]) => {
    if (doc.url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = doc.url;
      link.download = doc.name;
      link.click();
    }
  };

  return (
    <div style={{ display: "grid", gap: "0.5rem" }}>
      {allDocs.map((doc) => (
        <div
          key={doc.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "var(--r-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1 }}>
            {doc.type.startsWith("image/") ? (
              <ImageIcon size={18} style={{ color: "#8b5cf6", flexShrink: 0 }} />
            ) : (
              <FileText size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.name}
              </p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.7rem", color: "var(--muted)" }}>
                {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            {doc.type.startsWith("image/") || doc.type === "application/pdf" ? (
              <button
                onClick={() => handlePreview(doc)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.2s",
                }}
                title="Vista previa"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#60a5fa";
                }}
              >
                <Eye size={16} />
              </button>
            ) : null}
            <button
              onClick={() => handleDownload(doc)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                color: "#94a3b8",
                display: "flex",
                alignItems: "center",
                transition: "color 0.2s",
              }}
              title="Descargar"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#16a34a";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
              }}
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
