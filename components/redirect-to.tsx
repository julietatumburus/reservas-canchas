"use client";

import { useEffect } from "react";

// Navegación de página completa (sirve para saltar a otro origen/subdominio,
// que es algo que un redirect() de server action no puede hacer).
export function RedirectTo({
  url,
  label = "Entrando…",
}: {
  url: string;
  label?: string;
}) {
  useEffect(() => {
    window.location.replace(url);
  }, [url]);

  return (
    <div className="bg-grid flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
