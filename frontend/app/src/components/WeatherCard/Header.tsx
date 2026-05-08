import { formatDate } from '@/domain/format';
import { Pin } from './icons/Pin';
import styles from './Header.module.css';

type Props = {
  location: string | null;
  time: Date | string;
  condition: { label: string; dotColor?: string };
};

export function Header({ location, time, condition }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {location !== null && (
          <div className={styles.loc}>
            <Pin size={18} color="var(--loc-icon-color)" />
            <span className={styles.locName}>{location}</span>
          </div>
        )}
        <div className={styles.date}>{formatDate(time)}</div>
      </div>
      <div className={styles.pill}>
        <span
          className={styles.dot}
          style={condition.dotColor ? { background: condition.dotColor } : undefined}
        />
        {condition.label}
      </div>
    </header>
  );
}
