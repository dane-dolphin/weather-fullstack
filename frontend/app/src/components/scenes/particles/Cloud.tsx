import { useState } from 'react';
import styles from './particles.module.css';

type CloudProps = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  drift?: boolean;
  color?: string;
  driftDuration?: number;
  driftDelay?: number;
};

export function Cloud({
  x,
  y,
  size,
  opacity,
  drift = false,
  color = '#fff',
  driftDuration: propDuration,
  driftDelay: propDelay,
}: CloudProps) {
  const [defaults] = useState(() => ({
    randomDuration: 80 + Math.random() * 80,
    randomDelay: -(Math.random() * 160),
  }));

  const duration = propDuration ?? defaults.randomDuration;
  const delay = propDelay ?? defaults.randomDelay;

  // Scale box-shadow knobs relative to a 120px reference width
  const s = size / 120;
  const r = (n: number) => Math.round(n * s);
  const shadow = [
    `${r(40)}px ${r(12)}px 0 ${r(-6)}px ${color}`,
    `${r(-40)}px ${r(14)}px 0 ${r(-8)}px ${color}`,
    `${r(16)}px ${r(-10)}px 0 ${r(-8)}px ${color}`,
    `${r(-22)}px ${r(-6)}px 0 ${r(-10)}px ${color}`,
  ].join(', ');

  const className = `${styles.cloud}${drift ? ` ${styles.drifting}` : ''}`;

  const style = {
    top: `${y}px`,
    left: drift ? '0' : `${x}px`,
    width: `${size}px`,
    height: `${Math.round(size * 0.32)}px`,
    opacity,
    background: color,
    boxShadow: shadow,
    filter: 'drop-shadow(0 8px 20px rgba(60,60,100,0.2))',
    ...(drift && {
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      '--cloud-start-x': `${x}px`,
    }),
  } as React.CSSProperties & { '--cloud-start-x'?: string };

  return <div className={className} style={style} />;
}
