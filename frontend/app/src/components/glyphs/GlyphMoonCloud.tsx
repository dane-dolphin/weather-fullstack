import styles from './glyphs.module.css';

type Props = {
  size?: number;
};

export function GlyphMoonCloud({ size = 200 }: Props) {
  return (
    <svg
      width={size}
      height={(size * 160) / 180}
      viewBox="0 0 180 160"
      className={`${styles.glyph} ${styles.bob}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glyph-mc-moon" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFCEB" />
          <stop offset="100%" stopColor="#9CA8E8" />
        </radialGradient>
        <linearGradient id="glyph-mc-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6DCEE" />
          <stop offset="100%" stopColor="#8E97B8" />
        </linearGradient>
      </defs>
      {/* moon disc */}
      <circle cx="60" cy="60" r="32" fill="url(#glyph-mc-moon)" />
      {/* shadow crescent overlay */}
      <circle cx="76" cy="55" r="26" fill="rgba(20,16,74,0.85)" />
      {/* cloud in front */}
      <path
        d="M60 110a18 18 0 0 1 35-5 14 14 0 0 1 26 4 16 16 0 0 1-3 31H66a16 16 0 0 1-6-30z"
        fill="url(#glyph-mc-cloud)"
      />
    </svg>
  );
}
