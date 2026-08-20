(function () {
  const el = React.createElement;
  const { useState, useEffect, useCallback } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;

  function fmt(n) { return (n || 0).toLocaleString("vi-VN"); }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("vi-VN") : "—"; }
  function fmtMoney(n) { return n ? n.toLocaleString("vi-VN") + " đ" : "—"; }

  function statusBadge(daysRemaining) {
    if (daysRemaining === null || daysRemaining === undefined) return el("span", { className: "text-xs text-gray-400" }, "—");
    if (daysRemaining < 0) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#6b7280" } }, "Hết hạn");
    if (daysRemaining <= 15) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#dc2626" } }, daysRemaining + " ngày");
    if (daysRemaining <= 30) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#f59e0b" } }, daysRemaining + " ngày");
    return el("span", { className: "text-xs font-medium", style: { color: "#22c55e" } }, daysRemaining + " ngày");
  }

  function statusLabel(daysRemaining) {
    if (daysRemaining === null || daysRemaining === undefined) return "—";
    if (daysRemaining <= 0) return "Hết hạn";
    if (daysRemaining <= 30) return "Sắp hết hạn";
    return "Còn hạn";
  }

  function daysSupplyBadge(conLai, avgDaily) {
    if (!avgDaily || avgDaily <= 0) return el("span", { className: "text-xs text-gray-400" }, "—");
    const days = Math.floor(conLai / avgDaily);
    if (days <= 10) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#dc2626" } }, days + " ngày");
    if (days <= 20) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#f59e0b" } }, days + " ngày");
    return el("span", { className: "text-xs font-medium", style: { color: "#22c55e" } }, days + " ngày");
  }

  function ItemsModal({ maHd, onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [contractInfo, setContractInfo] = useState(null);

    useEffect(() => {
      api("contract-detail", { ma_hd: maHd })
        .then(res => {
          setItems(res.items || []);
          setContractInfo(res.contract || null);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [maHd]);

    useEffect(() => {
      function onKey(e) { if (e.key === "Escape") onClose(); }
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return el("div", {
      className: "fixed inset-0 z-50 flex items-center justify-center",
      style: { background: "rgba(0,0,0,0.5)" },
      onClick: e => { if (e.target === e.currentTarget) onClose(); }
    },
      el("div", {
        className: "bg-white rounded-xl shadow-2xl w-full max-h-[85vh] flex flex-col",
        style: { maxWidth: "960px", margin: "16px" }
      },
        // Header
        el("div", { className: "flex items-center justify-between px-5 py-3 border-b shrink-0", style: { borderColor: "#f0f2f5" } },
          el("div", null,
            el("h3", { className: "font-bold text-base", style: { color: "#1c1e21" } }, "Sản phẩm hợp đồng " + maHd),
            contractInfo && el("p", { className: "text-xs mt-0.5", style: { color: "#65676b" } },
              contractInfo.ten_kh + " · " + statusLabel(contractInfo.thoi_han ? Math.ceil((new Date(contractInfo.thoi_han) - new Date()) / 86400000) : null)
            )
          ),
          el("button", {
            onClick: onClose,
            className: "w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg",
            style: { color: "#65676b" }
          }, "✕")
        ),

        // Body
        el("div", { className: "overflow-auto flex-1" },
          loading
            ? el("div", { className: "text-center py-12 text-gray-400" }, "Đang tải...")
            : error
              ? el("div", { className: "text-center py-12 text-red-500" }, "Lỗi: " + error)
              : items.length === 0
                ? el("div", { className: "text-center py-12 text-gray-400" }, "Không có sản phẩm")
                : el("table", { className: "w-full text-sm" },
                    el("thead", null,
                      el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                        ["#", "Mã chung", "Mã NCC", "Đơn giá", "SL thầu", "SL bán", "SL thầu còn lại", "Cảnh báo"].map(h =>
                          el("th", {
                            key: h,
                            className: "px-3 py-2.5 text-left font-medium whitespace-nowrap sticky top-0",
                            style: { color: "#65676b", background: "#f8f9fa" }
                          }, h)
                        )
                      )
                    ),
                    el("tbody", null,
                      items.map((it, i) => {
                        const conLai = (it.so_luong_hd || 0) - (it.so_luong_da_ban || 0);
                        return el("tr", {
                          key: it.id || i,
                          className: "border-b hover:bg-gray-50",
                          style: { borderColor: "#f0f2f5" }
                        },
                          el("td", { className: "px-3 py-2 text-gray-400" }, i + 1),
                          el("td", { className: "px-3 py-2 whitespace-nowrap font-medium" }, it.ma_chung || "—"),
                          el("td", { className: "px-3 py-2 whitespace-nowrap" }, it.ma_ncc || "—"),
                          el("td", { className: "px-3 py-2 text-right whitespace-nowrap" }, fmtMoney(it.don_gia)),
                          el("td", { className: "px-3 py-2 text-right" }, fmt(it.so_luong_hd)),
                          el("td", { className: "px-3 py-2 text-right" }, fmt(it.so_luong_da_ban || 0)),
                          el("td", { className: "px-3 py-2 text-right font-medium" }, fmt(conLai)),
                          el("td", { className: "px-3 py-2 whitespace-nowrap" }, daysSupplyBadge(conLai, it.avg_daily_3m))
                        );
                      })
                    )
                  )
        ),

        // Footer
        el("div", { className: "px-5 py-2.5 border-t text-xs shrink-0", style: { borderColor: "#f0f2f5", color: "#65676b" } },
          "Tổng: " + items.length + " sản phẩm · Cảnh báo = SL thầu còn lại ÷ TB bán/ngày (3 tháng)"
        )
      )
    );
  }

  function ContractsScreen({ user }) {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filterMien, setFilterMien] = useState("");
    const [filterKhay, setFilterKhay] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [popupMaHd, setPopupMaHd] = useState(null);
    const PAGE_SIZE = 30;

    const load = useCallback(() => {
      setLoading(true);
      api("list-contracts", {
        search, mien: filterMien, khay: filterKhay, status: filterStatus,
        page, page_size: PAGE_SIZE
      })
        .then(res => { setContracts(res.data || []); setTotal(res.total || 0); })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [search, filterMien, filterKhay, filterStatus, page]);

    useEffect(() => { load(); }, [load]);

    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const khayOptions = [...new Set(contracts.map(c => c.khay).filter(Boolean))].sort();

    return el("div", { className: "space-y-4" },
      popupMaHd && el(ItemsModal, { maHd: popupMaHd, onClose: () => setPopupMaHd(null) }),

      // Filters
      el("div", { className: "bg-white rounded-xl shadow-sm p-4" },
        el("div", { className: "flex flex-wrap gap-3 items-end" },
          el("div", { className: "flex-1 min-w-[200px]" },
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Tìm kiếm"),
            el("input", {
              type: "text", placeholder: "Mã HĐ, số HĐ, tên KH...",
              value: search, onChange: e => { setSearch(e.target.value); setPage(1); },
              className: "w-full px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            })
          ),
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Miền"),
            el("select", {
              value: filterMien, onChange: e => { setFilterMien(e.target.value); setPage(1); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "" }, "Tất cả"),
              el("option", { value: "Miền Bắc" }, "Miền Bắc"),
              el("option", { value: "Miền Nam" }, "Miền Nam")
            )
          ),
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Khay"),
            el("select", {
              value: filterKhay, onChange: e => { setFilterKhay(e.target.value); setPage(1); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "" }, "Tất cả"),
              khayOptions.map(k => el("option", { key: k, value: k }, k))
            )
          ),
          el("div", null,
            el("label", { className: "text-xs font-medium block mb-1", style: { color: "#65676b" } }, "Trạng thái"),
            el("select", {
              value: filterStatus, onChange: e => { setFilterStatus(e.target.value); setPage(1); },
              className: "px-3 py-2 rounded-lg border text-sm", style: { borderColor: "#dadde1" }
            },
              el("option", { value: "all" }, "Tất cả"),
              el("option", { value: "active" }, "Còn hạn"),
              el("option", { value: "expired" }, "Hết hạn"),
              el("option", { value: "expiring" }, "Sắp hết hạn")
            )
          ),
        ),
        el("div", { className: "text-xs mt-2", style: { color: "#65676b" } },
          "Tổng: " + fmt(total) + " hợp đồng · Trang " + page + "/" + totalPages
        )
      ),

      // Table
      el("div", { className: "bg-white rounded-xl shadow-sm overflow-hidden" },
        el("div", { className: "overflow-x-auto" },
          el("table", { className: "w-full text-sm" },
            el("thead", null,
              el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                ["Mã HĐ", "Số HĐ", "Khách hàng", "Miền", "Ngày ký", "Thời hạn", "Còn lại", "PS", "SO"].map(h =>
                  el("th", { key: h, className: "px-3 py-2.5 text-left font-medium whitespace-nowrap", style: { color: "#65676b" } }, h)
                )
              )
            ),
            el("tbody", null,
              loading
                ? el("tr", null, el("td", { colSpan: 9, className: "text-center py-8 text-gray-400" }, "Đang tải..."))
                : error
                  ? el("tr", null, el("td", { colSpan: 9, className: "text-center py-8 text-red-500" }, "Lỗi: " + error))
                  : contracts.length === 0
                    ? el("tr", null, el("td", { colSpan: 9, className: "text-center py-8 text-gray-400" }, "Không có dữ liệu"))
                    : contracts.map(c =>
                        el("tr", {
                          key: c.ma_hd,
                          className: "border-b cursor-pointer hover:bg-blue-50 transition",
                          style: { borderColor: "#f0f2f5" },
                          onClick: () => R.navigate("/contract/" + encodeURIComponent(c.ma_hd))
                        },
                          el("td", {
                            className: "px-3 py-2.5 font-bold whitespace-nowrap cursor-pointer hover:underline",
                            style: { color: "#1877f2" },
                            onClick: e => { e.stopPropagation(); setPopupMaHd(c.ma_hd); }
                          }, c.ma_hd),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.so_hd || "—"),
                          el("td", { className: "px-3 py-2.5 max-w-[250px] truncate" }, c.ten_kh || "—"),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.mien || "—"),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, fmtDate(c.ngay_ky)),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, fmtDate(c.thoi_han)),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, statusBadge(c.days_remaining)),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.ten_ps || "—"),
                          el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.ten_so || "—"),
                        )
                      )
            )
          )
        ),

        // Pagination
        total > PAGE_SIZE && el("div", { className: "flex items-center justify-center gap-2 py-3 border-t", style: { borderColor: "#f0f2f5" } },
          el("button", {
            disabled: page <= 1, onClick: () => setPage(p => p - 1),
            className: "px-3 py-1 rounded border text-sm disabled:opacity-40", style: { borderColor: "#dadde1" }
          }, "Trước"),
          el("span", { className: "text-sm", style: { color: "#65676b" } }, page + " / " + totalPages),
          el("button", {
            disabled: page >= totalPages, onClick: () => setPage(p => p + 1),
            className: "px-3 py-1 rounded border text-sm disabled:opacity-40", style: { borderColor: "#dadde1" }
          }, "Sau"),
        )
      )
    );
  }

  R.register("/contracts", ContractsScreen);
})();
