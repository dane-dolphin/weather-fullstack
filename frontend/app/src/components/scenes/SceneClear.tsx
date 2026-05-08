import { useState } from 'react';
import { GlyphSun } from '@/components/glyphs/GlyphSun';
import { GlyphMoon } from '@/components/glyphs/GlyphMoon';
import { Cloud } from './particles/Cloud';
import { StarField } from './particles/StarField';
import styles from './scenes.module.css';

type SceneClearProps = { isDay: boolean };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };

export function SceneClear({ isDay }: SceneClearProps) {
  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 30 + Math.random() * 220,
      size: 80 + Math.random() * 100,
      opacity: 0.5 + Math.random() * 0.2,
    })),
  );

  return (
    <div className={styles.scene}>
      <div className={styles.celestial}>
        {isDay ? <GlyphSun size={220} /> : <GlyphMoon size={220} />}
      </div>
      {!isDay && <StarField count={60} brightness={1} shootingStars />}
      {clouds.map((c) => (
        <Cloud
          key={c.id}
          x={c.x}
          y={c.y}
          size={c.size}
          opacity={c.opacity}
          drift
          color={isDay ? '#fff' : 'rgba(180,190,220,0.8)'}
        />
      ))}
    </div>
  );
}
