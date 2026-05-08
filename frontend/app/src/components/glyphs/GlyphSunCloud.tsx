import styles from './glyphs.module.css';

type Props = {
  size?: number;
};

export function GlyphSunCloud({ size = 200 }: Props) {
  return (
    <svg
      width={size}
      height={(size * 160) / 180}
      viewBox="0 0 180 160"
      className={`${styles.glyph} ${styles.bob}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glyph-sc-sun" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF6CF" />
          <stop offset="55%" stopColor="#FFC862" />
          <stop offset="100%" stopColor="#F4732A" />
        </radialGradient>
        <linearGradient id="glyph-sc-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D8E2F0" />
        </linearGradient>
      </defs>
      {/* sun behind cloud */}
      <circle cx="60" cy="60" r="34" fill="url(#glyph-sc-sun)" />
      {/* cloud in front */}
      <path
        d="M60 110a18 18 0 0 1 35-5 14 14 0 0 1 26 4 16 16 0 0 1-3 31H66a16 16 0 0 1-6-30z"
        fill="url(#glyph-sc-cloud)"
        stroke="rgba(140,150,180,0.35)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
