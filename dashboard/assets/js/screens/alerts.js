(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("vi-VN") : "—"; }

  function AlertsScreen({ user }) {
    const [tab, setTab] = useState("expiry");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      setLoading(true);
      api("get-alerts", {})
        .then(res => setData(res))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, []);

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải cảnh báo...");
    if (error) return el("div", { className: "text-center py-20 text-red-500" }, "Lỗi: " + error);
    if (!data) return null;

    const expiry = data.expiry || [];
    const quantity = data.quantity || [];

    function urgencyBadge(level) {
      const bg = level === "critical" ? "#dc2626" : "#f59e0b";
      const label = level === "critical" ? "Khẩn cấp" : "Cảnh báo";
      return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: bg } }, label);
    }

    return el("div", { className: "space-y-4" },
      // Tabs
      el("div", { className: "bg-white rounded-xl shadow-sm" },
        el("div", { className: "flex border-b", style: { borderColor: "#dadde1" } },
          el("button", {
            onClick: () => setTab("expiry"),
            className: "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition " +
              (tab === "expiry" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500")
          }, "Hết hạn HĐ (" + expiry.length + ")"),
          el("button", {
            onClick: () => setTab("quantity"),
            className: "flex-1 px-4 py-3 text-sm font-medium border-b-2 transition " +
              (tab === "quantity" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500")
          }, "Hết thầu SP (" + quantity.length + ")")
        ),

        // Expiry tab
        tab === "expiry" && el("div", { className: "overflow-x-auto" },
          expiry.length === 0
            ? el("p", { className: "text-center py-8 text-gray-400" }, "Không có hợp đồng nào sắp hết hạn")
            : el("table", { className: "w-full text-sm" },
                el("thead", null,
                  el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                    ["Mức độ", "Mã HĐ", "Số HĐ", "Khách hàng", "Miền", "Thời hạn", "Còn lại", "PS"].map(h =>
                      el("th", { key: h, className: "px-3 py-2.5 text-left font-medium whitespace-nowrap", style: { color: "#65676b" } }, h)
                    )
                  )
                ),
                el("tbody", null,
                  expiry.map((a, i) =>
                    el("tr", {
                      key: i,
                      className: "border-b hover:bg-gray-50",
                      style: { borderColor: "#f0f2f5" }
                    },
                      el("td", { className: "px-3 py-2.5" }, urgencyBadge(a.level)),
                      el("td", {
                        className: "px-3 py-2.5 font-bold whitespace-nowrap cursor-pointer hover:underline",
                        style: { color: "#1877f2" },
                        onClick: () => R.navigate("/contract/" + encodeURIComponent(a.ma_hd))
                      }, a.ma_hd),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, a.so_hd || "—"),
                      el("td", { className: "px-3 py-2.5 max-w-[250px] truncate" }, a.ten_kh || "—"),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, a.mien || "—"),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, fmtDate(a.thoi_han)),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap font-semibold",
                        style: { color: a.days_remaining <= 15 ? "#dc2626" : "#f59e0b" }
                      }, a.days_remaining + " ngày"),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, a.ten_ps || "—"),
                    )
                  )
                )
              )
        ),

        // Quantity tab
        tab === "quantity" && el("div", { className: "overflow-x-auto" },
          quantity.length === 0
            ? el("p", { className: "text-center py-8 text-gray-400" }, "Không có sản phẩm nào sắp hết thầu")
            : el("table", { className: "w-full text-sm" },
                el("thead", null,
                  el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                    ["Mức độ", "Mã HĐ", "Khách hàng", "Mã NCC", "Tên hàng hóa", "SL HĐ", "Đã bán", "Còn lại", "TB ngày", "Đủ ~ngày"].map(h =>
                      el("th", { key: h, className: "px-3 py-2.5 text-left font-medium whitespace-nowrap", style: { color: "#65676b" } }, h)
                    )
                  )
                ),
                el("tbody", null,
                  quantity.map((a, i) =>
                    el("tr", {
                      key: i,
                      className: "border-b hover:bg-gray-50",
                      style: { borderColor: "#f0f2f5" }
                    },
                      el("td", { className: "px-3 py-2.5" }, urgencyBadge(a.level)),
                      el("td", {
                        className: "px-3 py-2.5 font-bold whitespace-nowrap cursor-pointer hover:underline",
                        style: { color: "#1877f2" },
                        onClick: () => R.navigate("/contract/" + encodeURIComponent(a.ma_hd))
                      }, a.ma_hd),
                      el("td", { className: "px-3 py-2.5 max-w-[200px] truncate" }, a.ten_kh || "—"),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, a.ma_ncc || "—"),
                      el("td", { className: "px-3 py-2.5 max-w-[200px] truncate" }, a.ten_hang_hoa || "—"),
                      el("td", { className: "px-3 py-2.5 text-right" }, fmt(a.so_luong_hd)),
                      el("td", { className: "px-3 py-2.5 text-right" }, fmt(a.so_luong_da_ban)),
                      el("td", { className: "px-3 py-2.5 text-right font-semibold",
                        style: { color: a.so_luong_con_lai <= 0 ? "#dc2626" : "#1c1e21" }
                      }, fmt(a.so_luong_con_lai)),
                      el("td", { className: "px-3 py-2.5 text-right" }, (a.avg_daily_3m || 0).toFixed(1)),
                      el("td", { className: "px-3 py-2.5 text-right font-semibold",
                        style: { color: a.days_supply <= 10 ? "#dc2626" : "#f59e0b" }
                      }, (a.days_supply || 0) + " ngày"),
                    )
                  )
                )
              )
        )
      )
    );
  }

  R.register("/alerts", AlertsScreen);
})();
