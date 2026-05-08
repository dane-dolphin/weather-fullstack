import { Wind } from './icons/Wind';
import { Droplet } from './icons/Droplet';
import { Gauge } from './icons/Gauge';
import styles from './StatCard.module.css';

type WindProps = {
  kind: 'wind';
  value: number;
  compass: string;
};

type HumidityProps = {
  kind: 'humidity';
  value: number;
};

type PressureProps = {
  kind: 'pressure';
  value: number | null;
};

type Props = WindProps | HumidityProps | PressureProps;

export function StatCard(props: Props) {
  const { kind } = props;
  const cardClass = `${styles.card} ${styles[kind]}`;

  if (kind === 'wind') {
    const { value, compass } = props;
    return (
      <div className={cardClass}>
        <div className={styles.top}>
          <span className={styles.icon}><Wind size={14} /></span>
          <span className={styles.label}>Wind</span>
        </div>
        <div className={styles.val}>
          <span className={styles.num}>{Math.round(value)}</span>
          <span className={styles.unit}>mph</span>
        </div>
        <div className={styles.meta}>From {compass}</div>
      </div>
    );
  }

  if (kind === 'humidity') {
    const { value } = props;
    return (
      <div className={cardClass}>
        <div className={styles.top}>
          <span className={styles.icon}><Droplet size={14} /></span>
          <span className={styles.label}>Humidity</span>
        </div>
        <div className={styles.val}>
          <span className={styles.num}>{Math.round(value)}</span>
          <span className={styles.unit}>%</span>
        </div>
        <div className={styles.meta}>&nbsp;</div>
      </div>
    );
  }

  const { value: pressureValue } = props;
  return (
    <div className={cardClass}>
      <div className={styles.top}>
        <span className={styles.icon}><Gauge size={14} /></span>
        <span className={styles.label}>Pressure</span>
      </div>
      <div className={styles.val}>
        <span className={styles.num}>{pressureValue != null ? Math.round(pressureValue) : '—'}</span>
        <span className={styles.unit}>hPa</span>
      </div>
      <div className={styles.meta}>&nbsp;</div>
    </div>
  );
}
