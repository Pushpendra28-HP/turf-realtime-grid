export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="3" y="3" width="12" height="12" rx="3.5" fill="#6366f1" />
      <rect x="17" y="3" width="12" height="12" rx="3.5" fill="#ec4899" />
      <rect x="3" y="17" width="12" height="12" rx="3.5" fill="#14b8a6" />
      <rect x="17" y="17" width="12" height="12" rx="3.5" fill="#f59e0b" />
    </svg>
  );
}
