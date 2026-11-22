import { useEffect, useReducer, useState } from 'react';
import { now } from '../lib/clock';

// true once the (server time) deadline has passed; re-renders exactly when that happens
export function useCooldownReady(endsAt) {
  const [, rerender] = useReducer((n) => n + 1, 0);

  useEffect(() => {
    const remaining = endsAt - now();
    if (remaining <= 0) return undefined;
    const id = setTimeout(rerender, remaining + 30);
    return () => clearTimeout(id);
  }, [endsAt]);

  return endsAt - now() <= 0;
}

// re-renders on an interval while `active`, used for small live countdowns
export function useTick(active, ms = 250) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}
