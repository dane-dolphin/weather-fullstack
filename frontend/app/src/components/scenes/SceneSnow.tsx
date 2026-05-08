import { useState } from 'react';
import { Cloud } from './particles/Cloud';
import { SnowField } from './particles/SnowField';
import { StarField } from './particles/StarField';
import styles from './scenes.module.css';

type SceneSnowProps = { isDay: boolean; weatherCode: number };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };

function getSnowConfig(code: number): {
  count: number;
  intensity: 'light' | 'heavy' | undefined;
  freezing: boolean;
} {
  if ([71, 85].includes(code)) return { count: 30, intensity: 'light', freezing: false };
  if (code === 73) return { count: 60, intensity: undefined, freezing: false };
  if (code === 77) return { count: 50, intensity: undefined, freezing: true };
  return { count: 100, intensity: 'heavy', freezing: false }; // 75, 86
}

export function SceneSnow({ isDay, weatherCode }: SceneSnowProps) {
  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 20 + Math.random() * 200,
      size: 90 + Math.random() * 140,
      opacity: 0.65 + Math.random() * 0.2,
    })),
  );

  const { count, intensity, freezing } = getSnowConfig(weatherCode);

  return (
    <div className={styles.scene}>
      {!isDay && <StarField count={10} brightness={0.4} />}
      {clouds.map((c) => (
        <Cloud
          key={c.id}
          x={c.x}
          y={c.y}
          size={c.size}
          opacity={c.opacity}
          drift
          color="#E4ECF8"
        />
      ))}
      <SnowField count={count} intensity={intensity} freezing={freezing} />
    </div>
  );
}
