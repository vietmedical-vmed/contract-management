(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }

  function KPICard({ label, value, color, sub, onClick }) {
    return el("div", {
      className: "bg-white rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md transition",
      style: { borderLeft: `4px solid ${color}` },
      onClick
    },
      el("div", { className: "text-sm font-medium", style: { color: "#65676b" } }, label),
      el("div", { className: "text-3xl font-bold mt-1", style: { color } }, fmt(value)),
      sub && el("div", { className: "text-xs mt-1", style: { color: "#65676b" } }, sub)
    );
  }

  function AlertRow({ items, title, color, emptyMsg }) {
    return el("div", { className: "bg-white rounded-xl shadow-sm p-5" },
      el("h3", { className: "font-semibold mb-3 flex items-center gap-2", style: { color: "#1c1e21" } },
        el("span", { className: "w-2 h-2 rounded-full inline-block", style: { background: color } }),
        title
      ),
      items.length === 0
        ? el("p", { className: "text-sm", style: { color: "#65676b" } }, emptyMsg)
        : el("div", { className: "space-y-2" },
            items.slice(0, 10).map((it, i) =>
              el("div", { key: i, className: "flex items-center justify-between text-sm py-2 border-b last:border-0", style: { borderColor: "#f0f2f5" } },
                el("div", null,
                  el("span", { className: "font-medium", style: { color: "#1c1e21" } }, it.label),
                  el("span", { className: "ml-2", style: { color: "#65676b" } }, it.sub)
                ),
                el("span", {
                  className: "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                  style: { background: it.urgent ? "#dc2626" : "#f59e0b" }
                }, it.badge)
              )
            )
          )
    );
  }

  function DashboardScreen({ user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      setLoading(true);
      api("dashboard-summary", {})
        .then(res => setData(res))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, []);

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải dữ liệu...");
    if (error) return el("div", { className: "text-center py-20" },
      el("p", { className: "text-red-500 mb-2" }, "Lỗi: " + error),
      el("button", {
        onClick: () => window.location.reload(),
        className: "px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
      }, "Thử lại")
    );

    if (!data) return null;

    const expiryAlerts = (data.expiry_alerts || []).map(a => ({
      label: a.so_hd || a.ma_hd,
      sub: a.ten_kh,
      badge: a.days_remaining + " ngày",
      urgent: a.days_remaining <= 15,
    }));

    const quantityAlerts = (data.quantity_alerts || []).map(a => ({
      label: a.ten_hang_hoa,
      sub: (a.so_hd || a.ma_hd) + " · còn " + fmt(a.so_luong_con_lai),
      badge: "còn ~" + a.days_supply + " ngày",
      urgent: a.days_supply <= 10,
    }));

    return el("div", { className: "space-y-6" },
      el("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" },
        el(KPICard, { label: "Tổng hợp đồng", value: data.total_active_contracts, color: "#1877f2", sub: "Sắp hết hạn + Còn hạn" }),
        el(KPICard, {
          label: "HĐ sắp hết hạn", value: data.expiring_count, color: "#f59e0b",
          sub: "Trong " + (data.max_warn_days || 30) + " ngày tới",
          onClick: () => R.navigate("/alerts")
        }),
        el(KPICard, {
          label: "SP sắp hết thầu", value: data.low_quantity_count, color: "#dc2626",
          sub: "Trong " + (data.max_qty_warn_days || 20) + " ngày tới",
          onClick: () => R.navigate("/alerts")
        }),
        el(KPICard, { label: "HĐ hết hạn trong năm", value: data.fiscal_year_expiry_count, color: "#8b5cf6", sub: "Năm tài chính (T4–T3)" }),
      ),

      el("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
        el(AlertRow, {
          title: "HĐ sắp hết hạn",
          items: expiryAlerts,
          color: "#f59e0b",
          emptyMsg: "Không có hợp đồng nào sắp hết hạn"
        }),
        el(AlertRow, {
          title: "SP sắp hết thầu",
          items: quantityAlerts,
          color: "#dc2626",
          emptyMsg: "Không có sản phẩm nào sắp hết thầu"
        })
      )
    );
  }

  R.register("/dashboard", DashboardScreen);
})();
