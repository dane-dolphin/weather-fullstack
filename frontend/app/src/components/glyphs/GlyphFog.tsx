import styles from './glyphs.module.css';

type Props = {
  size?: number;
};

export function GlyphFog({ size = 200 }: Props) {
  return (
    <svg
      width={size}
      height={(size * 160) / 180}
      viewBox="0 0 180 160"
      className={styles.glyph}
      aria-hidden="true"
    >
      <g fill="rgba(255,255,255,0.85)">
        <rect x="20" y="60" width="140" height="10" rx="5" />
        <rect x="40" y="80" width="120" height="10" rx="5" />
        <rect x="20" y="100" width="140" height="10" rx="5" />
        <rect x="40" y="120" width="100" height="10" rx="5" />
      </g>
    </svg>
  );
}
