import styles from './scenes.module.css';

type SceneFogProps = { isDay: boolean };

// gradient adapts via --scene-gradient token; fog layers are theme-agnostic
export function SceneFog(_props: SceneFogProps) {
  return (
    <div className={styles.scene}>
      <div className={`${styles.fogLayer} ${styles.fogLayer1}`} />
      <div className={`${styles.fogLayer} ${styles.fogLayer2}`} />
      <div className={`${styles.fogLayer} ${styles.fogLayer3}`} />
    </div>
  );
}
