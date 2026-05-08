import styles from './glyphs.module.css';

type Props = {
  size?: number;
  hail?: boolean;
};

export function GlyphThunder({ size = 200, hail = false }: Props) {
  return (
    <svg
      width={size}
      height={(size * 170) / 180}
      viewBox="0 0 180 170"
      className={styles.glyph}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glyph-thunder-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9AA5BD" />
          <stop offset="100%" stopColor="#525C73" />
        </linearGradient>
      </defs>
      <path
        d="M40 80a22 22 0 0 1 42-7 18 18 0 0 1 32 5 20 20 0 0 1-3 38H46a20 20 0 0 1-6-36z"
        fill="url(#glyph-thunder-cloud)"
      />
      <path
        d="M95 110 L70 145 L88 145 L78 168 L112 130 L94 130 L102 110 Z"
        fill="#FFD64A"
        stroke="#F2A91E"
        strokeWidth="2"
        className={styles.bolt}
      />
      {hail && (
        <g fill="rgba(220,235,255,0.95)" stroke="rgba(120,140,170,0.5)" strokeWidth="1">
          <circle cx="58" cy="145" r="4" />
          <circle cx="128" cy="148" r="4" />
          <circle cx="68" cy="160" r="3" />
        </g>
      )}
    </svg>
  );
}
