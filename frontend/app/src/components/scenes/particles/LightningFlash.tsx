import styles from './particles.module.css';

export function LightningFlash() {
  return (
    <>
      <div className={styles.lightningFlash} />
      <div className={`${styles.lightningFlash} ${styles.lightningFlash2}`} />
    </>
  );
}
