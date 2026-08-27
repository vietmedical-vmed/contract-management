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

    const inputStyle = {
      width: "100%", padding: "8px 12px", border: "1px solid #dadde1", borderRadius: 6,
      fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 10,
    };

    return h("div", {
      style: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 16 },
    },
      h("form", {
        onSubmit: isLogin ? handleLogin : handleChangePw,
        style: {
          background: "#fff", borderRadius: 8,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.1)",
          border: "1px solid #dadde1", padding: 24, width: "100%", maxWidth: 360,
        },
      },
        h("img", {
          src: "logo.png", alt: "VietMedical",
          style: { height: 48, display: "block", margin: "0 auto 24px" },
        }),
        h("h2", { style: { fontSize: 18, fontWeight: 700, margin: "0 0 20px", textAlign: "center", textTransform: "uppercase" } },
          isLogin ? "QUẢN LÝ HỢP ĐỒNG" : "ĐỔI MẬT KHẨU"),

        h("input", {
          autoFocus: true, value: username, onChange: (e) => setUsername(e.target.value),
          placeholder: "Tài khoản", style: inputStyle, disabled: !isLogin,
        }),
        h("input", {
          type: "password", value: password, onChange: (e) => setPassword(e.target.value),
          placeholder: isLogin ? "Mật khẩu" : "Mật khẩu cũ",
          style: { ...inputStyle, marginBottom: !isLogin ? 10 : 0 },
        }),
        !isLogin && h("input", {
          type: "password", value: newPw, onChange: (e) => setNewPw(e.target.value),
          placeholder: "Mật khẩu mới", style: { ...inputStyle, marginBottom: 0 },
        }),

        isLogin && h("label", {
          style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "#65676b", cursor: "pointer" },
        },
          h("input", { type: "checkbox", checked: remember, onChange: (e) => setRemember(e.target.checked) }),
          "Ghi nhớ đăng nhập trên thiết bị này",
        ),

        error && h("div", {
          style: { marginTop: 12, fontSize: 12, color: "#fa383e", display: "flex", alignItems: "center", gap: 6 },
        }, h(AlertCircle), " ", error),

        h("button", {
          disabled: loading,
          style: {
            width: "100%", marginTop: 16, background: "#1877f2", color: "#fff",
            padding: "8px 12px", borderRadius: 6, fontSize: 15, fontWeight: 700,
            border: "none", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer",
          },
        }, loading ? "Đang xử lý..." : (isLogin ? "Đăng nhập" : "Đổi mật khẩu")),

        h("div", { style: { marginTop: 14, textAlign: "center" } },
          h("button", {
            type: "button", onClick: () => { setMode(isLogin ? "change" : "login"); setError(""); },
            style: { background: "none", border: "none", color: "#1877f2", fontSize: 13, cursor: "pointer", padding: 0 },
          }, isLogin ? "Đổi mật khẩu" : "Quay lại đăng nhập"),
        ),
      ),
      h("div", { style: { marginTop: 24, textAlign: "center", fontSize: 11, color: "#8a8d91" } },
        "Designed and developed by Do Hoang Giang"),
    );
  }

  window.CONTRACT_AUTH = { LoginGate };
})();
