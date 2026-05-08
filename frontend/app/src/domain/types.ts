export type Category =
  | 'clear'
  | 'partly'
  | 'overcast'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'thunder';

export type BannerAlert = {
  kind: 'tornado' | 'severe' | 'flood' | 'winter' | 'heat' | 'warning' | 'earthquake';
  tag: string;
  title: string;
  message: string;
  meta?: string;
  source: string;
};

export type HourlyViewModel = {
  time: string;
  temp: number;
  weatherCode: number;
  isDay: boolean;
};

export type ViewModel = {
  isDay: boolean;
  category: Category;
  location: string | null;
  time: string;
  condition: {
    label: string;
  };
  hero: {
    temperature: number;
    feelsLike: number;
    hi: number;
    lo: number;
  };
  stats: {
    windSpeed: number;
    windDirection: number;
    humidity: number;
    pressure: number | null;
  };
  hourly: HourlyViewModel[];
  alert: BannerAlert | null;
};
