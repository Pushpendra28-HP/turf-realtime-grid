const seconds = (ms) => (Math.max(100, Math.ceil(ms / 100) * 100) / 1000).toFixed(1);

// Turns a failed capture result (from the server or from local checks) into text for a toast
export function describeCaptureError(res) {
  switch (res.code) {
    case 'COOLDOWN':
      return `Recharging, ready in ${seconds(res.retryAfterMs ?? 0)}s`;
    case 'LOCKED':
      return `Protected for ${seconds(res.retryAfterMs ?? 0)}s more`;
    case 'OFFLINE':
      return 'You are offline, reconnecting...';
    case 'TIMEOUT':
      return 'The server took too long to answer, try again';
    case 'CONFLICT':
      return 'Too slow, someone grabbed it first';
    default:
      return res.message || 'Something went wrong, try again';
  }
}

const ADJECTIVES = ['Swift', 'Brave', 'Lucky', 'Neon', 'Cosmic', 'Sunny', 'Frosty', 'Wild', 'Quick', 'Calm'];
const ANIMALS = ['Fox', 'Owl', 'Lynx', 'Panda', 'Otter', 'Hawk', 'Koala', 'Tiger', 'Gecko', 'Moose'];

export function randomName() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES)}${pick(ANIMALS)}${10 + Math.floor(Math.random() * 90)}`;
}
