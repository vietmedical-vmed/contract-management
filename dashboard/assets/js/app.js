(function () {
  const h = React.createElement;
  const { useState, useEffect } = React;
  const { api, getToken, getUser, clearToken } = window.CONTRACT_API;
  const { LoginGate } = window.CONTRACT_AUTH;
  const R = window.CONTRACT_ROUTER;

  const NAV = [
    { path: "/dashboard",  label: "Tổng quan" },
    { path: "/contracts",  label: "Hợp đồng" },
    { path: "/config",     label: "Cấu hình", roles: ["admin"] },
  ];

  const initials = (u) => {
    const src = (u.ho_ten || u.username || "").trim();
    if (!src) return "CT";
    const parts = src.split(/\s+/);
    const s = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2);
    return s.toUpperCase();
  };

  function Shell({ user, onLogout }) {
    const path = R.useRoute();
    const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user.role));
    const Screen = R.get(path);
    const subtitle = user.ho_ten || user.username || "—";
    const ROLE_BADGE = {
      admin:   { label: "Admin",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
      manager: { label: "Manager", cls: "bg-blue-50 text-blue-700 border-blue-200" },
      product_manager: { label: "PM", cls: "bg-violet-50 text-violet-700 border-violet-200" },
      area_manager: { label: "AM", cls: "bg-teal-50 text-teal-700 border-teal-200" },
      ps:      { label: "PS",      cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    };
    const badge = ROLE_BADGE[user.role];

    return h("div", { className: "min-h-screen bg-slate-50" },
      h("header", { className: "bg-white border-b border-slate-200" },
        h("div", { className: "w-full px-4 md:px-6" },
          h("div", { className: "flex items-start justify-between pt-3 gap-4" },
            h("div", { className: "flex items-center gap-3" },
              h("div", {
                className: "w-11 h-11 rounded-full bg-blue-500 text-white grid place-items-center font-bold text-sm shrink-0",
              }, initials(user)),
              h("div", { className: "leading-tight" },
                h("div", { className: "font-bold text-slate-900 text-base md:text-lg" }, "QUẢN LÝ HỢP ĐỒNG"),
                h("div", { className: "flex items-center gap-2 mt-0.5" },
                  h("span", { className: "text-xs text-slate-500" }, subtitle),
                  badge && h("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-semibold border " + badge.cls }, badge.label),
                ),
              ),
            ),
            h("div", { className: "flex flex-col items-end gap-2" },
              h("div", { className: "text-[9px] text-slate-400 italic text-right" },
                "Designed and developed by ",
                h("span", { className: "font-semibold text-slate-500 not-italic" }, "Do Hoang Giang"),
              ),
              h("div", { className: "flex items-center gap-2" },
                h("button", {
                  onClick: () => window.location.reload(),
                  className: "flex items-center gap-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 px-2.5 py-1.5 rounded-md",
                }, h("span", null, "⟳"), "Reload"),
                h("button", {
                  onClick: onLogout,
                  className: "flex items-center gap-1.5 text-xs text-white bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-md",
                }, h("span", null, "⎋"), "Đăng xuất"),
              ),
            ),
          ),
          h("nav", { className: "flex items-center gap-5 md:gap-6 mt-3 overflow-x-auto overflow-y-hidden" },
            visibleNav.map((it) => h("button", {
              key: it.path,
              onClick: () => R.navigate(it.path),
              className: "relative px-0.5 pb-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors " +
                (path === it.path
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"),
            }, it.label)),
          ),
        ),
      ),
      h("main", { className: "w-full" },
        Screen
          ? h(Screen, { user })
          : h("div", { className: "p-6 text-slate-500 text-sm" }, "Trang chưa được xây dựng"),
      ),
    );
  }

  function App() {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
      const boot = document.getElementById("boot");
      if (boot) boot.style.display = "none";

      const token = getToken();
      const cached = getUser();
      if (token && cached) {
        api("whoami").then(me => {
          setUser({
            ...cached,
            role: me.role || cached.role,
            mien: me.mien || cached.mien,
          });
        }).catch(() => {
          clearToken();
        }).finally(() => setChecking(false));
      } else {
        clearToken();
        setChecking(false);
      }
    }, []);

    if (checking) return h("div", { className: "min-h-screen flex items-center justify-center", style: { background: "#f0f2f5" } },
      h("div", { className: "text-gray-400" }, "Đang kiểm tra phiên...")
    );

    if (!user) return h(LoginGate, { onAuth: setUser });

    return h(Shell, {
      user,
      onLogout: () => { clearToken(); setUser(null); }
    });
  }

  ReactDOM.createRoot(document.getElementById("root")).render(h(App));
})();
