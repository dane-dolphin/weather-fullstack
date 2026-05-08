import type { Category } from './types';

const CODE_MAP: Record<number, Category> = {
  0: 'clear',
  1: 'clear',
  2: 'partly',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'rain',
  53: 'rain',
  55: 'rain',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'rain',
  81: 'rain',
  82: 'rain',
  85: 'snow',
  86: 'snow',
  95: 'thunder',
  96: 'thunder',
  99: 'thunder',
};

export function categorize(code: number): Category {
  return CODE_MAP[code] ?? 'clear';
}
