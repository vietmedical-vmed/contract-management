(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;
  const F = window.CONTRACT_FILTERS;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }

  function SectionHeader({ title, color }) {
    return el("h3", { className: "font-semibold mb-3 flex items-center gap-2 text-sm", style: { color: "#1c1e21" } },
      el("span", { className: "w-2 h-2 rounded-full inline-block shrink-0", style: { background: color } }),
      title
    );
  }

  function ExpiryTable({ alerts, title, emptyMsg }) {
    return el("div", null,
      el(SectionHeader, { title: title, color: "#f59e0b" }),
      alerts.length === 0
        ? el("p", { className: "text-sm", style: { color: "#65676b" } }, emptyMsg)
        : el("div", { className: "overflow-x-auto", style: { margin: "0 -4px" } },
            el("table", { className: "w-full text-xs", style: { borderCollapse: "collapse" } },
              el("thead", null,
                el("tr", { style: { borderBottom: "1px solid #e5e7eb" } },
                  el("th", { className: "text-left py-2 px-2 font-medium", style: { color: "#9ca3af" } }, "Số HĐ"),
                  el("th", { className: "text-left py-2 px-2 font-medium", style: { color: "#9ca3af" } }, "Khách hàng"),
                  el("th", { className: "text-right py-2 px-2 font-medium", style: { color: "#9ca3af", whiteSpace: "nowrap" } }, "Còn lại")
                )
              ),
              el("tbody", null,
                alerts.map(function (a, i) {
                  var badgeBg = a.days_remaining <= 7 ? "#dc2626" : a.days_remaining <= 15 ? "#f59e0b" : "#6b7280";
                  return el("tr", { key: i, style: { borderBottom: "1px solid #f3f4f6" } },
                    el("td", { className: "py-2 px-2 font-medium whitespace-nowrap", style: { color: "#1c1e21", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" } }, a.so_hd || a.ma_hd),
                    el("td", { className: "py-2 px-2", style: { color: "#65676b", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, a.ten_kh),
                    el("td", { className: "py-2 px-2 text-right whitespace-nowrap" },
                      el("span", {
                        className: "inline-block px-2 py-0.5 rounded-full text-white font-medium",
                        style: { background: badgeBg, fontSize: "11px" }
                      }, a.days_remaining + " ngày")
                    )
                  );
                })
              )
            )
          )
    );
  }

  function QuantityTable({ alerts, title, emptyMsg }) {
    return el("div", null,
      el(SectionHeader, { title: title, color: "#dc2626" }),
      alerts.length === 0
        ? el("p", { className: "text-sm", style: { color: "#65676b" } }, emptyMsg)
        : el("div", { className: "space-y-3" },
            alerts.map(function (a, i) {
              var slHd = a.so_luong_hd || 1;
              var conLai = a.so_luong_con_lai || 0;
              var daBan = slHd - conLai;
              var pct = Math.min(Math.round((daBan / slHd) * 100), 100);
              var badgeBg = pct >= 90 ? "#dc2626" : pct >= 70 ? "#f59e0b" : "#3b82f6";
              return el("div", { key: i, style: { padding: "8px 0", borderBottom: i < alerts.length - 1 ? "1px solid #f3f4f6" : "none" } },
                el("div", { className: "flex items-start justify-between gap-2" },
                  el("div", { style: { minWidth: 0, flex: 1 } },
                    el("div", { className: "font-medium text-xs", style: { color: "#1c1e21", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, a.ten_hang_hoa),
                    el("div", { className: "text-xs mt-0.5", style: { color: "#9ca3af" } }, (a.so_hd || a.ma_hd))
                  ),
                  el("div", { className: "shrink-0 flex flex-col items-end gap-0.5" },
                    el("span", {
                      className: "px-2 py-0.5 rounded-full text-white font-medium",
                      style: { background: badgeBg, fontSize: "11px", whiteSpace: "nowrap" }
                    }, pct + "%"),
                    el("span", { className: "text-xs", style: { color: "#9ca3af" } }, "còn " + fmt(conLai) + "/" + fmt(slHd))
                  )
                )
              );
            })
          )
    );
  }

  function DashboardScreen({ user }) {
    const [dataBac, setDataBac] = useState(null);
    const [dataNam, setDataNam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const filters = F.useFilters();
    const [mienTab, setMienTab] = useState("Miền Bắc");

    useEffect(function () {
      setLoading(true);
      Promise.all([
        api("dashboard-summary", { bu: filters.bu, mien: "Miền Bắc", nhom_sp: filters.nhom_sp }),
        api("dashboard-summary", { bu: filters.bu, mien: "Miền Nam", nhom_sp: filters.nhom_sp })
      ])
        .then(function (res) { setDataBac(res[0]); setDataNam(res[1]); })
        .catch(function (err) { setError(err.message); })
        .finally(function () { setLoading(false); });
    }, [filters.bu, filters.nhom_sp]);

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải dữ liệu...");
    if (error) return el("div", { className: "text-center py-20" },
      el("p", { className: "text-red-500 mb-2" }, "Lỗi: " + error),
      el("button", {
        onClick: function () { window.location.reload(); },
        className: "px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
      }, "Thử lại")
    );

    var data = mienTab === "Miền Bắc" ? dataBac : dataNam;
    if (!data) return null;

    var expiryAlerts = data.expiry_alerts || [];
    var quantityAlerts = data.quantity_alerts || [];

    return el("div", { className: "space-y-4" },
      // KPI cards
      el("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" },
        [
          { label: "Tổng hợp đồng", value: data.total_contracts, color: "#1877f2", sub: "Năm tài chính " + (data.fy_label || "") },
          { label: "Còn hạn", value: data.con_han_count, color: "#22c55e", sub: "Không hết hạn trong năm" },
          { label: "Sắp hết hạn", value: data.sap_het_han_count, color: "#f59e0b", sub: "Hết hạn trong năm, chưa hết", onClick: function () { R.navigate("/contracts"); } },
          { label: "Hết hạn", value: data.het_han_count, color: "#6b7280", sub: "Đã hết hạn trong năm" },
          { label: "Ký mới", value: data.ky_moi_count, color: "#8b5cf6", sub: "Ký mới trong năm" },
        ].map(function (c) {
          return el("div", {
            key: c.label,
            className: "bg-white rounded-xl shadow-sm p-4" + (c.onClick ? " cursor-pointer hover:shadow-md" : "") + " transition",
            style: { borderLeft: "4px solid " + c.color },
            onClick: c.onClick
          },
            el("div", { className: "text-xs font-medium", style: { color: "#65676b" } }, c.label),
            el("div", { className: "text-2xl font-bold mt-0.5", style: { color: c.color } }, fmt(c.value)),
            el("div", { className: "text-xs mt-0.5", style: { color: "#9ca3af" } }, c.sub)
          );
        })
      ),

      // Miền tabs + Alert rows
      el("div", { className: "bg-white rounded-xl shadow-sm overflow-hidden" },
        el("div", { className: "flex border-b", style: { borderColor: "#dadde1" } },
          [{ m: "Miền Bắc", kd: dataBac }, { m: "Miền Nam", kd: dataNam }].map(function (t) {
            return el("button", {
              key: t.m,
              onClick: function () { setMienTab(t.m); },
              className: "px-5 py-2.5 text-sm font-medium relative transition-colors",
              style: {
                color: mienTab === t.m ? "#1877f2" : "#65676b",
                background: "transparent",
                border: "none",
                borderBottom: mienTab === t.m ? "2px solid #1877f2" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: "-1px"
              }
            }, t.m, t.kd && el("span", {
              className: "ml-1.5 text-xs font-normal",
              style: { color: mienTab === t.m ? "#1877f2" : "#9ca3af" }
            }, "(" + fmt(t.kd.total_contracts) + ")"));
          })
        ),
        el("div", { className: "p-5" },
          el("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6" },
            el(ExpiryTable, {
              title: "HĐ sắp hết hạn (" + (data.max_warn_days || 30) + " ngày)",
              alerts: expiryAlerts,
              emptyMsg: "Không có hợp đồng nào sắp hết hạn"
            }),
            el(QuantityTable, {
              title: "SP sắp hết thầu (" + (data.max_qty_warn_days || 20) + " ngày)",
              alerts: quantityAlerts,
              emptyMsg: "Không có sản phẩm nào sắp hết thầu"
            })
          )
        )
      )
    );
  }

  R.register("/dashboard", DashboardScreen);
})();
