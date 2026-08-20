(function () {
  const C = window.CONTRACT_CONFIG;

  function getToken() {
    return sessionStorage.getItem(C.TOKEN_STORAGE_KEY)
      || localStorage.getItem(C.TOKEN_STORAGE_KEY);
  }
  function setToken(token, remember) {
    if (remember) localStorage.setItem(C.TOKEN_STORAGE_KEY, token);
    else sessionStorage.setItem(C.TOKEN_STORAGE_KEY, token);
  }
  function clearToken() {
    sessionStorage.removeItem(C.TOKEN_STORAGE_KEY);
    localStorage.removeItem(C.TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(C.USER_STORAGE_KEY);
    localStorage.removeItem(C.USER_STORAGE_KEY);
  }

  function getUser() {
    try {
      const raw = sessionStorage.getItem(C.USER_STORAGE_KEY)
        || localStorage.getItem(C.USER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function setUser(user, remember) {
    const json = JSON.stringify(user);
    if (remember) localStorage.setItem(C.USER_STORAGE_KEY, json);
    else sessionStorage.setItem(C.USER_STORAGE_KEY, json);
  }

  async function api(action, payload) {
    const isLogin = action === "login";
    const fnName = isLogin ? C.FN_LOGIN_NAME : C.FN_API_NAME;
    const url = `${C.SUPABASE_URL}/functions/v1/${fnName}`;
    const body = isLogin
      ? payload
      : { action, token: getToken(), payload };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": C.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${C.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      if (data.error === "unauthorized") clearToken();
      throw new Error(data.error || data.message || `HTTP ${res.status}`);
    }
    return data;
  }

  window.CONTRACT_API = { getToken, setToken, clearToken, getUser, setUser, api };
})();
