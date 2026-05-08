type Props = { size?: number; color?: string };

export function Wind({ size = 16, color = 'currentColor' }: Props) {
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
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 13h16a3 3 0 1 1-3 3" />
      <path d="M3 18h8" />
    </svg>
  );
}
