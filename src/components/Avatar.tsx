"use client";

import type { CSSProperties } from "react";

// ── Gender detection ──────────────────────────────────────────────────────────
// Common Spanish/Latin female first names
const FEMALE_NAMES = new Set([
  "maria","ana","sofia","valentina","carmen","lucia","isabel","elena","laura",
  "sara","patricia","claudia","marta","paula","rosa","julia","andrea","beatriz",
  "monica","nuria","pilar","teresa","cristina","natalia","diana","silvia",
  "alicia","irene","barbara","alejandra","veronica","lorena","gloria","raquel",
  "fernanda","gabriela","camila","daniela","paola","carolina","susana","yolanda",
  "mariana","esther","eva","emilia","lara","noelia","jimena","nerea","ariadna",
  "alba","carla","miriam","rebeca","vanesa","gonzalez","martha","claudia",
]);

export function detectGender(name: string): "female" | "male" {
  const first = name.trim().split(/\s+/)[0].toLowerCase();
  if (FEMALE_NAMES.has(first)) return "female";
  // Spanish pattern: ends in -ina, -ela, -ita → female
  if (/(?:ina|ela|ita)$/.test(first)) return "female";
  // Ends in 'a' (length > 3) but not common male names ending in 'a'
  const maleEndA = ["borja", "luca", "nikita", "garcia", "inca"];
  if (first.endsWith("a") && first.length > 3 && !maleEndA.includes(first)) return "female";
  return "male";
}

// ── SVG Person Icons ──────────────────────────────────────────────────────────
function MaleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {/* Head */}
      <circle cx="12" cy="7.5" r="3.8" fill="currentColor" />
      {/* Shoulders / body */}
      <path
        d="M3.5 22c0-4.69 3.81-8.5 8.5-8.5s8.5 3.81 8.5 8.5"
        fill="currentColor"
      />
    </svg>
  );
}

function FemaleIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {/* Hair arc – visible above head */}
      <path
        d="M7.8 9.2A4.5 4.5 0 0 1 12 4a4.5 4.5 0 0 1 4.2 5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Head */}
      <circle cx="12" cy="9.8" r="3.2" fill="currentColor" />
      {/* Body – slightly narrower than male */}
      <path
        d="M5.5 22c0-3.58 2.91-6.5 6.5-6.5s6.5 2.92 6.5 6.5"
        fill="currentColor"
      />
    </svg>
  );
}

// ── Palette ───────────────────────────────────────────────────────────────────
const MALE_BG   = "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)";
const FEMALE_BG = "linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)";

// ── Avatar component ──────────────────────────────────────────────────────────
interface AvatarProps {
  /** Full name — used for gender detection */
  name: string;
  /** Pixel diameter (default 36) */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Avatar({ name, size = 36, className, style }: AvatarProps) {
  const gender   = detectGender(name);
  const iconSize = Math.round(size * 0.58);

  return (
    <div
      className={className}
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: gender === "female" ? FEMALE_BG : MALE_BG,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      {gender === "female"
        ? <FemaleIcon size={iconSize} />
        : <MaleIcon   size={iconSize} />
      }
    </div>
  );
}
