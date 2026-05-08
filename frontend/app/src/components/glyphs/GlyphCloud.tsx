import styles from './glyphs.module.css';

type Props = {
  size?: number;
  big?: boolean;
};

export function GlyphCloud({ size = 200, big = false }: Props) {
  const vw = big ? 180 : 160;
  return (
    <svg
      width={size}
      height={(size * 160) / vw}
      viewBox={`0 0 ${vw} 160`}
      className={`${styles.glyph} ${styles.bob}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glyph-cloud-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#B7C2D6" />
        </linearGradient>
      </defs>
      <path
        d="M40 110a22 22 0 0 1 42-7 18 18 0 0 1 32 5 20 20 0 0 1-3 38H46a20 20 0 0 1-6-36z"
        fill="url(#glyph-cloud-fill)"
        stroke="rgba(120,130,160,0.35)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
