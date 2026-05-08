import type { Category } from '@/domain/types';
import { GlyphSun } from './GlyphSun';
import { GlyphMoon } from './GlyphMoon';
import { GlyphSunCloud } from './GlyphSunCloud';
import { GlyphMoonCloud } from './GlyphMoonCloud';
import { GlyphCloud } from './GlyphCloud';
import { GlyphFog } from './GlyphFog';
import { GlyphRain } from './GlyphRain';
import { GlyphSnow } from './GlyphSnow';
import { GlyphThunder } from './GlyphThunder';

type Props = {
  category: Category;
  isDay: boolean;
  size?: number;
};

export function HeroGlyph({ category, isDay, size = 200 }: Props) {
  switch (category) {
    case 'clear':
      return isDay ? <GlyphSun size={size} /> : <GlyphMoon size={size} />;
    case 'partly':
      return isDay ? <GlyphSunCloud size={size} /> : <GlyphMoonCloud size={size} />;
    case 'overcast':
      return <GlyphCloud size={size} big />;
    case 'fog':
      return <GlyphFog size={size} />;
    case 'rain':
      return <GlyphRain size={size} />;
    case 'snow':
      return <GlyphSnow size={size} />;
    case 'thunder':
      return <GlyphThunder size={size} />;
  }
}
