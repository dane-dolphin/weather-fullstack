import styles from './glyphs.module.css';

type Props = {
  size?: number;
};

export function GlyphMoon({ size = 200 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      className={`${styles.glyph} ${styles.bob}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="glyph-moon-core" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFFCEB" />
          <stop offset="60%" stopColor="#E8E4FF" />
          <stop offset="100%" stopColor="#9CA8E8" />
        </radialGradient>
      </defs>
      {/* outer glow halo */}
      <circle cx="80" cy="80" r="56" fill="rgba(255,240,210,0.18)" />
      {/* moon body */}
      <circle cx="80" cy="80" r="46" fill="url(#glyph-moon-core)" />
      {/* craters */}
      <circle cx="98" cy="68" r="6" fill="rgba(120,130,180,0.35)" />
      <circle cx="68" cy="92" r="4" fill="rgba(120,130,180,0.30)" />
      <circle cx="92" cy="98" r="3" fill="rgba(120,130,180,0.30)" />
    </svg>
  );
}
