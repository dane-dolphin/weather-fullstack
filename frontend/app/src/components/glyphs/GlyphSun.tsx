import styles from './glyphs.module.css';

type Props = {
  size?: number;
};

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function GlyphSun({ size = 200 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={`${styles.glyph} ${styles.bob}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glyph-sun-core" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFF6CF" />
          <stop offset="55%" stopColor="#FFC862" />
          <stop offset="100%" stopColor="#F4732A" />
        </radialGradient>
      </defs>
      <g className={styles.rays} style={{ transformOrigin: '80px 80px' }}>
        {ANGLES.map(a => {
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={80 + Math.cos(rad) * 60}
              y1={80 + Math.sin(rad) * 60}
              x2={80 + Math.cos(rad) * 74}
              y2={80 + Math.sin(rad) * 74}
              stroke="#FFD27A"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx="80" cy="80" r="46" fill="url(#glyph-sun-core)" />
    </svg>
  );
}
