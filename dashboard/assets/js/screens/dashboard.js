(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;
  const F = window.CONTRACT_FILTERS;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }

  function KPICard({ label, value, color, sub, onClick }) {
    return el("div", {
      className: "bg-white rounded-xl shadow-sm p-5" + (onClick ? " cursor-pointer hover:shadow-md" : "") + " transition",
      style: { borderLeft: "4px solid " + color },
      onClick: onClick
    },
      el("div", { className: "text-sm font-medium", style: { color: "#65676b" } }, label),
      el("div", { className: "text-3xl font-bold mt-1", style: { color: color } }, fmt(value)),
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
            items.slice(0, 10).map(function (it, i) {
              return el("div", { key: i, className: "flex items-center justify-between text-sm py-2 border-b last:border-0", style: { borderColor: "#f0f2f5" } },
                el("div", null,
                  el("span", { className: "font-medium", style: { color: "#1c1e21" } }, it.label),
                  el("span", { className: "ml-2", style: { color: "#65676b" } }, it.sub)
                ),
                el("span", {
                  className: "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                  style: { background: it.urgent ? "#dc2626" : "#f59e0b" }
                }, it.badge)
              );
            })
          )
    );
  }

  function DashboardScreen({ user }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const filters = F.useFilters();

    useEffect(function () {
      setLoading(true);
      api("dashboard-summary", { bu: filters.bu, mien: filters.mien, nhom_sp: filters.nhom_sp })
        .then(function (res) { setData(res); })
        .catch(function (err) { setError(err.message); })
        .finally(function () { setLoading(false); });
    }, [filters.bu, filters.mien, filters.nhom_sp]);

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải dữ liệu...");
    if (error) return el("div", { className: "text-center py-20" },
      el("p", { className: "text-red-500 mb-2" }, "Lỗi: " + error),
      el("button", {
        onClick: function () { window.location.reload(); },
        className: "px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
      }, "Thử lại")
    );

    if (!data) return null;

    var expiryAlerts = (data.expiry_alerts || []).map(function (a) {
      return {
        label: a.so_hd || a.ma_hd,
        sub: a.ten_kh,
        badge: a.days_remaining + " ngày",
        urgent: a.days_remaining <= 15,
      };
    });

    var quantityAlerts = (data.quantity_alerts || []).map(function (a) {
      return {
        label: a.ten_hang_hoa,
        sub: (a.so_hd || a.ma_hd) + " · còn " + fmt(a.so_luong_con_lai),
        badge: "còn ~" + a.days_supply + " ngày",
        urgent: a.days_supply <= 10,
      };
    });

    return el("div", { className: "space-y-4" },
      // Filter bar
      el("div", { className: "bg-white rounded-xl shadow-sm p-4" },
        el("div", { className: "flex flex-wrap gap-3 items-end" },
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "BU"),
            el("select", {
              value: filters.bu,
              onChange: function (e) { F.set({ bu: e.target.value }); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "" }, "Tất cả"),
              (data.bu_list || []).map(function (k) { return el("option", { key: k, value: k }, k); })
            )
          ),
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Miền"),
            el("select", {
              value: filters.mien,
              onChange: function (e) { F.set({ mien: e.target.value }); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "" }, "Tất cả"),
              el("option", { value: "Miền Bắc" }, "Miền Bắc"),
              el("option", { value: "Miền Nam" }, "Miền Nam")
            )
          ),
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Nhóm SP"),
            el("select", {
              value: filters.nhom_sp,
              onChange: function (e) { F.set({ nhom_sp: e.target.value }); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "" }, "Tất cả"),
              (data.nhom_sp_list || []).map(function (k) { return el("option", { key: k, value: k }, k); })
            )
          )
        )
      ),

      // KPI cards — 5 columns
      el("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" },
        el(KPICard, {
          label: "Tổng hợp đồng", value: data.total_contracts, color: "#1877f2",
          sub: "Năm tài chính " + (data.fy_label || "")
        }),
        el(KPICard, { label: "Còn hạn", value: data.con_han_count, color: "#22c55e", sub: "Không hết hạn trong năm" }),
        el(KPICard, {
          label: "Sắp hết hạn", value: data.sap_het_han_count, color: "#f59e0b",
          sub: "Hết hạn trong năm, chưa hết",
          onClick: function () { R.navigate("/alerts"); }
        }),
        el(KPICard, { label: "Hết hạn", value: data.het_han_count, color: "#6b7280", sub: "Đã hết hạn trong năm" }),
        el(KPICard, { label: "Ký mới", value: data.ky_moi_count, color: "#8b5cf6", sub: "Ký mới trong năm" })
      ),

      // Alert rows
      el("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
        el(AlertRow, {
          title: "HĐ sắp hết hạn (" + (data.max_warn_days || 30) + " ngày)",
          items: expiryAlerts,
          color: "#f59e0b",
          emptyMsg: "Không có hợp đồng nào sắp hết hạn"
        }),
        el(AlertRow, {
          title: "SP sắp hết thầu (" + (data.max_qty_warn_days || 20) + " ngày)",
          items: quantityAlerts,
          color: "#dc2626",
          emptyMsg: "Không có sản phẩm nào sắp hết thầu"
        })
      )
    );
  }

  R.register("/dashboard", DashboardScreen);
})();
