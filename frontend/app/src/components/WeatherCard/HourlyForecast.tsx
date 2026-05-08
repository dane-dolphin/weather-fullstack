import type { HourlyViewModel } from '@/domain/types';
import { HourCell } from './HourCell';
import styles from './HourlyForecast.module.css';

type Props = {
  entries: HourlyViewModel[];
};

export function HourlyForecast({ entries }: Props) {
  return (
    <section className={styles.strip}>
      {entries.map((entry, i) => (
        <HourCell
          key={entry.time}
          time={entry.time}
          temp={entry.temp}
          weatherCode={entry.weatherCode}
          isDay={entry.isDay}
          isNow={i === 0}
        />
      ))}
    </section>
  );
}
