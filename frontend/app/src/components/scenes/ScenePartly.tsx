import { useState } from 'react';
import { GlyphSun } from '@/components/glyphs/GlyphSun';
import { GlyphMoon } from '@/components/glyphs/GlyphMoon';
import { Cloud } from './particles/Cloud';
import { StarField } from './particles/StarField';
import styles from './scenes.module.css';

type ScenePartlyProps = { isDay: boolean };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };

export function ScenePartly({ isDay }: ScenePartlyProps) {
  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 30 + Math.random() * 220,
      size: 80 + Math.random() * 140,
      opacity: 0.65 + Math.random() * 0.2,
    })),
  );

  return (
    <div className={styles.scene}>
      <div className={styles.celestialSmall}>
        {isDay ? <GlyphSun size={160} /> : <GlyphMoon size={160} />}
      </div>
      {!isDay && <StarField count={30} brightness={0.7} />}
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
