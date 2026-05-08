import { useState } from 'react';
import styles from './particles.module.css';

type RainFieldProps = {
  count: number;
  intensity?: 'light' | 'heavy';
  freezing?: boolean;
};

type Drop = {
  id: number;
  left: number;
  delay: number;
  dur: number;
  h: number;
  op: number;
};

export function RainField({ count, intensity, freezing = false }: RainFieldProps) {
  const [drops] = useState<Drop[]>(() => {
    const light = intensity === 'light';
    const heavy = intensity === 'heavy';
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: -(Math.random() * 1.2),
      dur: light
        ? 1.0 + Math.random() * 0.4
        : heavy
          ? 0.5 + Math.random() * 0.2
          : 0.5 + Math.random() * 0.4,
      h: light
        ? 8 + Math.random() * 4
        : heavy
          ? 16 + Math.random() * 8
          : 10 + Math.random() * 6,
      op: 0.4 + Math.random() * 0.5,
    }));
  });

  const className = [
    styles.rainField,
    freezing ? styles.rainFieldFreezing : '',
    intensity === 'light' ? styles.rainFieldLight : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      {drops.map((d) => (
        <span
          key={d.id}
          style={{
            left: `${d.left}%`,
            height: `${d.h}px`,
            animationDuration: `${d.dur}s`,
            animationDelay: `${d.delay}s`,
            opacity: d.op,
          }}
        />
      ))}
    </div>
  );
}
