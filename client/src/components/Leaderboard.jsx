const rankColor = ['text-amber-300', 'text-slate-300', 'text-orange-400'];

export default function Leaderboard({ leaderboard, meId, onlineIds }) {
  const { top, claimed, total } = leaderboard;
  const max = top[0]?.count || 1;
  const claimedPct = total ? Math.round((claimed / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Leaderboard</h2>
        <span className="font-mono text-[11px] text-muted">
          {claimed}/{total} claimed
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
        <div className="h-full rounded-full bg-linear-to-r from-indigo-500 via-fuchsia-500 to-amber-400 transition-all duration-500" style={{ width: `${claimedPct}%` }} />
      </div>

      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Nobody owns a tile yet. Be the first.</p>
      ) : (
        <ol className="mt-4 space-y-2.5">
          {top.map((p, i) => {
            const isMe = p.userId === meId;
            const isOnline = onlineIds.has(p.userId);
            return (
              <li key={p.userId} className="animate-fade-in">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className={`w-4 text-center font-mono text-xs font-semibold ${rankColor[i] ?? 'text-muted'}`}>{i + 1}</span>
                  <span className="relative h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: p.color }}>
                    {isOnline && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-surface" />}
                  </span>
                  <span className={`min-w-0 flex-1 truncate ${isMe ? 'font-semibold text-white' : 'text-slate-300'}`}>
                    {p.name}
                    {isMe && <span className="ml-1.5 text-[10px] font-medium uppercase text-muted">you</span>}
                  </span>
                  <span className="font-mono text-xs text-slate-200">{p.count}</span>
                </div>
                <div className="ml-6 mt-1 h-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(p.count / max) * 100}%`, backgroundColor: p.color }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
