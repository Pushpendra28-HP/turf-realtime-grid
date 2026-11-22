import { now } from '../lib/clock';
import { useTick } from '../hooks/useCooldown';

export default function HoverInfo({ hover, tile, meId }) {
  const lockLeft = tile && !tile.pending ? tile.lockedUntil - now() : 0;
  useTick(lockLeft > 0);

  if (!hover) return null;

  const mine = tile?.ownerId === meId;
  const locked = lockLeft > 0;

  return (
    <div className="pointer-events-none flex items-center gap-2.5 rounded-xl border border-line bg-surface/90 px-3 py-2 text-xs shadow-lg backdrop-blur">
      <span className="font-mono text-muted">
        {hover.x},{hover.y}
      </span>
      {tile ? (
        <>
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: tile.ownerColor }} />
          <span className="max-w-32 truncate font-medium">{mine ? 'You' : tile.ownerName}</span>
          {locked && (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-200">
              locked {(Math.max(lockLeft, 0) / 1000).toFixed(0)}s
            </span>
          )}
        </>
      ) : (
        <span className="text-muted">Unclaimed</span>
      )}
    </div>
  );
}
