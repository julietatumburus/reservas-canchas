// Pelota de padel/tenis (optic-yellow) reutilizable. Cuerpo con radial-gradient
// CSS + costuras en SVG. El SVG llena el span (sin position), así quien la usa
// controla el posicionamiento (absolute/relative) sin conflictos de clases.
export function Ball({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`inline-block aspect-square rounded-full ${className}`}
      style={{
        background:
          "radial-gradient(circle at 32% 28%, #f3ffb0, #c2e636 52%, #93b81d 100%)",
        ...style,
      }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" className="block h-full w-full" fill="none">
        <path
          d="M17 18 C 46 42, 46 58, 17 82"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M83 18 C 54 42, 54 58, 83 82"
          stroke="rgba(255,255,255,0.92)"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
