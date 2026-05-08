import styles from './glyphs.module.css';

type Props = {
  size?: number;
  heavy?: boolean;
};

export function GlyphSnow({ size = 200, heavy = false }: Props) {
  const r1 = heavy ? 5 : 4;
  const r2 = heavy ? 4 : 3;
  return (
    <svg
      width={size}
      height={(size * 170) / 180}
      viewBox="0 0 180 170"
      className={styles.glyph}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glyph-snow-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7FBFF" />
          <stop offset="100%" stopColor="#A8B6CF" />
        </linearGradient>
      </defs>
      <path
        d="M40 80a22 22 0 0 1 42-7 18 18 0 0 1 32 5 20 20 0 0 1-3 38H46a20 20 0 0 1-6-36z"
        fill="url(#glyph-snow-cloud)"
      />
      <g fill="#FFFFFF">
        <circle cx="62" cy="138" r={r1} className={styles.flake} />
        <circle cx="90" cy="148" r={r1} className={styles.flake} style={{ animationDelay: '.3s' }} />
        <circle cx="118" cy="138" r={r1} className={styles.flake} style={{ animationDelay: '.6s' }} />
        <circle cx="78" cy="158" r={r2} className={styles.flake} style={{ animationDelay: '.9s' }} />
        <circle cx="106" cy="158" r={r2} className={styles.flake} style={{ animationDelay: '.45s' }} />
      </g>
    </svg>
  );
}
