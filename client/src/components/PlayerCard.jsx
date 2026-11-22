import { now } from '../lib/clock';
import { useCooldownReady } from '../hooks/useCooldown';

function CooldownMeter({ endsAt, color }) {
  const ready = useCooldownReady(endsAt);
  const remaining = Math.max(0, endsAt - now());

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-300">{ready ? 'Ready to capture' : 'Recharging'}</span>
        <span className={`h-2 w-2 rounded-full ${ready ? 'animate-pulse bg-emerald-400' : 'bg-slate-600'}`} />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        {ready ? (
          <div className="h-full w-full rounded-full" style={{ backgroundColor: color }} />
        ) : (
          <div
            // restarts the CSS animation every time a new cooldown begins
            key={endsAt}
            className="cooldown-fill h-full w-full rounded-full"
            style={{ backgroundColor: color, animationDuration: `${remaining}ms` }}
          />
        )}
      </div>
    </div>
  );
}

export default function PlayerCard({ me, owned, total, cooldownEndsAt, config }) {
  const share = total ? Math.round((owned / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">Your territory</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold leading-none">{owned}</span>
            <span className="text-sm text-muted">
              tile{owned === 1 ? '' : 's'} · {share}%
            </span>
          </div>
        </div>
        <span className="h-9 w-9 rounded-xl shadow-lg" style={{ backgroundColor: me.color, boxShadow: `0 8px 24px -8px ${me.color}` }} />
      </div>

      <div className="mt-4">
        <CooldownMeter endsAt={cooldownEndsAt} color={me.color} />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        {(config.cooldownMs / 1000).toFixed(1)}s between captures. A captured tile is protected for {Math.round(config.lockMs / 1000)}s.
      </p>
    </section>
  );
}
