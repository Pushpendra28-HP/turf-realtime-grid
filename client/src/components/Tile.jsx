import { memo } from 'react';
import { now } from '../lib/clock';

const FRESH_MS = 900;

function TileView({ x, y, tile, mine }) {
  const t = now();
  const owned = Boolean(tile);
  const pending = owned && tile.pending;
  const fresh = owned && !pending && t - tile.capturedAt < FRESH_MS;
  const lockLeft = owned && !pending ? tile.lockedUntil - t : 0;

  return (
    <div data-x={x} data-y={y} className={`tile${mine ? ' tile-mine' : ''}`}>
      {owned && (
        <span
          // keyed by owner so a new owner replays the pop, while pending -> confirmed keeps the element
          key={tile.ownerId}
          className={`tile-fill${pending ? ' is-pending' : fresh ? ' is-pop' : ''}`}
          style={{ backgroundColor: tile.ownerColor }}
        />
      )}
      {fresh && <span key={`r${tile.capturedAt}`} className="tile-ripple" style={{ color: tile.ownerColor }} />}
      {lockLeft > 0 && (
        <span key={`l${tile.capturedAt}`} className="tile-lock" style={{ animationDuration: `${lockLeft}ms` }} />
      )}
    </div>
  );
}

// a tile only re-renders when its own data (or whether it is mine) changes
export const Tile = memo(TileView, (a, b) => a.tile === b.tile && a.mine === b.mine);
