export default function ActivityFeed({ feed }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Live activity</h2>

      {feed.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">Waiting for the next capture...</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {feed.map((e) => (
            <li key={e.id} className="animate-slide-up flex items-center gap-2.5 text-[13px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: e.color }} />
              <span className="min-w-0 flex-1 truncate text-slate-300">
                <span className={e.mine ? 'font-semibold text-white' : 'font-medium text-slate-100'}>{e.mine ? 'You' : e.name}</span>{' '}
                {e.from ? 'took' : 'claimed'} <span className="font-mono text-xs text-muted">{e.x},{e.y}</span>
                {e.from && <span className="text-muted"> from {e.from}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
