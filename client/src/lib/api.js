import { SERVER_URL } from './config';

export async function joinGame({ name, color }) {
  let res;
  try {
    res = await fetch(`${SERVER_URL}/api/users/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
  } catch {
    throw new Error('Cannot reach the server. Is it running?');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Could not join the game. Please try again.');
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}
