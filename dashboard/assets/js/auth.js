(function () {
  const h = React.createElement;
  const { useState } = React;
  const { api, setToken, setUser, clearToken } = window.CONTRACT_API;

  function LockIcon() {
    return h("svg", { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
      h("rect", { x: 3, y: 11, width: 18, height: 11, rx: 2 }),
      h("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
    );
  }

  function AlertCircle() {
    return h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" },
      h("circle", { cx: 12, cy: 12, r: 10 }),
      h("line", { x1: 12, y1: 8, x2: 12, y2: 12 }),
      h("line", { x1: 12, y1: 16, x2: 12.01, y2: 16 })
    );
  }

  function msgOf(err) {
    const m = String(err.message || err).toLowerCase();
    if (m.includes("not found") || m.includes("invalid")) return "Sai tên đăng nhập hoặc mật khẩu";
    if (m.includes("unauthorized")) return "Phiên hết hạn, vui lòng đăng nhập lại";
    if (m.includes("no permission") || m.includes("forbidden")) return "Bạn không có quyền truy cập ứng dụng này";
    if (m.includes("network") || m.includes("fetch")) return "Lỗi kết nối, vui lòng thử lại";
    return err.message || "Lỗi không xác định";
  }

  function LoginGate({ onAuth }) {
    const [mode, setMode] = useState("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [newPw, setNewPw] = useState("");
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleLogin(e) {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        const res = await api("login", { username: username.trim(), password });
        setToken(res.token, remember);
        const me = await api("whoami");
        const user = {
          username: me.username || username.trim(),
          ho_ten: me.ho_ten || me.ho_va_ten || username.trim(),
          role: me.role,
          scope: me.scope,
          bu: me.bu,
          mien: me.mien,
        };
        setUser(user, remember);
        onAuth(user);
      } catch (err) {
        setError(msgOf(err));
      } finally {
        setLoading(false);
      }
    }

    async function handleChangePw(e) {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        await api("change-password", { old_password: password, new_password: newPw });
        setMode("login");
        setPassword("");
        setNewPw("");
        setError("");
        alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
      } catch (err) {
        setError(msgOf(err));
      } finally {
        setLoading(false);
      }
    }

    const isLogin = mode === "login";

    return h("div", { className: "min-h-screen flex items-center justify-center", style: { background: "#f0f2f5" } },
      h("form", {
        onSubmit: isLogin ? handleLogin : handleChangePw,
        className: "bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm"
      },
        h("div", { className: "flex flex-col items-center mb-6" },
          h("div", { className: "w-12 h-12 rounded-full flex items-center justify-center mb-3", style: { background: "#1877f2", color: "#fff" } }, h(LockIcon)),
          h("h1", { className: "text-xl font-bold", style: { color: "#1c1e21" } }, "Quản lý Hợp đồng"),
          h("p", { className: "text-sm mt-1", style: { color: "#65676b" } }, isLogin ? "Đăng nhập để tiếp tục" : "Đổi mật khẩu")
        ),

        error && h("div", { className: "flex items-center gap-2 rounded-lg px-3 py-2 mb-4 text-sm", style: { background: "#fee2e2", color: "#dc2626" } },
          h(AlertCircle), error
        ),

        h("div", { className: "space-y-4" },
          h("input", {
            type: "text", placeholder: "Tên đăng nhập", value: username,
            onChange: (e) => setUsername(e.target.value), required: true, autoFocus: true,
            className: "w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2",
            style: { borderColor: "#dadde1", focusRingColor: "#1877f2" },
            disabled: !isLogin,
          }),
          h("input", {
            type: "password", placeholder: isLogin ? "Mật khẩu" : "Mật khẩu cũ", value: password,
            onChange: (e) => setPassword(e.target.value), required: true,
            className: "w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2",
            style: { borderColor: "#dadde1" },
          }),
          !isLogin && h("input", {
            type: "password", placeholder: "Mật khẩu mới", value: newPw,
            onChange: (e) => setNewPw(e.target.value), required: true,
            className: "w-full px-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2",
            style: { borderColor: "#dadde1" },
          }),
          isLogin && h("label", { className: "flex items-center gap-2 text-sm cursor-pointer", style: { color: "#65676b" } },
            h("input", { type: "checkbox", checked: remember, onChange: (e) => setRemember(e.target.checked) }),
            "Ghi nhớ đăng nhập"
          ),
          h("button", {
            type: "submit", disabled: loading,
            className: "w-full py-2.5 rounded-lg text-white font-semibold text-sm transition",
            style: { background: loading ? "#93c5fd" : "#1877f2" },
          }, loading ? "Đang xử lý..." : (isLogin ? "Đăng nhập" : "Đổi mật khẩu")),
        ),

        h("div", { className: "mt-4 text-center" },
          h("button", {
            type: "button",
            onClick: () => { setMode(isLogin ? "change" : "login"); setError(""); },
            className: "text-sm underline", style: { color: "#1877f2" },
          }, isLogin ? "Đổi mật khẩu" : "Quay lại đăng nhập")
        )
      )
    );
  }

  window.CONTRACT_AUTH = { LoginGate };
})();
