import { useState } from 'react';
import styles from './particles.module.css';

type SnowFieldProps = {
  count: number;
  intensity?: 'light' | 'heavy';
  freezing?: boolean;
};

type Flake = {
  id: number;
  left: number;
  delay: number;
  dur: number;
  size: number;
  sway: 'a' | 'b';
  op: number;
};

export function SnowField({ count, intensity, freezing = false }: SnowFieldProps) {
  const [flakes] = useState<Flake[]>(() => {
    const light = intensity === 'light';
    const heavy = intensity === 'heavy';
    // freezing → ice pellets: smaller, fall faster
    const grains = freezing;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: -(Math.random() * 8),
      dur: grains
        ? 4 + Math.random() * 3
        : light
          ? 8 + Math.random() * 4
          : heavy
            ? 5 + Math.random() * 4
            : 6 + Math.random() * 6,
      size: grains
        ? 2 + Math.random() * 2
        : light
          ? 3 + Math.random() * 3
          : heavy
            ? 5 + Math.random() * 5
            : 4 + Math.random() * 4,
      sway: (Math.random() < 0.5 ? 'a' : 'b') as 'a' | 'b',
      op: 0.6 + Math.random() * 0.4,
    }));
  });

  return (
    <div className={styles.snowField}>
      {flakes.map((f) => (
        <span
          key={f.id}
          className={f.sway === 'a' ? styles.flakeA : styles.flakeB}
          style={{
            left: `${f.left}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDuration: `${f.dur}s`,
            animationDelay: `${f.delay}s`,
            opacity: f.op,
          }}
        />
      ))}
    </div>
  );
}
