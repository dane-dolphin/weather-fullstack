import { useState } from 'react';
import particleStyles from './particles/particles.module.css';
import { Cloud } from './particles/Cloud';
import { RainField } from './particles/RainField';
import { LightningFlash } from './particles/LightningFlash';
import styles from './scenes.module.css';

type SceneThunderProps = { isDay: boolean; weatherCode: number };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };
type HailData = { id: number; left: number; delay: number; dur: number; size: number };

function HailField({ count }: { count: number }) {
  const [stones] = useState<HailData[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: -(Math.random() * 1),
      dur: 0.7 + Math.random() * 0.5,
      size: 4 + Math.random() * 4,
    })),
  );

  return (
    <div className={particleStyles.hailField}>
      {stones.map((s) => (
        <span
          key={s.id}
          className={particleStyles.hailStone}
          style={{
            left: `${s.left}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function SceneThunder({ isDay: _isDay, weatherCode }: SceneThunderProps) {
  const hasHail = [96, 99].includes(weatherCode);
  const rainCount = hasHail ? 50 : 90;

  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 20 + Math.random() * 220,
      size: 100 + Math.random() * 160,
      opacity: 0.8 + Math.random() * 0.15,
    })),
  );

  return (
    <div className={styles.scene}>
      {clouds.map((c) => (
        <Cloud
          key={c.id}
          x={c.x}
          y={c.y}
          size={c.size}
          opacity={c.opacity}
          drift
          color="#3a3f55"
        />
      ))}
      <RainField count={rainCount} intensity="heavy" />
      {hasHail && <HailField count={30} />}
      <LightningFlash />
    </div>
  );
}
