import { useCallback, useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { describeCaptureError } from '../lib/messages';
import { useToast } from './Toast';
import Header from './Header';
import Board from './Board';
import PlayerCard from './PlayerCard';
import Leaderboard from './Leaderboard';
import ActivityFeed from './ActivityFeed';

function LoadingScreen({ status, onLogout }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-indigo-400" />
        <p className="mt-5 text-sm font-medium">
          {status === 'reconnecting' ? 'Cannot reach the server, retrying...' : 'Connecting to the grid...'}
        </p>
        <button type="button" onClick={onLogout} className="mt-4 text-xs text-muted underline-offset-4 transition hover:text-white hover:underline">
          Use a different name
        </button>
      </div>
    </div>
  );
}

export default function Game({ token, onLogout }) {
  const toast = useToast();

  const handleUnauthorized = useCallback(() => {
    toast('Your session expired, please join again', 'info');
    onLogout();
  }, [toast, onLogout]);

  const { state, capture } = useGame(token, { onUnauthorized: handleUnauthorized });
  const { ready, status, config, me, tiles, leaderboard, online, feed, cooldownEndsAt } = state;

  const owned = useMemo(() => {
    if (!me) return 0;
    return tiles.reduce((n, t) => (t && t.ownerId === me.id ? n + 1 : n), 0);
  }, [tiles, me]);

  const onlineIds = useMemo(() => new Set(online.userIds), [online.userIds]);

  const handleCapture = useCallback(
    async (x, y) => {
      const result = await capture(x, y);
      if (!result.ok && !result.silent) toast(describeCaptureError(result));
    },
    [capture, toast]
  );

  if (!ready) return <LoadingScreen status={status} onLogout={onLogout} />;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Header me={me} onlineCount={online.count} status={status} onLogout={onLogout} />

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row">
        <section className="h-[62dvh] min-h-80 lg:h-auto lg:flex-1">
          <Board config={config} tiles={tiles} meId={me.id} status={status} onCapture={handleCapture} />
        </section>

        <aside className="thin-scroll flex flex-col gap-4 lg:w-80 lg:shrink-0 lg:overflow-y-auto">
          <PlayerCard me={me} owned={owned} total={config.cols * config.rows} cooldownEndsAt={cooldownEndsAt} config={config} />
          <Leaderboard leaderboard={leaderboard} meId={me.id} onlineIds={onlineIds} />
          <ActivityFeed feed={feed} />
        </aside>
      </main>
    </div>
  );
}
