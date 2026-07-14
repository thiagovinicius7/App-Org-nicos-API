import React from "react";
import { Leaf } from "lucide-react";

interface GeraniumLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "icon" | "horizontal";
}

export default function GeraniumLogo({ className = "", size = 200, variant = "full" }: GeraniumLogoProps) {
  // A sleek, minimalist, and premium typographic logo for Geranium Orgânicos.
  // This uses a clean Lucide leaf icon and crisp modern typography to look professional.

  if (variant === "icon") {
    return (
      <div 
        className={`inline-flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-xs ${className}`}
        style={{ width: size, height: size }}
      >
        <Leaf className="w-1/2 h-1/2 text-emerald-600" strokeWidth={2.5} />
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100/50 shadow-xs">
          <Leaf className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="font-sans font-bold tracking-tight text-slate-900 text-base leading-none">
            Geranium
          </span>
          <span className="font-mono text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest leading-none mt-1">
            Orgânicos
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center gap-2 ${className}`} style={{ width: size }}>
      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50 shadow-xs">
        <Leaf className="w-8 h-8 text-emerald-600" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="font-sans font-extrabold tracking-tight text-slate-900 text-lg leading-none">
          Geranium
        </span>
        <span className="font-mono text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest leading-none mt-1.5">
          Orgânicos
        </span>
      </div>
    </div>
  );
}
