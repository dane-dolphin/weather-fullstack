type Props = { size?: number; color?: string };

export function Gauge({ size = 16, color = 'currentColor' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 14l4-4" />
      <path d="M3.5 14a8.5 8.5 0 0 1 17 0" />
      <circle cx="12" cy="14" r="1.4" fill={color} />
    </svg>
  );
}
