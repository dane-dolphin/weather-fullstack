import type { Category } from '@/domain/types';
import { SceneClear } from './SceneClear';
import { ScenePartly } from './ScenePartly';
import { SceneOvercast } from './SceneOvercast';
import { SceneFog } from './SceneFog';
import { SceneRain } from './SceneRain';
import { SceneSnow } from './SceneSnow';
import { SceneThunder } from './SceneThunder';

type WeatherSceneProps = {
  category: Category;
  isDay: boolean;
  weatherCode: number;
};

export function WeatherScene({ category, isDay, weatherCode }: WeatherSceneProps) {
  switch (category) {
    case 'clear':
      return <SceneClear isDay={isDay} />;
    case 'partly':
      return <ScenePartly isDay={isDay} />;
    case 'overcast':
      return <SceneOvercast isDay={isDay} />;
    case 'fog':
      return <SceneFog isDay={isDay} />;
    case 'rain':
      return <SceneRain isDay={isDay} weatherCode={weatherCode} />;
    case 'snow':
      return <SceneSnow isDay={isDay} weatherCode={weatherCode} />;
    case 'thunder':
      return <SceneThunder isDay={isDay} weatherCode={weatherCode} />;
  }
}
