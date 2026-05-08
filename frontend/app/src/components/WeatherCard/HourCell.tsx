import { categorize } from '@/domain/weatherCode';
import { formatHourLabel } from '@/domain/format';
import { HourGlyph } from '@/components/glyphs/HourGlyph';
import styles from './HourCell.module.css';

type Props = {
  time: string;
  temp: number;
  weatherCode: number;
  isDay: boolean;
  isNow: boolean;
};

export function HourCell({ time, temp, weatherCode, isDay, isNow }: Props) {
  const label = isNow ? 'Now' : formatHourLabel(time);
  const category = categorize(weatherCode);
  return (
    <div className={styles.cell} data-now={isNow ? 'true' : undefined}>
      <div className={styles.label}>{label}</div>
      <HourGlyph category={category} isDay={isDay} />
      <div className={styles.temp}>{Math.round(temp)}°</div>
    </div>
  );
}
