(function () {
  const el = React.createElement;
  const { useState, useEffect } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("vi-VN") : "—"; }
  function fmtMoney(n) { return n ? n.toLocaleString("vi-VN") + " đ" : "—"; }

  function InfoRow({ label, value }) {
    return el("div", { className: "flex gap-2 py-1.5 border-b last:border-0", style: { borderColor: "#f0f2f5" } },
      el("span", { className: "text-sm font-medium w-32 shrink-0", style: { color: "#65676b" } }, label),
      el("span", { className: "text-sm", style: { color: "#1c1e21" } }, value || "—")
    );
  }

  function ProgressBar({ current, total }) {
    if (!total || total <= 0) return el("span", { className: "text-xs text-gray-400" }, "—");
    const pct = Math.min(100, Math.max(0, ((total - current) / total) * 100));
    const color = pct >= 90 ? "#dc2626" : pct >= 70 ? "#f59e0b" : "#22c55e";
    return el("div", { className: "flex items-center gap-2" },
      el("div", { className: "flex-1 h-2 rounded-full", style: { background: "#f0f2f5" } },
        el("div", { className: "h-2 rounded-full transition-all", style: { width: pct + "%", background: color } })
      ),
      el("span", { className: "text-xs font-medium whitespace-nowrap", style: { color } }, Math.round(pct) + "%")
    );
  }

  function ContractDetailScreen({ user }) {
    const path = R.useRoute();
    const maHd = decodeURIComponent(path.replace("/contract/", ""));
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      if (!maHd) return;
      setLoading(true);
      api("contract-detail", { ma_hd: maHd })
        .then(res => setData(res))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [maHd]);

    if (loading) return el("div", { className: "text-center py-20 text-gray-400" }, "Đang tải...");
    if (error) return el("div", { className: "text-center py-20 text-red-500" }, "Lỗi: " + error);
    if (!data) return null;

    const c = data.contract || {};
    const items = data.items || [];
    const daysRemaining = c.thoi_han ? Math.ceil((new Date(c.thoi_han) - new Date()) / 86400000) : null;

    return el("div", { className: "space-y-6" },
      // Back button
      el("button", {
        onClick: () => R.navigate("/contracts"),
        className: "text-sm font-medium flex items-center gap-1", style: { color: "#1877f2" }
      }, "← Quay lại danh sách"),

      // Contract header card
      el("div", { className: "bg-white rounded-xl shadow-sm p-5" },
        el("div", { className: "flex items-start justify-between mb-4" },
          el("div", null,
            el("h2", { className: "text-lg font-bold", style: { color: "#1c1e21" } }, c.ma_hd),
            el("p", { className: "text-sm", style: { color: "#65676b" } }, c.so_hd)
          ),
          daysRemaining !== null && el("div", {
            className: "px-3 py-1.5 rounded-lg text-sm font-semibold text-white",
            style: { background: daysRemaining < 0 ? "#6b7280" : daysRemaining <= 15 ? "#dc2626" : daysRemaining <= 30 ? "#f59e0b" : "#22c55e" }
          }, daysRemaining < 0 ? "Đã hết hạn" : "Còn " + daysRemaining + " ngày")
        ),
        el("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-8" },
          el(InfoRow, { label: "Khách hàng", value: c.ten_kh }),
          el(InfoRow, { label: "Mã KH", value: c.ma_kh }),
          el(InfoRow, { label: "Miền", value: c.mien }),
          el(InfoRow, { label: "Khay", value: c.khay }),
          el(InfoRow, { label: "Ngày ký", value: fmtDate(c.ngay_ky) }),
          el(InfoRow, { label: "Thời hạn", value: fmtDate(c.thoi_han) }),
          el(InfoRow, { label: "PS", value: c.ten_ps }),
          el(InfoRow, { label: "SO", value: c.ten_so }),
          el(InfoRow, { label: "Số báo giá", value: c.so_bao_gia }),
          el(InfoRow, { label: "Số gói thầu", value: c.so_goi_thau }),
        )
      ),

      // Items table
      el("div", { className: "bg-white rounded-xl shadow-sm overflow-hidden" },
        el("div", { className: "px-5 py-3 border-b flex items-center justify-between", style: { borderColor: "#f0f2f5" } },
          el("h3", { className: "font-semibold", style: { color: "#1c1e21" } }, "Danh sách sản phẩm (" + items.length + ")"),
        ),
        el("div", { className: "overflow-x-auto" },
          el("table", { className: "w-full text-sm" },
            el("thead", null,
              el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                ["#", "Mã chung", "Mã NCC", "Tên hàng hóa", "SL HĐ", "Đã bán", "Còn lại", "Tiến độ", "Đơn giá", "Tổng tiền"].map(h =>
                  el("th", {
                    key: h,
                    className: "px-3 py-2.5 font-medium whitespace-nowrap " +
                      (["#", "SL HĐ", "Đã bán", "Còn lại", "Đơn giá", "Tổng tiền"].includes(h) ? "text-center" : "text-left"),
                    style: { color: "#65676b" }
                  }, h)
                )
              )
            ),
            el("tbody", null,
              items.length === 0
                ? el("tr", null, el("td", { colSpan: 10, className: "text-center py-8 text-gray-400" }, "Không có sản phẩm"))
                : items.map((it, i) => {
                    const conLai = it.so_luong_con_lai || 0;
                    return el("tr", { key: it.id || i, className: "border-b", style: { borderColor: "#f0f2f5" } },
                      el("td", { className: "px-3 py-2.5 text-center text-gray-400" }, i + 1),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap font-medium" }, it.ma_chung || "—"),
                      el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, it.ma_ncc || "—"),
                      el("td", { className: "px-3 py-2.5 max-w-[300px]" }, it.ten_hang_hoa || "—"),
                      el("td", { className: "px-3 py-2.5 text-center" }, fmt(it.so_luong_hd)),
                      el("td", { className: "px-3 py-2.5 text-center" }, fmt(it.so_luong_da_ban || 0)),
                      el("td", { className: "px-3 py-2.5 text-center font-medium" }, it.is_bv_tu ? "—" : fmt(conLai)),
                      el("td", { className: "px-3 py-2.5 min-w-[120px]" }, it.is_bv_tu ? el("span", { className: "text-gray-400" }, "—") : el(ProgressBar, { current: conLai, total: it.so_luong_hd })),
                      el("td", { className: "px-3 py-2.5 text-center whitespace-nowrap" }, fmtMoney(it.don_gia)),
                      el("td", { className: "px-3 py-2.5 text-center whitespace-nowrap" }, fmtMoney(it.tong_tien)),
                    );
                  })
            )
          )
        )
      )
    );
  }

  R.register("/contract", ContractDetailScreen);
})();
