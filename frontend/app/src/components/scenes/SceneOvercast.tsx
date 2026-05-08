import { useState } from 'react';
import { Cloud } from './particles/Cloud';
import { StarField } from './particles/StarField';
import styles from './scenes.module.css';

type SceneOvercastProps = { isDay: boolean };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };

export function SceneOvercast({ isDay }: SceneOvercastProps) {
  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 20 + Math.random() * 240,
      size: 100 + Math.random() * 160,
      opacity: 0.75 + Math.random() * 0.15,
    })),
  );

  return (
    <div className={styles.scene}>
      {!isDay && <StarField count={12} brightness={0.5} />}
      <div className={styles.overcastHaze} />
      {clouds.map((c) => (
        <Cloud
          key={c.id}
          x={c.x}
          y={c.y}
          size={c.size}
          opacity={c.opacity}
          drift
          color={isDay ? '#D0D8E8' : '#5a6580'}
        />
      ))}
    </div>
  );
}
