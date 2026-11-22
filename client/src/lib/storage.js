// localStorage can throw (private mode, blocked storage), so every access is guarded
const KEY = 'turf.token';

export const getToken = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const saveToken = (token) => {
  try {
    localStorage.setItem(KEY, token);
  } catch {
    /* the session just will not survive a refresh */
  }
};

export const clearToken = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
};
