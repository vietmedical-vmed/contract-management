(function () {
  const h = React.createElement;
  const { useState, useEffect } = React;
  const { api, getToken, getUser, clearToken } = window.CONTRACT_API;
  const { LoginGate } = window.CONTRACT_AUTH;
  const R = window.CONTRACT_ROUTER;

  const NAV = [
    { path: "/dashboard",  label: "Tổng quan",   icon: "\u{1F4CA}" },
    { path: "/contracts",  label: "Hợp đồng",    icon: "\u{1F4C4}" },
    { path: "/alerts",     label: "Cảnh báo",     icon: "\u{1F514}" },
    { path: "/config",     label: "Cấu hình",     icon: "\u{2699}️}", roles: ["admin"] },
  ];

  function roleBadge(role) {
    const colors = { admin: "#7c3aed", manager: "#0891b2", pm: "#0891b2", am: "#ea580c" };
    const bg = colors[role] || "#6b7280";
    return h("span", {
      className: "text-xs text-white px-2 py-0.5 rounded-full font-medium",
      style: { background: bg }
    }, (role || "").toUpperCase());
  }

  function Shell({ user, onLogout }) {
    const path = R.useRoute();
    const visibleNav = NAV.filter(n => !n.roles || n.roles.includes(user.app_role));
    const Screen = R.get(path);
    const initials = (user.ho_ten || user.username || "?").split(" ").map(w => w[0]).join("").slice(-2).toUpperCase();

    return h("div", { className: "min-h-screen flex flex-col", style: { background: "#f0f2f5" } },
      // Header
      h("header", { className: "sticky top-0 z-30 shadow-sm", style: { background: "#fff", borderBottom: "1px solid #dadde1" } },
        h("div", { className: "max-w-7xl mx-auto px-4 py-3 flex items-center justify-between" },
          h("div", { className: "flex items-center gap-3" },
            h("div", {
              className: "w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold",
              style: { background: "#1877f2" }
            }, initials),
            h("div", null,
              h("h1", { className: "text-base font-bold leading-tight", style: { color: "#1c1e21" } }, "QUẢN LÝ HỢP ĐỒNG"),
              h("div", { className: "flex items-center gap-2 text-xs", style: { color: "#65676b" } },
                h("span", null, user.ho_ten || user.username),
                roleBadge(user.app_role)
              )
            )
          ),
          h("div", { className: "flex items-center gap-2" },
            h("button", {
              onClick: () => window.location.reload(),
              className: "p-2 rounded-lg hover:bg-gray-100 text-sm", title: "Tải lại"
            }, "\u{1F504}"),
            h("button", {
              onClick: onLogout,
              className: "px-3 py-1.5 rounded-lg text-sm font-medium text-white",
              style: { background: "#dc2626" }
            }, "Đăng xuất")
          )
        ),

        // Tab nav
        h("div", { className: "max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto" },
          visibleNav.map(n =>
            h("button", {
              key: n.path,
              onClick: () => R.navigate(n.path),
              className: "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors " +
                (path === n.path ? "border-blue-600" : "border-transparent hover:border-gray-300"),
              style: { color: path === n.path ? "#1877f2" : "#65676b" }
            }, n.icon + " " + n.label)
          )
        )
      ),

      // Main content
      h("main", { className: "flex-1 max-w-7xl mx-auto w-full px-4 py-6" },
        Screen
          ? h(Screen, { user })
          : h("div", { className: "text-center py-20 text-gray-400" }, "Trang chưa được xây dựng")
      ),

      // Footer
      h("footer", { className: "text-center text-xs py-3", style: { color: "#65676b" } },
        "Contract Management · VMED Group"
      )
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
            app_role: me.app_role || cached.app_role || "am",
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
