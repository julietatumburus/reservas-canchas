// Fondo del hero: cancha de padel real (vista superior) — piso azul, contorno
// rojo/coral, líneas blancas marcadas y textura de alfombra/turf. CSS/SVG puro.
export function CourtBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 640"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Piso azul de la cancha */}
          <linearGradient id="court-floor" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0" stopColor="#2f9be6" />
            <stop offset="1" stopColor="#155fb0" />
          </linearGradient>
          {/* Contorno rojo/coral (la zona exterior) */}
          <linearGradient id="court-surround" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e0584a" />
            <stop offset="1" stopColor="#b23a2f" />
          </linearGradient>
          {/* Textura tipo alfombra/turf sobre el piso */}
          <pattern
            id="court-turf"
            width="9"
            height="9"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="9" height="9" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
          </pattern>
          {/* Grano de arena */}
          <pattern id="court-sand" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.6" fill="rgba(255,255,255,0.05)" />
            <circle cx="4" cy="3.5" r="0.5" fill="rgba(0,0,0,0.06)" />
          </pattern>
          {/* Pelota */}
          <radialGradient id="court-ball" cx="35%" cy="30%" r="75%">
            <stop offset="0" stopColor="#f3ffb0" />
            <stop offset="52%" stopColor="#c2e636" />
            <stop offset="100%" stopColor="#93b81d" />
          </radialGradient>
        </defs>

        {/* Zona exterior roja */}
        <rect width="1200" height="640" fill="url(#court-surround)" />
        <rect width="1200" height="640" fill="url(#court-sand)" />

        {/* Cancha azul */}
        <rect x="150" y="95" width="900" height="450" rx="6" fill="url(#court-floor)" />
        <rect x="150" y="95" width="900" height="450" rx="6" fill="url(#court-turf)" />
        <rect x="150" y="95" width="900" height="450" rx="6" fill="url(#court-sand)" />

        {/* Vidrios / postes (insinuados) */}
        <rect
          x="150"
          y="95"
          width="900"
          height="450"
          rx="6"
          fill="none"
          stroke="rgba(8,18,28,0.55)"
          strokeWidth="10"
        />

        {/* Líneas blancas de la cancha */}
        <g stroke="#f4f9ff" strokeWidth="4" opacity="0.92" fill="none">
          <rect x="170" y="115" width="860" height="410" />
          {/* red (centro) */}
          <line x1="600" y1="115" x2="600" y2="525" />
          {/* líneas de saque */}
          <line x1="350" y1="115" x2="350" y2="525" />
          <line x1="850" y1="115" x2="850" y2="525" />
          {/* línea central de saque */}
          <line x1="350" y1="320" x2="850" y2="320" />
        </g>

        {/* Pelota apoyada en la cancha */}
        <ellipse cx="726" cy="436" rx="48" ry="13" fill="rgba(6,14,22,0.35)" />
        <circle cx="720" cy="398" r="44" fill="url(#court-ball)" />
        <g stroke="rgba(255,255,255,0.92)" strokeWidth="4.5" fill="none" strokeLinecap="round">
          <path d="M690 366 C 712 386, 712 410, 690 430" />
          <path d="M750 366 C 728 386, 728 410, 750 430" />
        </g>
      </svg>

      {/* Scrim: oscurece la izquierda para legibilidad del texto, pero deja la
          cancha bien visible hacia la derecha, y funde con el gris abajo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-bg from-10% via-bg/55 via-45% to-bg/5" />
      <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-bg via-bg/70 to-transparent" />
    </div>
  );
}
