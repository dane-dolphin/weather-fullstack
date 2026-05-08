import { GlyphSun } from './glyphs/GlyphSun';
import { GlyphMoon } from './glyphs/GlyphMoon';
import styles from './LoadingGlyph.module.css';

export function LoadingGlyph() {
  return (
    <div className={styles.container}>
      <div className={styles.orbiter}>
        <GlyphSun size={80} />
      </div>
      <div className={`${styles.orbiter} ${styles.moon}`}>
        <GlyphMoon size={80} />
      </div>
    </div>
  );
}
