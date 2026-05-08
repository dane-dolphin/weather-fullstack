import type { BannerAlert } from '@/domain/types';
import styles from './AlertBanner.module.css';

type Props = {
  alert: BannerAlert;
};

export function AlertBanner({ alert }: Props) {
  return (
    <section className={styles.banner} data-alert={alert.kind}>
      <div className={styles.stripe} aria-hidden="true">
        <div className={styles.stripeAnim} />
      </div>
      <div className={styles.iconWrap}>
        <AlertGlyph kind={alert.kind} />
      </div>
      <div className={styles.body}>
        <div className={styles.head}>
          <span className={styles.tag}>{alert.tag}</span>
          <span className={styles.title}>{alert.title}</span>
        </div>
        <div className={styles.msg}>{alert.message}</div>
      </div>
      <div className={styles.metaCol}>
        {alert.meta && <div className={styles.time}>{alert.meta}</div>}
        <div className={styles.source}>{alert.source}</div>
      </div>
    </section>
  );
}

type GlyphProps = { kind: BannerAlert['kind'] };

function AlertGlyph({ kind }: GlyphProps) {
  if (kind === 'tornado') {
    return (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <path
          d="M6 10h36M8 16h32M10 22h26M14 28h18M18 34h12M22 40h6"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === 'flood') {
    return (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 30c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" />
        <path d="M4 38c4 0 4 4 8 4s4-4 8-4 4 4 8 4 4-4 8-4 4 4 8 4" />
        <path d="M14 22V8h6l8 8h6v8" />
      </svg>
    );
  }
  if (kind === 'winter') {
    return (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <line x1="24" y1="6" x2="24" y2="42" />
        <line x1="6" y1="24" x2="42" y2="24" />
        <line x1="11" y1="11" x2="37" y2="37" />
        <line x1="11" y1="37" x2="37" y2="11" />
        <polyline points="20,10 24,6 28,10" />
        <polyline points="20,38 24,42 28,38" />
      </svg>
    );
  }
  if (kind === 'earthquake') {
    return (
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="4,24 10,24 14,12 18,36 22,18 26,30 30,24 36,24 40,16 44,24" />
      </svg>
    );
  }
  /* tornado, severe, heat, warning — all use the warning triangle */
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M24 6 L42 38 L6 38 Z" />
      <line x1="24" y1="18" x2="24" y2="28" />
      <circle cx="24" cy="33" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
