import styles from './glyphs.module.css';

type Props = {
  size?: number;
  heavy?: boolean;
  freezing?: boolean;
};

export function GlyphRain({ size = 200, heavy = false, freezing = false }: Props) {
  const strokeColor = freezing ? '#9DD4FF' : '#5DA5E8';
  const strokeWidth = heavy ? 5 : 4;
  return (
    <svg
      width={size}
      height={(size * 170) / 180}
      viewBox="0 0 180 170"
      className={styles.glyph}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="glyph-rain-cloud" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2EAF6" />
          <stop offset="100%" stopColor="#7B89AA" />
        </linearGradient>
      </defs>
      <path
        d="M40 80a22 22 0 0 1 42-7 18 18 0 0 1 32 5 20 20 0 0 1-3 38H46a20 20 0 0 1-6-36z"
        fill="url(#glyph-rain-cloud)"
      />
      <g stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round">
        <line x1="60" y1="125" x2="55" y2="148" className={styles.drop} />
        <line x1="85" y1="128" x2="80" y2="155" className={styles.drop} style={{ animationDelay: '.2s' }} />
        <line x1="110" y1="125" x2="105" y2="148" className={styles.drop} style={{ animationDelay: '.4s' }} />
        <line x1="135" y1="128" x2="130" y2="155" className={styles.drop} style={{ animationDelay: '.1s' }} />
      </g>
    </svg>
  );
}
