"use client";

import { useState } from "react";
import { Upload, X, FileText, ImageIcon, Loader } from "lucide-react";

export interface DocumentFile {
  name: string;
  type: string;
  data: string; // base64 data URL
  uploadedAt: string;
}

export function DocumentUploader({
  onDocumentsChange,
  documents = [],
}: {
  onDocumentsChange: (docs: DocumentFile[]) => void;
  documents?: DocumentFile[];
}) {
  const [uploading, setUploading] = useState(false);
  const [localDocs, setLocalDocs] = useState<DocumentFile[]>(documents);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    setUploading(true);
    const files = Array.from(e.target.files);
    const newDocs: DocumentFile[] = [];

    for (const file of files) {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const doc: DocumentFile = {
              name: file.name,
              type: file.type,
              data: event.target.result as string,
              uploadedAt: new Date().toISOString(),
            };
            newDocs.push(doc);

            // Si es el último archivo, actualiza el estado
            if (newDocs.length === files.length) {
              const updated = [...localDocs, ...newDocs];
              setLocalDocs(updated);
              onDocumentsChange(updated);
              setUploading(false);
            }
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Error al cargar archivo:", err);
      }
    }
  };

  const removeDocument = (index: number) => {
    const updated = localDocs.filter((_, i) => i !== index);
    setLocalDocs(updated);
    onDocumentsChange(updated);
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {/* Zona de carga */}
      <div
        style={{
          border: "2px dashed var(--line)",
          borderRadius: "var(--r-sm)",
          padding: "2rem 1.5rem",
          textAlign: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          background: uploading ? "rgba(0, 0, 0, 0.02)" : "var(--surface-alt)",
          opacity: uploading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
      >
        <input
          type="file"
          id="doc-upload"
          onChange={handleFileChange}
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          disabled={uploading}
          style={{ display: "none" }}
        />
        <label
          htmlFor="doc-upload"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? (
            <Loader size={24} color="var(--brand)" style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Upload size={24} color="var(--brand)" />
          )}
          <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--ink)" }}>
            {uploading ? "Cargando..." : "Arrastra archivos aquí o haz clic para seleccionar"}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
            Fotos, PDFs, documentos (máx. 10MB por archivo)
          </span>
        </label>
      </div>

      {/* Lista de documentos cargados */}
      {localDocs.length > 0 && (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            📎 Documentos cargados ({localDocs.length})
          </p>
          {localDocs.map((doc, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                {doc.type.startsWith("image/") ? (
                  <ImageIcon size={18} color="var(--brand)" />
                ) : (
                  <FileText size={18} color="var(--brand)" />
                )}
                <div style={{ minWidth: 0, overflow: "hidden" }}>
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
                    {new Date(doc.uploadedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDocument(idx)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "0.5rem",
                  flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
