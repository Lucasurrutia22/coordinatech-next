'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, MapPin, PenTool, Upload, X, Check } from 'lucide-react';

interface EvidenceData {
  photoUrl?: string;
  gpsCoordinates?: { lat: number; lng: number };
  signature?: string;
  timestamp?: Date;
}

interface EvidenceCaptureProps {
  ticketId: string;
  onSave: (evidence: EvidenceData) => Promise<void>;
  existing?: EvidenceData;
}

export function EvidenceCapture({ ticketId, onSave, existing }: EvidenceCaptureProps) {
  const [evidence, setEvidence] = useState<EvidenceData>(existing || {});
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'photo' | 'gps' | 'signature'>('photo');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Captura de foto
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara');
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setEvidence(prev => ({ ...prev, photoUrl: imageData, timestamp: new Date() }));
        stopCamera();
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  }, []);

  // Captura GPS
  const captureGPS = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEvidence(prev => ({
            ...prev,
            gpsCoordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
            timestamp: new Date(),
          }));
        },
        (error) => {
          console.error('Error getting GPS:', error);
          alert('No se pudo obtener la ubicación GPS');
        }
      );
    }
  }, []);

  // Captura de firma
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const saveSignature = useCallback(() => {
    if (canvasRef.current) {
      const signatureData = canvasRef.current.toDataURL('image/png');
      setEvidence(prev => ({
        ...prev,
        signature: signatureData,
        timestamp: new Date(),
      }));
      clearSignature();
    }
  }, [clearSignature]);

  // Manejo de eventos del pad de firma
  const setupSignaturePad = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;

    canvas.onmousedown = () => {
      isDrawing = true;
    };

    canvas.onmousemove = (e) => {
      if (!isDrawing) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      ctx.lineTo(x, y);
      ctx.stroke();
    };

    canvas.onmouseup = () => {
      isDrawing = false;
    };

    canvas.onmouseleave = () => {
      isDrawing = false;
    };

    // Configurar estilo
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(evidence);
    } catch (err) {
      console.error('Error saving evidence:', err);
      alert('Error guardando evidencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Captura de Evidencias</h3>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setTab('photo')}
          className={`px-4 py-2 font-medium text-sm ${
            tab === 'photo'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Camera className="w-4 h-4 inline mr-2" />
          Foto
        </button>
        <button
          onClick={() => setTab('gps')}
          className={`px-4 py-2 font-medium text-sm ${
            tab === 'gps'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-4 h-4 inline mr-2" />
          Ubicación GPS
        </button>
        <button
          onClick={() => setTab('signature')}
          className={`px-4 py-2 font-medium text-sm ${
            tab === 'signature'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PenTool className="w-4 h-4 inline mr-2" />
          Firma
        </button>
      </div>

      {/* Contenido */}
      {tab === 'photo' && (
        <div className="space-y-4">
          {!cameraActive && !evidence.photoUrl && (
            <button
              onClick={startCamera}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Iniciar Cámara
            </button>
          )}

          {cameraActive && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg bg-black"
              />
              <div className="flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Capturar Foto
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {evidence.photoUrl && (
            <div className="space-y-2">
              <img src={evidence.photoUrl} alt="Capturada" className="w-full rounded-lg" />
              <button
                onClick={() => setEvidence(prev => ({ ...prev, photoUrl: undefined }))}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Eliminar Foto
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'gps' && (
        <div className="space-y-4">
          {evidence.gpsCoordinates ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Ubicación Capturada</span>
              </div>
              <p className="text-green-700 font-mono text-sm">
                {evidence.gpsCoordinates.lat.toFixed(6)}, {evidence.gpsCoordinates.lng.toFixed(6)}
              </p>
              <button
                onClick={() => setEvidence(prev => ({ ...prev, gpsCoordinates: undefined }))}
                className="mt-3 w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg text-sm"
              >
                Limpiar GPS
              </button>
            </div>
          ) : (
            <button
              onClick={captureGPS}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Capturar Ubicación Actual
            </button>
          )}
        </div>
      )}

      {tab === 'signature' && (
        <div className="space-y-4">
          {!evidence.signature && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Dibuja tu firma en el área de abajo</p>
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                onLoad={setupSignaturePad}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-crosshair"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={clearSignature}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Limpiar
                </button>
                <button
                  onClick={saveSignature}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm"
                >
                  Guardar Firma
                </button>
              </div>
            </div>
          )}

          {evidence.signature && (
            <div className="space-y-2">
              <div className="bg-gray-50 border-2 border-green-200 rounded-lg p-4">
                <img src={evidence.signature} alt="Firma capturada" className="w-full" />
              </div>
              <button
                onClick={() => setEvidence(prev => ({ ...prev, signature: undefined }))}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Eliminar Firma
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resumen y guardar */}
      <div className="mt-6 pt-6 border-t">
        <div className="space-y-2 mb-4 text-sm">
          {evidence.photoUrl && <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /> Foto capturada</div>}
          {evidence.gpsCoordinates && <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /> Ubicación GPS capturada</div>}
          {evidence.signature && <div className="flex items-center gap-2 text-green-700"><Check className="w-4 h-4" /> Firma capturada</div>}
        </div>

        <button
          onClick={handleSave}
          disabled={loading || (!evidence.photoUrl && !evidence.gpsCoordinates && !evidence.signature)}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {loading ? 'Guardando...' : 'Guardar Evidencias'}
        </button>
      </div>
    </div>
  );
}
