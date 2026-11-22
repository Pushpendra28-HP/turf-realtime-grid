import { useState } from 'react';
import { usePanZoom } from '../hooks/usePanZoom';
import { Tile } from './Tile';
import HoverInfo from './HoverInfo';
import ZoomControls from './ZoomControls';

const TILE = 28;
const GAP = 3;
const PAD = 14;

export default function Board({ config, tiles, meId, status, onCapture }) {
  const { cols, rows } = config;
  const gridW = cols * TILE + (cols - 1) * GAP;
  const gridH = rows * TILE + (rows - 1) * GAP;
  const frameW = gridW + PAD * 2;
  const frameH = gridH + PAD * 2;

  const pz = usePanZoom(frameW, frameH);
  const [hover, setHover] = useState(null);

  const tileFromEvent = (e) => {
    const el = e.target.closest?.('[data-x]');
    return el ? { x: Number(el.dataset.x), y: Number(el.dataset.y) } : null;
  };

  const handleClick = (e) => {
    if (pz.wasDragged()) return;
    const pos = tileFromEvent(e);
    if (pos) onCapture(pos.x, pos.y);
  };

  const handleOver = (e) => {
    const pos = tileFromEvent(e);
    setHover((h) => (h?.x === pos?.x && h?.y === pos?.y ? h : pos));
  };

  const cells = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = tiles[y * cols + x];
      cells.push(<Tile key={y * cols + x} x={x} y={y} tile={tile} mine={Boolean(tile) && tile.ownerId === meId} />);
    }
  }

  const hovered = hover ? tiles[hover.y * cols + hover.x] : null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-line">
      <div ref={pz.viewportRef} className="board-viewport absolute inset-0">
        <div
          ref={pz.contentRef}
          className="board-frame absolute left-0 top-0 rounded-2xl border border-line bg-surface/80 shadow-2xl shadow-black/40"
          style={{ width: frameW, height: frameH, padding: PAD }}
        >
          <div
            onClick={handleClick}
            onPointerOver={handleOver}
            onPointerLeave={() => setHover(null)}
            className="grid"
            style={{
              '--tile': `${TILE}px`,
              gridTemplateColumns: `repeat(${cols}, ${TILE}px)`,
              gap: GAP,
            }}
          >
            {cells}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-3 top-3 hidden items-center gap-3 rounded-xl border border-line bg-surface/80 px-3 py-2 text-[11px] text-muted backdrop-blur sm:flex">
        <span>Click to capture</span>
        <span className="h-3 w-px bg-line" />
        <span>Scroll to zoom</span>
        <span className="h-3 w-px bg-line" />
        <span>Drag to pan</span>
      </div>

      {status !== 'live' && (
        <div className="animate-fade-in absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-400/30 bg-amber-950/80 px-4 py-1.5 text-xs font-medium text-amber-200 backdrop-blur">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
          Reconnecting...
        </div>
      )}

      <div className="absolute bottom-3 left-3">
        <HoverInfo hover={hover} tile={hovered} meId={meId} />
      </div>
      <div className="absolute bottom-3 right-3">
        <ZoomControls pct={pz.zoomPct} onZoomIn={pz.zoomIn} onZoomOut={pz.zoomOut} onReset={pz.reset} />
      </div>
    </div>
  );
}
