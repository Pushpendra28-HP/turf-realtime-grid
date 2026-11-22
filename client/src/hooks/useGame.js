import { useCallback, useEffect, useReducer, useRef } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../lib/config';
import { now, syncClock } from '../lib/clock';

const FEED_LIMIT = 12;
let feedId = 0;

const initialState = {
  ready: false,
  status: 'connecting', // connecting | live | reconnecting
  awaitingInit: true,
  buffer: [], // tile updates that arrive before the snapshot does
  config: null,
  me: null,
  tiles: [],
  leaderboard: { at: 0, top: [], claimed: 0, total: 0 },
  online: { at: 0, count: 0, userIds: [] },
  feed: [],
  cooldownEndsAt: 0,
};

// Applies one tile from the server. Older data never overwrites newer data.
function putTile(state, incoming, withFeed) {
  const { prevOwnerName, ...tile } = incoming;
  const index = tile.y * state.config.cols + tile.x;
  const current = state.tiles[index];
  if (current && !current.pending && current.capturedAt > tile.capturedAt) return state;

  const tiles = state.tiles.slice();
  tiles[index] = tile;
  const next = { ...state, tiles };

  if (withFeed) {
    const entry = {
      id: ++feedId,
      name: tile.ownerName,
      color: tile.ownerColor,
      x: tile.x,
      y: tile.y,
      from: prevOwnerName || null,
      mine: tile.ownerId === state.me.id,
    };
    next.feed = [entry, ...state.feed].slice(0, FEED_LIMIT);
  }
  return next;
}

const newest = (a, b) => (b.at >= a.at ? b : a);

function reducer(state, action) {
  switch (action.type) {
    case 'status':
      return state.status === action.status ? state : { ...state, status: action.status };

    case 'connected':
      return { ...state, awaitingInit: true };

    case 'disconnected':
      return { ...state, status: 'reconnecting', awaitingInit: true };

    case 'init': {
      const { config, me, tiles, leaderboard, online } = action.payload;
      const grid = new Array(config.cols * config.rows).fill(null);
      for (const t of tiles) grid[t.y * config.cols + t.x] = t;

      let next = {
        ...state,
        ready: true,
        status: 'live',
        awaitingInit: false,
        buffer: [],
        config,
        me,
        tiles: grid,
        feed: [],
        leaderboard: newest(state.leaderboard, leaderboard),
        online: newest(state.online, online),
        cooldownEndsAt: me.lastCaptureAt ? me.lastCaptureAt + config.cooldownMs : 0,
      };
      for (const t of state.buffer) next = putTile(next, t, false);
      return next;
    }

    case 'tile':
      if (state.awaitingInit) return { ...state, buffer: [...state.buffer, action.tile] };
      return putTile(state, action.tile, true);

    case 'optimistic': {
      const tiles = state.tiles.slice();
      tiles[action.y * state.config.cols + action.x] = action.tile;
      return { ...state, tiles };
    }

    case 'revert': {
      const index = action.y * state.config.cols + action.x;
      // only undo if our placeholder is still there, a real update from the server wins
      if (!state.tiles[index]?.pending) return state;
      const tiles = state.tiles.slice();
      tiles[index] = action.previous;
      return { ...state, tiles };
    }

    case 'cooldown':
      return { ...state, cooldownEndsAt: action.endsAt };

    case 'leaderboard':
      return { ...state, leaderboard: newest(state.leaderboard, action.value) };

    case 'presence':
      return { ...state, online: newest(state.online, action.value) };

    default:
      return state;
  }
}

export function useGame(token, { onUnauthorized } = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const socketRef = useRef(null);
  const inFlight = useRef(false);
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;

  useEffect(() => {
    const socket = io(SERVER_URL || undefined, { auth: { token } });
    socketRef.current = socket;
    let retryTimer = null;

    socket.on('connect', () => dispatch({ type: 'connected' }));
    socket.on('init', (payload) => {
      syncClock(payload.serverTime);
      dispatch({ type: 'init', payload });
    });
    socket.on('tile:update', (tile) => dispatch({ type: 'tile', tile }));
    socket.on('leaderboard', (value) => dispatch({ type: 'leaderboard', value }));
    socket.on('presence', (value) => dispatch({ type: 'presence', value }));

    socket.on('disconnect', (reason) => {
      dispatch({ type: 'disconnected' });
      // the server closed the connection on purpose, the client will not retry by itself
      if (reason === 'io server disconnect') socket.connect();
    });

    socket.on('connect_error', (err) => {
      if (err?.data?.code === 'UNAUTHORIZED') {
        unauthorizedRef.current?.();
        return;
      }
      dispatch({ type: 'status', status: 'reconnecting' });
      if (!socket.active) retryTimer = setTimeout(() => socket.connect(), 2000);
    });

    return () => {
      clearTimeout(retryTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const capture = useCallback((x, y) => {
    const socket = socketRef.current;
    const { config, me, tiles, cooldownEndsAt, awaitingInit } = stateRef.current;
    const fail = (result) => Promise.resolve({ ok: false, ...result });

    if (!socket?.connected || awaitingInit || !config) return fail({ code: 'OFFLINE' });
    if (inFlight.current) return fail({ code: 'BUSY', silent: true });

    const t = now();
    const previous = tiles[y * config.cols + x];
    if (previous?.ownerId === me.id) return fail({ code: 'ALREADY_OWNED', silent: true });
    if (cooldownEndsAt > t) return fail({ code: 'COOLDOWN', retryAfterMs: cooldownEndsAt - t });
    if (previous && previous.lockedUntil > t) return fail({ code: 'LOCKED', retryAfterMs: previous.lockedUntil - t });

    // show the capture right away, the server confirms or rolls it back
    inFlight.current = true;
    dispatch({
      type: 'optimistic',
      x,
      y,
      tile: { x, y, ownerId: me.id, ownerName: me.name, ownerColor: me.color, capturedAt: 0, lockedUntil: 0, pending: true },
    });

    return new Promise((resolve) => {
      socket.timeout(5000).emit('tile:capture', { x, y }, (err, res) => {
        inFlight.current = false;
        if (err || !res?.ok) {
          dispatch({ type: 'revert', x, y, previous });
          resolve(err ? { ok: false, code: 'TIMEOUT' } : res);
          return;
        }
        dispatch({ type: 'cooldown', endsAt: res.cooldownEndsAt });
        resolve(res);
      });
    });
  }, []);

  return { state, capture };
}
