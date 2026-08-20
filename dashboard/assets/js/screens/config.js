(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;

  function ConfigField({ label, desc, value, onChange, type }) {
    return el("div", { className: "py-4 border-b last:border-0", style: { borderColor: "#f0f2f5" } },
      el("label", { className: "block text-sm font-medium mb-1", style: { color: "#1c1e21" } }, label),
      el("p", { className: "text-xs mb-2", style: { color: "#65676b" } }, desc),
      type === "array"
        ? el("input", {
            type: "text", value: (value || []).join(", "),
            onChange: e => onChange(e.target.value.split(",").map(v => Number(v.trim())).filter(v => !isNaN(v))),
            className: "w-full max-w-xs px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" },
            placeholder: "VD: 30, 15"
          })
        : el("input", {
            type: "number", value: value || "",
            onChange: e => onChange(Number(e.target.value)),
            className: "w-full max-w-[120px] px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" },
            min: 1
          })
    );
  }

  function ConfigScreen({ user }) {
    const [config, setConfig] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
      setLoading(true);
      api("get-config", {})
        .then(res => setConfig(res.config || {}))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, []);

    function updateKey(key, value) {
      setConfig(prev => ({ ...prev, [key]: value }));
      setSuccess("");
    }

    async function handleSave() {
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        await api("update-config", { config });
        setSuccess("Đã lưu cấu hình thành công!");
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }

    if (user.app_role !== "admin") {
      return el("div", { className: "text-center py-20" },
        el("p", { className: "text-gray-400 text-lg" }, "Bạn không có quyền truy cập trang này"),
        el("p", { className: "text-gray-400 text-sm mt-2" }, "Chỉ Admin mới có thể thay đổi cấu hình cảnh báo")
      );
    }

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải cấu hình...");

    return el("div", { className: "max-w-2xl mx-auto space-y-6" },
      el("div", { className: "bg-white rounded-xl shadow-sm p-6" },
        el("h2", { className: "text-lg font-bold mb-1", style: { color: "#1c1e21" } }, "Cấu hình cảnh báo"),
        el("p", { className: "text-sm mb-4", style: { color: "#65676b" } }, "Thay đổi ngưỡng cảnh báo cho hệ thống"),

        error && el("div", { className: "rounded-lg px-3 py-2 mb-4 text-sm", style: { background: "#fee2e2", color: "#dc2626" } }, error),
        success && el("div", { className: "rounded-lg px-3 py-2 mb-4 text-sm", style: { background: "#dcfce7", color: "#16a34a" } }, success),

        el(ConfigField, {
          label: "Cảnh báo hết hạn HĐ (ngày)",
          desc: "Danh sách mốc cảnh báo trước ngày hết hạn hợp đồng. VD: 30, 15 = cảnh báo trước 30 ngày và 15 ngày.",
          value: config.contract_warn_days, type: "array",
          onChange: v => updateKey("contract_warn_days", v)
        }),
        el(ConfigField, {
          label: "Cảnh báo hết thầu (ngày)",
          desc: "Danh sách mốc cảnh báo khi số lượng còn lại không đủ cho N ngày bán. VD: 20, 10.",
          value: config.quantity_warn_days, type: "array",
          onChange: v => updateKey("quantity_warn_days", v)
        }),
        el(ConfigField, {
          label: "Hệ số nhân cảnh báo thầu",
          desc: "Hệ số nhân với trung bình bán ngày tương ứng với các mốc ngày. VD: 20, 10.",
          value: config.quantity_multiplier, type: "array",
          onChange: v => updateKey("quantity_multiplier", v)
        }),
        el(ConfigField, {
          label: "Khoảng thời gian tính trung bình (tháng)",
          desc: "Số tháng gần nhất dùng để tính trung bình bán hàng ngày.",
          value: config.avg_period_months, type: "number",
          onChange: v => updateKey("avg_period_months", v)
        }),

        el("div", { className: "mt-6 flex items-center gap-3" },
          el("button", {
            onClick: handleSave, disabled: saving,
            className: "px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition",
            style: { background: saving ? "#93c5fd" : "#1877f2" }
          }, saving ? "Đang lưu..." : "Lưu cấu hình"),
        )
      ),

      // Sync section
      el("div", { className: "bg-white rounded-xl shadow-sm p-6" },
        el("h2", { className: "text-lg font-bold mb-1", style: { color: "#1c1e21" } }, "Đồng bộ dữ liệu"),
        el("p", { className: "text-sm mb-4", style: { color: "#65676b" } },
          "Cập nhật số lượng bán thực tế từ bảng hóa đơn. Thường chạy tự động hàng tuần."
        ),
        el(SyncButton)
      )
    );
  }

  function SyncButton() {
    const [syncing, setSyncing] = useState(false);
    const [result, setResult] = useState(null);

    async function handleSync() {
      setSyncing(true);
      setResult(null);
      try {
        const res = await api("sync-invoices", {});
        setResult({ ok: true, msg: "Đồng bộ thành công! " + (res.updated || 0) + " dòng cập nhật." });
      } catch (err) {
        setResult({ ok: false, msg: err.message });
      } finally {
        setSyncing(false);
      }
    }

    return el("div", null,
      el("button", {
        onClick: handleSync, disabled: syncing,
        className: "px-4 py-2 rounded-lg text-sm font-medium border transition",
        style: { borderColor: "#dadde1", color: syncing ? "#9ca3af" : "#1c1e21" }
      }, syncing ? "Đang đồng bộ..." : "Đồng bộ ngay"),
      result && el("p", {
        className: "text-sm mt-2",
        style: { color: result.ok ? "#16a34a" : "#dc2626" }
      }, result.msg)
    );
  }

  R.register("/config", ConfigScreen);
})();
