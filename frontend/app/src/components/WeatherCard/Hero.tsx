import type { ReactNode } from 'react';
import { HiLoPills } from './HiLoPills';
import styles from './Hero.module.css';

type Props = {
  glyph: ReactNode;
  temperature: number;
  feelsLike: number;
  hi: number;
  lo: number;
};

export function Hero({ glyph, temperature, feelsLike, hi, lo }: Props) {
  return (
    <section className={styles.hero}>
      <div className={styles.icon}>{glyph}</div>
      <div className={styles.textBlock}>
        <div className={styles.temp}>
          <span className={styles.tempNum}>{Math.round(temperature)}</span>
          <sup className={styles.tempDeg}>°</sup>
        </div>
        <div className={styles.feels}>
          Feels like <strong>{Math.round(feelsLike)}°</strong>
        </div>
        <HiLoPills hi={hi} lo={lo} />
      </div>
    </section>
  );
}
