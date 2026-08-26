(function () {
  const el = React.createElement;
  const { useState, useEffect, useCallback } = React;
  const { api } = window.CONTRACT_API;
  const R = window.CONTRACT_ROUTER;
  const F = window.CONTRACT_FILTERS;

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

  function daysSupplyBadge(conLai, avgDaily) {
    if (!avgDaily || avgDaily <= 0) return el("span", { className: "text-xs text-gray-400" }, "—");
    const days = Math.floor(conLai / avgDaily);
    if (days <= 10) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#dc2626" } }, days + " ngày");
    if (days <= 20) return el("span", { className: "px-2 py-0.5 rounded-full text-xs font-medium text-white", style: { background: "#f59e0b" } }, days + " ngày");
    return el("span", { className: "text-xs font-medium", style: { color: "#22c55e" } }, days + " ngày");
  }

  function progressBar(conLai, total) {
    if (!total || total <= 0) return el("span", { className: "text-xs text-gray-400" }, "—");
    var pct = Math.min(100, Math.max(0, ((total - conLai) / total) * 100));
    var color = pct >= 90 ? "#dc2626" : pct >= 70 ? "#f59e0b" : "#22c55e";
    return el("div", { className: "flex items-center gap-1.5", style: { minWidth: "90px" } },
      el("div", { style: { flex: 1, height: "5px", borderRadius: "3px", background: "#f0f2f5" } },
        el("div", { style: { height: "5px", borderRadius: "3px", width: Math.round(pct) + "%", background: color } })
      ),
      el("span", { className: "text-xs font-medium whitespace-nowrap", style: { color } }, Math.round(pct) + "%")
    );
  }

  function ExpandedRow({ maHd, colSpan }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      api("contract-detail", { ma_hd: maHd })
        .then(res => {
          var sorted = (res.items || []).slice().sort(function (a, b) {
            var ta = a.so_luong_hd > 0 ? (a.so_luong_hd - (a.so_luong_con_lai || 0)) / a.so_luong_hd : 0;
            var tb = b.so_luong_hd > 0 ? (b.so_luong_hd - (b.so_luong_con_lai || 0)) / b.so_luong_hd : 0;
            if (tb !== ta) return tb - ta;
            return (a.ma_ncc || "").localeCompare(b.ma_ncc || "");
          });
          setItems(sorted);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [maHd]);

    return el("tr", null,
      el("td", { colSpan, className: "p-0" },
        el("div", { style: { background: "#f8f9fb", borderBottom: "2px solid #e5e7eb", padding: "8px 12px 8px 32px" } },
          loading
            ? el("div", { className: "text-center py-4 text-gray-400 text-xs" }, "Đang tải sản phẩm...")
            : error
              ? el("div", { className: "text-center py-4 text-red-500 text-xs" }, "Lỗi: " + error)
              : items.length === 0
                ? el("div", { className: "text-center py-4 text-gray-400 text-xs" }, "Không có sản phẩm")
                : el("table", { className: "w-full text-xs" },
                    el("thead", null,
                      el("tr", { style: { borderBottom: "1px solid #e5e7eb" } },
                        ["#", "Mã chung", "Mã NCC", "Tên hàng hóa", "Đơn giá", "SL thầu", "SL bán", "Còn lại", "Tiến độ", "Cảnh báo"].map(h =>
                          el("th", {
                            key: h,
                            className: "px-2 py-1.5 font-medium whitespace-nowrap " +
                              (["#", "Đơn giá", "SL thầu", "SL bán", "Còn lại"].includes(h) ? "text-center" : "text-left"),
                            style: { color: "#65676b" }
                          }, h)
                        )
                      )
                    ),
                    el("tbody", null,
                      items.map((it, i) => {
                        const conLai = it.so_luong_con_lai || 0;
                        return el("tr", {
                          key: it.id || i,
                          style: { borderBottom: "1px solid #f0f2f5" }
                        },
                          el("td", { className: "px-2 py-1.5 text-center text-gray-400" }, i + 1),
                          el("td", { className: "px-2 py-1.5 whitespace-nowrap font-medium" }, it.ma_chung || "—"),
                          el("td", { className: "px-2 py-1.5 whitespace-nowrap" }, it.ma_ncc || "—"),
                          el("td", { className: "px-2 py-1.5 max-w-[220px] truncate" }, it.ten_hang_hoa || "—"),
                          el("td", { className: "px-2 py-1.5 text-center whitespace-nowrap" }, fmtMoney(it.don_gia)),
                          el("td", { className: "px-2 py-1.5 text-center" }, fmt(it.so_luong_hd)),
                          el("td", { className: "px-2 py-1.5 text-center" }, fmt(it.so_luong_da_ban || 0)),
                          el("td", { className: "px-2 py-1.5 text-center font-medium" }, it.is_bv_tu ? "—" : fmt(conLai)),
                          el("td", { className: "px-2 py-1.5" }, it.is_bv_tu ? el("span", { className: "text-gray-400" }, "—") : progressBar(conLai, it.so_luong_hd)),
                          el("td", { className: "px-2 py-1.5 whitespace-nowrap" }, it.is_bv_tu ? "—" : daysSupplyBadge(conLai, it.avg_daily_3m))
                        );
                      })
                    )
                  ),
          items.length > 0 && !loading && el("div", { className: "text-xs mt-1", style: { color: "#9ca3af" } },
            items.length + " sản phẩm · Cảnh báo = SL còn lại ÷ TB bán/ngày (3 tháng)"
          )
        )
      )
    );
  }

  function ContractsScreen({ user }) {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const filters = F.useFilters();
    const [filterStatus, setFilterStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [buOptions, setBuOptions] = useState([]);
    const [nhomSpOptions, setNhomSpOptions] = useState([]);
    const [expandedSet, setExpandedSet] = useState({});
    const [mienTab, setMienTab] = useState("Miền Bắc");
    const [kpiBac, setKpiBac] = useState(null);
    const [kpiNam, setKpiNam] = useState(null);
    const PAGE_SIZE = 30;

    useEffect(() => {
      api("dashboard-summary", { bu: filters.bu, mien: "Miền Bắc", nhom_sp: filters.nhom_sp })
        .then(res => setKpiBac(res)).catch(() => {});
      api("dashboard-summary", { bu: filters.bu, mien: "Miền Nam", nhom_sp: filters.nhom_sp })
        .then(res => setKpiNam(res)).catch(() => {});
    }, [filters.bu, filters.nhom_sp]);

    const kpi = mienTab === "Miền Bắc" ? kpiBac : kpiNam;

    const load = useCallback(() => {
      setLoading(true);
      api("list-contracts", {
        search, bu: filters.bu, mien: mienTab, nhom_sp: filters.nhom_sp, status: filterStatus,
        page, page_size: PAGE_SIZE
      })
        .then(res => {
          setContracts(res.data || []); setTotal(res.total || 0);
          if (res.bu_list) setBuOptions(res.bu_list);
          if (res.nhom_sp_list) setNhomSpOptions(res.nhom_sp_list);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, [search, filters.bu, mienTab, filters.nhom_sp, filterStatus, page]);

    useEffect(() => { load(); }, [load]);

    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

    function toggleExpand(maHd) {
      setExpandedSet(prev => {
        const next = Object.assign({}, prev);
        if (next[maHd]) delete next[maHd]; else next[maHd] = true;
        return next;
      });
    }

    return el("div", { className: "space-y-4" },

      // KPI cards
      kpi && el("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" },
        [
          { key: "all", label: "Tổng hợp đồng", value: kpi.total_contracts, color: "#1877f2", sub: "Năm tài chính " + (kpi.fy_label || "") },
          { key: "con_han", label: "Còn hạn", value: kpi.con_han_count, color: "#22c55e", sub: "Không hết hạn trong năm" },
          { key: "sap_het", label: "Sắp hết hạn", value: kpi.sap_het_han_count, color: "#f59e0b", sub: "Hết hạn trong năm, chưa hết" },
          { key: "het_han", label: "Hết hạn", value: kpi.het_han_count, color: "#6b7280", sub: "Đã hết hạn trong năm" },
          { key: "ky_moi", label: "Ký mới", value: kpi.ky_moi_count, color: "#8b5cf6", sub: "Ký mới trong năm" },
        ].map(c => {
          const active = filterStatus === c.key;
          return el("div", {
            key: c.key,
            className: "bg-white rounded-xl shadow-sm p-4 cursor-pointer transition",
            style: {
              borderLeft: "4px solid " + c.color,
              outline: active ? "2px solid " + c.color : "none",
              outlineOffset: "-1px",
              opacity: filterStatus !== "all" && !active ? 0.5 : 1,
            },
            onClick: () => { setFilterStatus(active && c.key !== "all" ? "all" : c.key); setPage(1); setExpandedSet({}); }
          },
            el("div", { className: "text-xs font-medium", style: { color: "#65676b" } }, c.label),
            el("div", { className: "text-2xl font-bold mt-0.5", style: { color: c.color } }, fmt(c.value)),
            el("div", { className: "text-xs mt-0.5", style: { color: "#9ca3af" } }, c.sub)
          );
        })
      ),

      // Compact filter bar
      el("div", { className: "bg-white rounded-xl shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-3" },
        el("span", { className: "text-xs font-semibold uppercase", style: { color: "#9ca3af", letterSpacing: "0.05em" } }, "Lọc"),
        el("select", {
          value: filters.bu, onChange: e => { F.set({ bu: e.target.value }); setPage(1); },
          className: "px-2.5 py-1.5 rounded-lg border text-xs", style: { borderColor: "#dadde1" }
        },
          el("option", { value: "" }, "BU: tất cả"),
          buOptions.map(k => el("option", { key: k, value: k }, k))
        ),
        el("select", {
          value: filters.nhom_sp, onChange: e => { F.set({ nhom_sp: e.target.value }); setPage(1); },
          className: "px-2.5 py-1.5 rounded-lg border text-xs", style: { borderColor: "#dadde1" }
        },
          el("option", { value: "" }, "Nhóm SP: tất cả"),
          nhomSpOptions.map(k => el("option", { key: k, value: k }, k))
        ),
        el("div", { style: { flex: 1 } }),
        el("input", {
          type: "text", placeholder: "Tìm KH, sản phẩm, mã HĐ...",
          value: search, onChange: e => { setSearch(e.target.value); setPage(1); },
          className: "px-3 py-1.5 rounded-lg border text-xs", style: { borderColor: "#dadde1", width: "220px" }
        })
      ),

      // Table
      el("div", { className: "bg-white rounded-xl shadow-sm overflow-hidden" },
        el("div", { className: "flex border-b", style: { borderColor: "#dadde1" } },
          [{ m: "Miền Bắc", kd: kpiBac }, { m: "Miền Nam", kd: kpiNam }].map(({ m, kd }) =>
            el("button", {
              key: m,
              onClick: () => { setMienTab(m); setPage(1); setExpandedSet({}); },
              className: "px-5 py-2.5 text-sm font-medium relative transition-colors",
              style: {
                color: mienTab === m ? "#1877f2" : "#65676b",
                background: "transparent",
                border: "none",
                borderBottom: mienTab === m ? "2px solid #1877f2" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: "-1px"
              }
            }, m, kd && el("span", {
              className: "ml-1.5 text-xs font-normal",
              style: { color: mienTab === m ? "#1877f2" : "#9ca3af" }
            }, "(" + fmt(kd.total_contracts) + ")"))
          )
        ),
        el("div", { className: "overflow-x-auto" },
          el("table", { className: "w-full text-sm" },
            el("thead", null,
              el("tr", { style: { background: "#f8f9fa", borderBottom: "1px solid #dadde1" } },
                el("th", { className: "w-8", style: { color: "#65676b" } }),
                ["Mã HĐ", "Số HĐ", "Mã KH", "Khách hàng", "Ngày ký", "Thời hạn", "Còn lại", "PS", "SO"].map(h =>
                  el("th", {
                    key: h,
                    className: "px-3 py-2.5 font-medium whitespace-nowrap " +
                      (["Ngày ký", "Thời hạn", "Còn lại"].includes(h) ? "text-center" : "text-left"),
                    style: { color: "#65676b" }
                  }, h)
                )
              )
            ),
            el("tbody", null,
              loading
                ? el("tr", null, el("td", { colSpan: 10, className: "text-center py-8 text-gray-400" }, "Đang tải..."))
                : error
                  ? el("tr", null, el("td", { colSpan: 10, className: "text-center py-8 text-red-500" }, "Lỗi: " + error))
                  : contracts.length === 0
                    ? el("tr", null, el("td", { colSpan: 10, className: "text-center py-8 text-gray-400" }, "Không có dữ liệu"))
                    : contracts.flatMap(c => {
                        const isOpen = !!expandedSet[c.ma_hd];
                        return [
                          el("tr", {
                            key: c.ma_hd,
                            className: "border-b hover:bg-gray-50 transition cursor-pointer" + (isOpen ? " bg-blue-50" : ""),
                            style: { borderColor: isOpen ? "#dbeafe" : "#f0f2f5" },
                            onClick: () => toggleExpand(c.ma_hd)
                          },
                            el("td", { className: "pl-2 pr-0 py-2.5 text-center" },
                              el("span", {
                                style: { display: "inline-block", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", color: "#9ca3af", fontSize: "14px" }
                              }, "▶")
                            ),
                            el("td", {
                              className: "px-3 py-2.5 font-bold whitespace-nowrap",
                              style: { color: "#1877f2" }
                            }, c.ma_hd),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.so_hd || "—"),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.ma_kh || "—"),
                            el("td", { className: "px-3 py-2.5 max-w-[250px] truncate" }, c.ten_kh || "—"),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap text-center" }, fmtDate(c.ngay_ky)),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap text-center" }, fmtDate(c.thoi_han)),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap text-center" }, statusBadge(c.days_remaining)),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.ten_ps || "—"),
                            el("td", { className: "px-3 py-2.5 whitespace-nowrap" }, c.ten_so || "—"),
                          ),
                          isOpen && el(ExpandedRow, { key: c.ma_hd + "-items", maHd: c.ma_hd, colSpan: 10 })
                        ];
                      })
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
