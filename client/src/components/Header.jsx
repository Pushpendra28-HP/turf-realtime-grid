import Logo from './Logo';

const STATUS = {
  live: { label: 'Live', dot: 'bg-emerald-400', ring: 'bg-emerald-400/60' },
  connecting: { label: 'Connecting', dot: 'bg-amber-400', ring: 'bg-amber-400/60' },
  reconnecting: { label: 'Reconnecting', dot: 'bg-amber-400', ring: 'bg-amber-400/60' },
};

export default function Header({ me, onlineCount, status, onLogout }) {
  const s = STATUS[status] ?? STATUS.connecting;

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-surface/70 px-4 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <Logo size={26} />
        <span className="font-display text-lg font-bold tracking-tight">Turf</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 rounded-full border border-line bg-raised px-3 py-1.5 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.ring}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
          </span>
          <span className="hidden sm:inline">{s.label}</span>
          <span className="hidden h-3 w-px bg-line sm:block" />
          <span className="text-muted">
            <span className="font-semibold text-slate-100">{onlineCount}</span> online
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-line bg-raised py-1 pl-1.5 pr-1 text-xs">
          <span className="h-5 w-5 rounded-full" style={{ backgroundColor: me.color }} />
          <span className="max-w-24 truncate font-medium sm:max-w-40">{me.name}</span>
          <button
            type="button"
            onClick={onLogout}
            title="Sign out"
            aria-label="Sign out"
            className="grid h-6 w-6 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
