import { useEffect } from 'react';
import { WeatherScene } from '@/components/scenes/WeatherScene';
import { SceneClear } from '@/components/scenes/SceneClear';
import { WeatherCard } from '@/components/WeatherCard/WeatherCard';
import { getFixture } from './fixtures';
import styles from './PreviewRoutes.module.css';

type Props = {
  preview: string;
};

export function PreviewApp({ preview }: Props) {
  const viewModel = getFixture(preview);

  useEffect(() => {
    document.documentElement.dataset.theme = (viewModel?.isDay ?? true) ? 'day' : 'night';
  }, [viewModel?.isDay]);

  if (viewModel === null) {
    return (
      <div className={styles.root}>
        <SceneClear isDay />
        <div className={styles.notFound}>
          Unknown preview key: <strong>{preview}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <WeatherScene
        category={viewModel.category}
        isDay={viewModel.isDay}
        weatherCode={viewModel.hourly[0]?.weatherCode ?? 0}
      />
      <WeatherCard data={viewModel} />
    </div>
  );
}
