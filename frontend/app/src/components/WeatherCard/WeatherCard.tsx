import type { ViewModel } from '@/domain/types';
import { compass } from '@/domain/windDir';
import { HeroGlyph } from '@/components/glyphs/HeroGlyph';
import { AlertBanner } from './AlertBanner';
import { Header } from './Header';
import { Hero } from './Hero';
import { HourlyForecast } from './HourlyForecast';
import { StatCard } from './StatCard';
import styles from './WeatherCard.module.css';

type Props = {
  data: ViewModel;
};

export function WeatherCard({ data }: Props) {
  const windCompass = compass(data.stats.windDirection);

  return (
    <div className={styles.card}>
      <Header
        location={data.location}
        time={data.time}
        condition={data.condition}
      />
      <main className={styles.main}>
        <Hero
          glyph={<HeroGlyph category={data.category} isDay={data.isDay} />}
          temperature={data.hero.temperature}
          feelsLike={data.hero.feelsLike}
          hi={data.hero.hi}
          lo={data.hero.lo}
        />
        <div className={styles.stats}>
          <StatCard kind="wind" value={data.stats.windSpeed} compass={windCompass} />
          <StatCard kind="humidity" value={data.stats.humidity} />
          <StatCard kind="pressure" value={data.stats.pressure} />
        </div>
        <div className={styles.bottom}>
          {data.alert !== null ? (
            <AlertBanner alert={data.alert} />
          ) : (
            <HourlyForecast entries={data.hourly} />
          )}
        </div>
      </main>
    </div>
  );
}
