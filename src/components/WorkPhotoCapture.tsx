'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, MapPin, RotateCcw, X, Check } from 'lucide-react';

interface PhotoData {
  photo: string; // base64 data URL
  gps?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  timestamp: string; // ISO 8601
  address?: string;
}

interface WorkPhotoCaptureProps {
  onPhotoCapture?: (photoData: PhotoData) => void;
  onPhotoClear?: () => void;
}

export function WorkPhotoCapture({ onPhotoCapture, onPhotoClear }: WorkPhotoCaptureProps) {
  const [photoData, setPhotoData] = useState<PhotoData | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [captureMode, setCaptureMode] = useState<'idle' | 'capturing' | 'preview'>('idle');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsError, setGpsError] = useState<string>('');
  const [deviceLocation, setDeviceLocation] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Usar cámara trasera si está disponible
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setCaptureMode('capturing');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Capturar GPS
  const captureGPS = useCallback(async () => {
    setGpsStatus('loading');
    setGpsError('');

    if (!navigator.geolocation) {
      setGpsError('Geolocalización no disponible en este dispositivo');
      setGpsStatus('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Intentar obtener dirección usando reverse geocoding (servicio de Google)
        let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.address) {
              address = data.address.road || data.address.village || data.address.city || address;
            }
          }
        } catch (err) {
          console.warn('Could not reverse geocode:', err);
        }

        setDeviceLocation(address);
        setGpsStatus('success');
      },
      (error) => {
        console.error('GPS Error:', error);
        setGpsError('No se pudo obtener la ubicación. Verifica los permisos de localización.');
        setGpsStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame del video en canvas
    ctx.drawImage(video, 0, 0);

    // Obtener foto en base64
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Capturar GPS simultáneamente
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const now = new Date().toISOString();

        const newPhotoData: PhotoData = {
          photo: photoDataUrl,
          gps: {
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy)
          },
          timestamp: now
        };

        setPhotoData(newPhotoData);
        setCaptureMode('preview');
        stopCamera();
        setGpsStatus('success');

        if (onPhotoCapture) {
          onPhotoCapture(newPhotoData);
        }
      },
      (error) => {
        console.warn('GPS capture failed, saving photo without GPS:', error);
        const now = new Date().toISOString();

        const newPhotoData: PhotoData = {
          photo: photoDataUrl,
          timestamp: now
        };

        setPhotoData(newPhotoData);
        setCaptureMode('preview');
        stopCamera();
        setGpsStatus('error');

        if (onPhotoCapture) {
          onPhotoCapture(newPhotoData);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, [stopCamera, onPhotoCapture]);

  // Limpiar y empezar de nuevo
  const reset = useCallback(() => {
    setPhotoData(null);
    setGpsStatus('idle');
    setGpsError('');
    setDeviceLocation('');
    setCaptureMode('idle');
    stopCamera();

    if (onPhotoClear) {
      onPhotoClear();
    }
  }, [stopCamera, onPhotoClear]);

  // VISTA: ESTADO INICIAL
  if (captureMode === 'idle') {
    return (
      <div style={{
        border: '1.5px dashed var(--line)',
        borderRadius: 'var(--r-md)',
        padding: '1rem',
        background: 'var(--surface-2)',
        textAlign: 'center',
        display: 'grid',
        gap: '0.75rem'
      }}>
        <Camera size={24} style={{ margin: '0 auto', color: 'var(--muted)' }} />
        <button
          type="button"
          onClick={startCamera}
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          📸 Capturar foto en vivo
        </button>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--muted)' }}>
          La foto se capturará con ubicación GPS automáticamente
        </p>
      </div>
    );
  }

  // VISTA: CAPTURA EN VIVO
  if (captureMode === 'capturing') {
    return (
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-md)',
        padding: '1rem',
        display: 'grid',
        gap: '0.75rem'
      }}>
        {/* Video Preview */}
        <div style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '75%',
          background: '#000',
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
          marginBottom: '0.5rem'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Hidden Canvas for Photo Capture */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* GPS Status */}
        <div style={{
          background: gpsStatus === 'success' ? '#dcfce7' : gpsStatus === 'error' ? '#fee2e2' : '#f3f4f6',
          border: `1px solid ${gpsStatus === 'success' ? '#86efac' : gpsStatus === 'error' ? '#fca5a5' : '#d1d5db'}`,
          borderRadius: 'var(--r-sm)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.72rem',
          color: gpsStatus === 'success' ? '#166534' : gpsStatus === 'error' ? '#991b1b' : '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <MapPin size={14} />
          {gpsStatus === 'loading' && <span>Obteniendo ubicación...</span>}
          {gpsStatus === 'success' && <span>✓ Ubicación capturada</span>}
          {gpsStatus === 'error' && <span>⚠ Sin ubicación (se capturará solo foto)</span>}
        </div>

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={capturePhoto}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Check size={16} /> Capturar
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setCaptureMode('idle');
            }}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#f3f4f6',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <X size={16} /> Cancelar
          </button>
        </div>
      </div>
    );
  }

  // VISTA: VISTA PREVIA
  if (captureMode === 'preview' && photoData) {
    const time = new Date(photoData.timestamp).toLocaleString('es-CO');

    return (
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-md)',
        padding: '1rem',
        display: 'grid',
        gap: '0.75rem'
      }}>
        {/* Foto Capturada */}
        <div style={{
          width: '100%',
          borderRadius: 'var(--r-sm)',
          overflow: 'hidden',
          border: '1px solid var(--line)'
        }}>
          <img
            src={photoData.photo}
            alt="Foto capturada"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>

        {/* Información de Captura */}
        <div style={{
          background: '#f9fafb',
          borderRadius: 'var(--r-sm)',
          padding: '0.75rem',
          border: '1px solid var(--line)',
          fontSize: '0.78rem',
          color: 'var(--ink-2)',
          display: 'grid',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <strong>Hora:</strong>
            <span>{time}</span>
          </div>

          {photoData.gps && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <strong>Latitud:</strong>
                <span>{photoData.gps.lat.toFixed(6)}°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <strong>Longitud:</strong>
                <span>{photoData.gps.lng.toFixed(6)}°</span>
              </div>
              {photoData.gps.accuracy && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <strong>Precisión:</strong>
                  <span>±{photoData.gps.accuracy}m</span>
                </div>
              )}
              <div style={{
                marginTop: '0.3rem',
                paddingTop: '0.4rem',
                borderTop: '1px solid var(--line)'
              }}>
                <strong>📍 Ubicación:</strong>
                <a
                  href={`https://maps.google.com/?q=${photoData.gps.lat},${photoData.gps.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    marginTop: '0.3rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    wordBreak: 'break-word',
                    fontSize: '0.72rem'
                  }}
                >
                  Ver en Google Maps ↗
                </a>
              </div>
            </>
          )}

          {!photoData.gps && (
            <div style={{
              padding: '0.5rem',
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: 'var(--r-sm)',
              color: '#92400e',
              fontSize: '0.72rem'
            }}>
              ⚠ Foto capturada sin ubicación GPS
            </div>
          )}
        </div>

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              background: '#f3f4f6',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-sm)',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.7')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <RotateCcw size={16} /> Retomar
          </button>
        </div>

        {/* Hidden input para pasar datos al formulario */}
        <input
          type="hidden"
          name="workPhotoData"
          value={JSON.stringify(photoData)}
        />
      </div>
    );
  }

  return null;
}
