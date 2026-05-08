import type { Category } from '@/domain/types';

type Props = {
  category: Category;
  isDay: boolean;
  size?: number;
};

const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function HourGlyph({ category, isDay, size = 30 }: Props) {
  switch (category) {
    case 'clear':
      return isDay ? (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="16" cy="16" r="6.5" fill="#FFC868" />
          <g stroke="#FFC868" strokeWidth="1.8" strokeLinecap="round">
            {ANGLES.map(a => {
              const r = (a * Math.PI) / 180;
              return (
                <line
                  key={a}
                  x1={16 + Math.cos(r) * 9.5}
                  y1={16 + Math.sin(r) * 9.5}
                  x2={16 + Math.cos(r) * 12.5}
                  y2={16 + Math.sin(r) * 12.5}
                />
              );
            })}
          </g>
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path d="M22 20a8 8 0 1 1-9-12 7 7 0 0 0 9 12Z" fill="#D6CDF4" />
        </svg>
      );

    case 'partly':
      return isDay ? (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="11" cy="11" r="5" fill="#FFC868" />
          <path
            d="M22 22a4 4 0 0 0-7.9-1A3 3 0 0 0 14 27h9a3 3 0 0 0 .3-5.97"
            fill="#E7EDF7"
            stroke="#9BA8C0"
            strokeWidth="1"
          />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <circle cx="11" cy="11" r="5" fill="#D6CDF4" />
          <path
            d="M22 22a4 4 0 0 0-7.9-1A3 3 0 0 0 14 27h9a3 3 0 0 0 .3-5.97"
            fill="#8E97B8"
          />
        </svg>
      );

    case 'overcast':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M22 16a5 5 0 0 0-9.9-1A4 4 0 0 0 12 23h11a4 4 0 0 0 .3-7.97"
            fill="#B8C8E5"
          />
        </svg>
      );

    case 'fog':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <g fill="#C9D2E5">
            <rect x="6" y="11" width="20" height="2" rx="1" />
            <rect x="9" y="15" width="17" height="2" rx="1" />
            <rect x="6" y="19" width="20" height="2" rx="1" />
            <rect x="9" y="23" width="14" height="2" rx="1" />
          </g>
        </svg>
      );

    case 'rain':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M22 14a5 5 0 0 0-9.9-1A4 4 0 0 0 12 21h11a4 4 0 0 0 .3-7.97"
            fill="#9DB1D6"
          />
          <g stroke="#5DA5E8" strokeWidth="1.6" strokeLinecap="round">
            <line x1="13" y1="23" x2="11" y2="28" />
            <line x1="18" y1="23" x2="16" y2="28" />
            <line x1="23" y1="23" x2="21" y2="28" />
          </g>
        </svg>
      );

    case 'snow':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M22 14a5 5 0 0 0-9.9-1A4 4 0 0 0 12 21h11a4 4 0 0 0 .3-7.97"
            fill="#C9D6EA"
          />
          <g fill="#fff">
            <circle cx="13" cy="25" r="1.6" />
            <circle cx="19" cy="27" r="1.6" />
            <circle cx="24" cy="25" r="1.4" />
          </g>
        </svg>
      );

    case 'thunder':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M22 14a5 5 0 0 0-9.9-1A4 4 0 0 0 12 21h11a4 4 0 0 0 .3-7.97"
            fill="#7C8AA8"
          />
          <path d="M17 19l-4 6h3l-2 5 6-7h-3l2-4z" fill="#FFD64A" />
        </svg>
      );
  }
}
