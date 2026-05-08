import { useState } from 'react';
import styles from './particles.module.css';

type StarFieldProps = {
  count: number;
  brightness: number;
  shootingStars?: boolean;
};

type Star = {
  id: number;
  top: number;
  left: number;
  size: number;
  delay: number;
  opacity: number;
};

export function StarField({ count, brightness, shootingStars = false }: StarFieldProps) {
  const [stars] = useState<Star[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      top: Math.random() * 70,
      left: Math.random() * 100,
      size: Math.random() < 0.85 ? 1 : 2,
      delay: -(Math.random() * 4),
      opacity: Math.min(1, (0.4 + Math.random() * 0.6) * brightness),
    })),
  );

  return (
    <div className={styles.starField}>
      {stars.map((s) => (
        <span
          key={s.id}
          className={styles.star}
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            opacity: s.opacity,
          }}
        />
      ))}
      {shootingStars && (
        <div className={styles.shootContainer}>
          <div className={styles.shootTrail} />
        </div>
      )}
    </div>
  );
}
