// Cooldowns and locks are decided by the server clock. We keep the offset between it
// and the local clock so countdowns line up even if the player's clock is wrong.
let offset = 0;

export const syncClock = (serverTime) => {
  offset = serverTime - Date.now();
};

export const now = () => Date.now() + offset;
