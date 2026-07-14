import React from "react";

interface GeraniumLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "icon" | "horizontal";
}

export default function GeraniumLogo({ className = "", size = 200, variant = "full" }: GeraniumLogoProps) {
  // A sleek, minimalist typographic brand signature.
  // Completely removes background boxes and icons for a clean, professional, and premium look.

  if (variant === "icon") {
    return (
      <span className={`font-sans font-black text-xl text-emerald-600 tracking-tighter ${className}`}>
        G.
      </span>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={`flex items-baseline gap-1.5 ${className}`}>
        <span className="font-sans font-extrabold tracking-tight text-slate-900 text-base">
          Geranium
        </span>
        <span className="font-sans font-bold text-[9px] text-emerald-600 uppercase tracking-widest">
          Orgânicos
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center py-1.5 ${className}`} style={{ maxWidth: size }}>
      <span className="font-sans font-black tracking-tight text-slate-900 text-xl leading-none">
        Geranium
      </span>
      <span className="font-sans font-bold text-[10px] text-emerald-600 uppercase tracking-widest mt-1">
        Orgânicos
      </span>
    </div>
  );
}
