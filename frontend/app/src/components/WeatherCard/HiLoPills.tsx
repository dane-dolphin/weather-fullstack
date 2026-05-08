import { ArrowUp } from './icons/ArrowUp';
import { ArrowDown } from './icons/ArrowDown';
import styles from './HiLoPills.module.css';

type Props = { hi: number; lo: number };

export function HiLoPills({ hi, lo }: Props) {
  return (
    <div className={styles.container}>
      <span className={`${styles.pill} ${styles.hi}`}>
        <ArrowUp size={12} />
        <span className={styles.label}>H {Math.round(hi)}°</span>
      </span>
      <span className={`${styles.pill} ${styles.lo}`}>
        <ArrowDown size={12} />
        <span className={styles.label}>L {Math.round(lo)}°</span>
      </span>
    </div>
  );
}
