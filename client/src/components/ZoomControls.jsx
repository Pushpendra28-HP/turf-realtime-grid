const btn =
  'grid h-9 w-9 place-items-center text-slate-300 transition hover:bg-white/10 hover:text-white active:scale-95';

export default function ZoomControls({ pct, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-surface/90 shadow-lg backdrop-blur">
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Zoom out">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onReset}
        title="Fit to screen"
        className="min-w-14 border-x border-line px-2 font-mono text-xs text-slate-300 transition hover:bg-white/10 hover:text-white"
      >
        {pct}%
      </button>
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Zoom in">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
