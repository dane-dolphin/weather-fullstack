import { useState } from 'react';
import { Cloud } from './particles/Cloud';
import { RainField } from './particles/RainField';
import { StarField } from './particles/StarField';
import styles from './scenes.module.css';

type SceneRainProps = { isDay: boolean; weatherCode: number };

type CloudData = { id: number; x: number; y: number; size: number; opacity: number };

function getRainConfig(code: number): {
  count: number;
  intensity: 'light' | 'heavy' | undefined;
  freezing: boolean;
} {
  if ([51, 53, 55].includes(code)) return { count: 30, intensity: 'light', freezing: false };
  if ([61, 80].includes(code)) return { count: 40, intensity: undefined, freezing: false };
  if ([63, 81].includes(code)) return { count: 70, intensity: undefined, freezing: false };
  return { count: 110, intensity: 'heavy', freezing: false }; // 65, 82
}

export function SceneRain({ isDay, weatherCode }: SceneRainProps) {
  const isDrizzle = [51, 53, 55].includes(weatherCode);
  const cloudCount = isDrizzle ? 4 : 6;
  const cloudColor = isDrizzle ? '#fff' : isDay ? '#6a7490' : '#5a6580';

  const [clouds] = useState<CloudData[]>(() =>
    Array.from({ length: cloudCount }, (_, i) => ({
      id: i,
      x: -(200 + Math.random() * 400),
      y: 20 + Math.random() * 200,
      size: 90 + Math.random() * 150,
      opacity: 0.7 + Math.random() * 0.2,
    })),
  );

  const { count, intensity, freezing } = getRainConfig(weatherCode);

  return (
    <div className={styles.scene}>
      {!isDay && <StarField count={6} brightness={0.4} />}
      {clouds.map((c) => (
        <Cloud
          key={c.id}
          x={c.x}
          y={c.y}
          size={c.size}
          opacity={c.opacity}
          drift
          color={cloudColor}
        />
      ))}
      <RainField count={count} intensity={intensity} freezing={freezing} />
    </div>
  );
}
