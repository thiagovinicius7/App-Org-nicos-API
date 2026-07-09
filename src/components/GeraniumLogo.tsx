import React from "react";

interface GeraniumLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "icon" | "horizontal";
}

export default function GeraniumLogo({ className = "", size = 42, variant = "full" }: GeraniumLogoProps) {
  // A high-fidelity SVG drawing representing the Geranium flower cluster and leaves from the uploaded logo.
  // We use:
  // - Terracotta/orange red (#d1421b / #e0542c) for petals.
  // - Warm yellow highlighting (#f5b041) for petal outlines/strokes.
  // - Grass organic green (#109618 / #028a0f) for leaves.
  // This matches the exact visual feel of the "Geranium Orgânicos" logo sent by the user!
  const flowerSvg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-2xs"
    >
      {/* Dynamic Textured Leaves Background */}
      {/* Left leaf cluster */}
      <path
        d="M15 45 C5 35, 10 55, 20 52 C30 50, 25 40, 15 45 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1"
      />
      <path
        d="M22 55 C12 62, 28 65, 32 55 C36 45, 30 48, 22 55 Z"
        fill="#16a34a"
        stroke="#166534"
        strokeWidth="1"
      />

      {/* Right leaf cluster */}
      <path
        d="M95 45 C105 35, 100 55, 90 52 C80 50, 85 40, 95 45 Z"
        fill="#22c55e"
        stroke="#15803d"
        strokeWidth="1"
      />
      <path
        d="M88 55 C98 62, 82 65, 78 55 C74 45, 80 48, 88 55 Z"
        fill="#16a34a"
        stroke="#166534"
        strokeWidth="1"
      />

      {/* Top Center-Right Leaves */}
      <path
        d="M72 25 C75 10, 55 12, 60 25 C65 35, 70 30, 72 25 Z"
        fill="#15803d"
        stroke="#14532d"
        strokeWidth="1"
      />
      <path
        d="M48 20 C42 8, 32 20, 42 26 C48 30, 52 24, 48 20 Z"
        fill="#16a34a"
        stroke="#15803d"
        strokeWidth="1"
      />
      <path
        d="M62 18 C58 6, 74 10, 68 22 C64 26, 64 22, 62 18 Z"
        fill="#22c55e"
        stroke="#16a34a"
        strokeWidth="1"
      />

      {/* Center Background Leaves (Connectors) */}
      <path
        d="M45 42 C35 32, 55 35, 60 42 C65 48, 55 50, 45 42 Z"
        fill="#14532d"
        opacity="0.9"
      />

      {/* Left Smaller Flower */}
      <g transform="translate(25, 48) scale(0.65)">
        {/* Five petals */}
        <path d="M0 0 C-15 -30, -32 -10, -18 -2 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C15 -30, 32 -10, 18 -2 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C-28 10, -10 32, -2 18 Z" fill="#c0392b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C28 10, 10 32, 2 18 Z" fill="#c0392b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C-15 32, 15 32, 0 15 Z" fill="#922b21" stroke="#f5b041" strokeWidth="1.5" />
        {/* Petal Highlights */}
        <path d="M-5 -8 C-8 -15, -12 -12, -8 -5" stroke="#f5b041" strokeWidth="1" fill="none" />
        <path d="M5 -8 C8 -15, 12 -12, 8 -5" stroke="#f5b041" strokeWidth="1" fill="none" />
        {/* Center pistils */}
        <circle cx="0" cy="0" r="4.5" fill="#f5b041" />
        <circle cx="-2" cy="-2" r="1.5" fill="#fef9e7" />
        <circle cx="2" cy="1" r="1.5" fill="#fef9e7" />
      </g>

      {/* Right Smaller Flower */}
      <g transform="translate(95, 48) scale(0.65)">
        {/* Five petals */}
        <path d="M0 0 C-15 -30, -32 -10, -18 -2 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C15 -30, 32 -10, 18 -2 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C-28 10, -10 32, -2 18 Z" fill="#c0392b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C28 10, 10 32, 2 18 Z" fill="#c0392b" stroke="#f5b041" strokeWidth="1.5" />
        <path d="M0 0 C-15 32, 15 32, 0 15 Z" fill="#922b21" stroke="#f5b041" strokeWidth="1.5" />
        {/* Center pistils */}
        <circle cx="0" cy="0" r="4.5" fill="#f5b041" />
        <circle cx="-1" cy="2" r="1.5" fill="#fef9e7" />
        <circle cx="1" cy="-2" r="1.5" fill="#fef9e7" />
      </g>

      {/* Center Main Flower (Upper part of cluster) */}
      <g transform="translate(60, 32) scale(0.95)">
        {/* Beautiful overlapping petals */}
        <path d="M0 0 C-20 -35, -40 -12, -22 -4 Z" fill="#e0542c" stroke="#f5b041" strokeWidth="1.8" />
        <path d="M0 0 C20 -35, 40 -12, 22 -4 Z" fill="#e0542c" stroke="#f5b041" strokeWidth="1.8" />
        <path d="M0 0 C-32 12, -15 38, -5 20 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.8" />
        <path d="M0 0 C32 12, 15 38, 5 20 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="1.8" />
        <path d="M0 0 C-18 35, 18 35, 0 18 Z" fill="#ba3c1b" stroke="#f5b041" strokeWidth="1.8" />
        {/* Petal Highlights */}
        <path d="M-8 -12 C-12 -22, -18 -18, -12 -8" stroke="#fcd34d" strokeWidth="1.2" fill="none" />
        <path d="M8 -12 C12 -22, 18 -18, 12 -8" stroke="#fcd34d" strokeWidth="1.2" fill="none" />
        {/* Center pistils */}
        <circle cx="0" cy="0" r="6" fill="#f5b041" />
        <circle cx="-2" cy="-2" r="2" fill="#fff" />
        <circle cx="2" cy="1" r="2" fill="#fff" />
        <circle cx="-1" cy="2" r="1.5" fill="#fcd34d" />
      </g>

      {/* Center Main Flower (Lower part of cluster, overlapping) */}
      <g transform="translate(50, 54)">
        {/* Beautiful overlapping petals */}
        <path d="M0 0 C-22 -35, -45 -12, -24 -4 Z" fill="#e0542c" stroke="#f5b041" strokeWidth="2" />
        <path d="M0 0 C22 -35, 45 -12, 24 -4 Z" fill="#e0542c" stroke="#f5b041" strokeWidth="2" />
        <path d="M0 0 C-35 12, -15 42, -5 22 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="2" />
        <path d="M0 0 C35 12, 15 42, 5 22 Z" fill="#d1421b" stroke="#f5b041" strokeWidth="2" />
        <path d="M0 0 C-20 38, 20 38, 0 20 Z" fill="#a03014" stroke="#f5b041" strokeWidth="2" />
        {/* Petal Highlights */}
        <path d="M-8 -12 C-14 -22, -22 -18, -14 -8" stroke="#fcd34d" strokeWidth="1.5" fill="none" />
        <path d="M8 -12 C14 -22, 22 -18, 14 -8" stroke="#fcd34d" strokeWidth="1.5" fill="none" />
        {/* Center pistils */}
        <circle cx="0" cy="0" r="6.5" fill="#f5b041" />
        <circle cx="-2" cy="-2" r="2" fill="#fff" />
        <circle cx="2" cy="1" r="2" fill="#fff" />
        <circle cx="1" cy="3" r="1.5" fill="#fff" />
      </g>
    </svg>
  );

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {flowerSvg}
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {flowerSvg}
        <div className="flex flex-col">
          <span className="text-[11px] text-amber-600 font-serif italic font-extrabold leading-none tracking-wide">
            Orgânicos
          </span>
          <span className="text-sm font-extrabold text-green-700 leading-none tracking-tight uppercase">
            Geranium
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {flowerSvg}
      <div className="mt-1 flex flex-col items-center">
        <span className="text-[11px] text-amber-600 font-serif italic font-extrabold tracking-wide -mb-1 leading-none">
          Orgânicos
        </span>
        <span className="text-xl font-extrabold text-green-700 leading-none tracking-tight uppercase">
          Geranium
        </span>
      </div>
    </div>
  );
}
