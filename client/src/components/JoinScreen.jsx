import { useMemo, useState } from 'react';
import Logo from './Logo';
import { joinGame } from '../lib/api';
import { NAME_RE, PALETTE } from '../lib/config';
import { randomName } from '../lib/messages';

function validateName(raw) {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return 'Name must be at least 2 characters';
  if (name.length > 16) return 'Name must be at most 16 characters';
  if (!NAME_RE.test(name)) return 'Use only letters, numbers, spaces, _ or -';
  return null;
}

// decorative cells behind the card
function Backdrop() {
  const cells = useMemo(
    () =>
      Array.from({ length: 16 * 10 }, (_, i) => ({
        id: i,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        delay: (Math.random() * 4).toFixed(2),
        show: Math.random() < 0.55,
      })),
    []
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid grid-cols-16 content-center gap-2 p-4 opacity-70">
      {cells.map((c) => (
        <div
          key={c.id}
          className={`aspect-square rounded-md ${c.show ? 'animate-twinkle' : 'opacity-[0.06]'}`}
          style={{ backgroundColor: c.show ? c.color : '#8591a8', animationDelay: `${c.delay}s` }}
        />
      ))}
    </div>
  );
}

export default function JoinScreen({ onJoined }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => PALETTE[Math.floor(Math.random() * PALETTE.length)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const problem = validateName(name);
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { token } = await joinGame({ name: name.trim().replace(/\s+/g, ' '), color });
      onJoined(token);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <Backdrop />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-bg)_75%)]" />

      <form
        onSubmit={submit}
        noValidate
        className="animate-fade-in relative w-full max-w-md rounded-3xl border border-line bg-surface/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-8"
      >
        <div className="flex items-center gap-3">
          <Logo size={34} />
          <span className="font-display text-xl font-bold tracking-tight">Turf</span>
        </div>

        <h1 className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight">Claim your turf.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          One shared board, hundreds of tiles, everyone online at once. Click a tile to capture it and watch the map change live.
        </p>

        <label htmlFor="name" className="mt-7 block text-xs font-semibold uppercase tracking-wider text-muted">
          Display name
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            maxLength={24}
            autoFocus
            autoComplete="off"
            spellCheck="false"
            placeholder="e.g. NeonFox"
            aria-invalid={Boolean(error)}
            className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-4 focus:ring-white/5"
          />
          <button
            type="button"
            onClick={() => {
              setName(randomName());
              setError('');
            }}
            title="Random name"
            aria-label="Random name"
            className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-bg text-muted transition hover:border-slate-500 hover:text-white active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
              <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>

        <div className="mt-2 min-h-5 text-xs text-rose-400" role="alert">
          {error}
        </div>

        <span className="block text-xs font-semibold uppercase tracking-wider text-muted">Your colour</span>
        <div className="mt-3 grid grid-cols-8 gap-2" role="radiogroup" aria-label="Pick a colour">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={c === color}
              aria-label={c}
              onClick={() => setColor(c)}
              className={`aspect-square rounded-lg transition hover:scale-110 active:scale-95 ${
                c === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-surface' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-black shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: color, boxShadow: `0 10px 30px -10px ${color}` }}
        >
          {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />}
          {loading ? 'Joining...' : 'Enter the grid'}
        </button>
      </form>
    </div>
  );
}
