"use client";

import { useEffect, useState } from "react";

const CAROUSEL_IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1531746790731-6c087fecd65b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80",
    title: "Coordinación Logística",
    description: "Gestiona flotas y rutas en tiempo real"
  },
  {
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80",
    title: "Equipo de Técnicos",
    description: "Asigna y monitorea técnicos disponibles"
  },
  {
    url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800&q=80",
    title: "Análisis y Reportes",
    description: "Métricas SLA y desempeño operativo"
  }
];

export function LoginCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="login-carousel-placeholder" />;
  }

  return (
    <div className="login-carousel-container">
      {/* Background slides */}
      {CAROUSEL_IMAGES.map((slide, index) => (
        <div
          key={index}
          className="login-carousel-slide"
          style={{
            opacity: index === currentIndex ? 1 : 0,
            backgroundImage: `url('${slide.url}')`,
            transition: "opacity 0.8s ease-in-out"
          }}
        />
      ))}

      {/* Overlay gradient */}
      <div className="login-carousel-overlay" />

      {/* Content */}
      <div className="login-carousel-content">
        <div className="login-carousel-text">
          <h2>{CAROUSEL_IMAGES[currentIndex].title}</h2>
          <p>{CAROUSEL_IMAGES[currentIndex].description}</p>
        </div>

        {/* Indicators */}
        <div className="login-carousel-indicators">
          {CAROUSEL_IMAGES.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? "active" : ""}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
