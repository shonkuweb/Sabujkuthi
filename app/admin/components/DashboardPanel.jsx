"use client";

import { useEffect, useState } from "react";
import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiCalendar,
  FiDollarSign,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
  FiUserCheck,
  FiUsers
} from "react-icons/fi";
import styles from "./DashboardPanel.module.css";

export default function DashboardPanel({ active }) {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMetric, setActiveMetric] = useState("revenue"); // 'revenue' | 'sales' | 'visitors' | 'accounts'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const loadData = async (targetPeriod = period) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboard?period=${encodeURIComponent(targetPeriod)}`, {
        cache: "no-store",
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || "Failed to load dashboard insights");
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      loadData(period);
    }
  }, [active, period]);

  const series = data?.series || [];
  const summary = data?.summary || {
    totalRevenue: 0,
    totalSales: 0,
    totalAccounts: 0,
    totalVisitors: 0,
  };

  // Compute SVG chart coordinates
  const chartHeight = 220;
  const chartWidth = 700;
  const paddingX = 40;
  const paddingY = 24;

  const getMetricValue = (item) => {
    if (!item) return 0;
    if (activeMetric === "revenue") return item.revenue || 0;
    if (activeMetric === "sales") return item.sales || 0;
    if (activeMetric === "visitors") return item.visitors || 0;
    return item.accounts || 0;
  };

  const values = series.map(getMetricValue);
  const maxValue = Math.max(10, ...values);
  const pointsCount = Math.max(1, series.length);

  const getX = (index) => {
    if (pointsCount <= 1) return paddingX;
    return paddingX + (index / (pointsCount - 1)) * (chartWidth - paddingX * 2);
  };

  const getY = (val) => {
    const usableHeight = chartHeight - paddingY * 2;
    return chartHeight - paddingY - (val / maxValue) * usableHeight;
  };

  // Generate SVG path for smooth line and area fill
  const pathPoints = series.map((item, idx) => ({
    x: getX(idx),
    y: getY(getMetricValue(item)),
    data: item,
  }));

  const linePathD = pathPoints.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const prev = pathPoints[index - 1];
    const cpX1 = prev.x + (point.x - prev.x) / 2;
    const cpX2 = prev.x + (point.x - prev.x) / 2;
    return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${point.y}, ${point.x} ${point.y}`;
  }, "");

  const areaPathD = pathPoints.length > 0
    ? `${linePathD} L ${pathPoints[pathPoints.length - 1].x} ${chartHeight - paddingY} L ${pathPoints[0].x} ${chartHeight - paddingY} Z`
    : "";

  const metricColors = {
    revenue: { stroke: "#26784a", fill: "rgba(38, 120, 74, 0.15)", unit: "₹" },
    sales: { stroke: "#0d9488", fill: "rgba(13, 148, 136, 0.15)", unit: "" },
    visitors: { stroke: "#2563eb", fill: "rgba(37, 99, 235, 0.12)", unit: "" },
    accounts: { stroke: "#d97706", fill: "rgba(217, 119, 6, 0.14)", unit: "" },
  };

  const activeColor = metricColors[activeMetric] || metricColors.revenue;

  return (
    <div className={styles.container}>
      {/* Top Header & Period Filter */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Store Overview & Analytics</h2>
          <p className={styles.subtitle}>
            Monitor your nursery sales, incoming orders, visitor traffic, and customer registrations.
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.periodTabs} role="group" aria-label="Time period filter">
            {[
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "month", label: "This Year (By Month)" },
              { id: "year", label: "Yearly" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.periodBtn} ${period === p.id ? styles.periodBtnActive : ""}`}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => loadData(period)}
            title="Refresh analytics data"
            aria-label="Refresh analytics data"
          >
            <FiRefreshCw className={loading ? styles.spinning : ""} />
          </button>
        </div>
      </div>

      {error ? (
        <div className={styles.errorBanner} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => loadData(period)}>Try again</button>
        </div>
      ) : null}

      {/* 4 Stat Cards */}
      <div className={styles.statsGrid}>
        <div
          className={`${styles.statCard} ${activeMetric === "revenue" ? styles.statCardActive : ""}`}
          onClick={() => setActiveMetric("revenue")}
          role="button"
          tabIndex={0}
        >
          <div className={styles.statIconWrap} style={{ background: "#eaf5ee", color: "#26784a" }}>
            <FiDollarSign />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Revenue Generated</span>
            <div className={styles.statValue}>
              ₹{summary.totalRevenue.toLocaleString("en-IN")}
            </div>
            <span className={styles.statSub}>
              All time: ₹{(summary.allTimeRevenue || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${activeMetric === "sales" ? styles.statCardActive : ""}`}
          onClick={() => setActiveMetric("sales")}
          role="button"
          tabIndex={0}
        >
          <div className={styles.statIconWrap} style={{ background: "#e6f8f6", color: "#0d9488" }}>
            <FiShoppingBag />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Sales (Paid Orders)</span>
            <div className={styles.statValue}>{summary.totalSales}</div>
            <span className={styles.statSub}>
              All time: {summary.allTimeSales || 0} orders
            </span>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${activeMetric === "visitors" ? styles.statCardActive : ""}`}
          onClick={() => setActiveMetric("visitors")}
          role="button"
          tabIndex={0}
        >
          <div className={styles.statIconWrap} style={{ background: "#eef4ff", color: "#2563eb" }}>
            <FiUsers />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Site Visitors</span>
            <div className={styles.statValue}>
              {summary.totalVisitors.toLocaleString("en-IN")}
            </div>
            <span className={styles.statSub}>Total sessions tracked</span>
          </div>
        </div>

        <div
          className={`${styles.statCard} ${activeMetric === "accounts" ? styles.statCardActive : ""}`}
          onClick={() => setActiveMetric("accounts")}
          role="button"
          tabIndex={0}
        >
          <div className={styles.statIconWrap} style={{ background: "#fffbeb", color: "#d97706" }}>
            <FiUserCheck />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Accounts Created</span>
            <div className={styles.statValue}>{summary.totalAccounts}</div>
            <span className={styles.statSub}>
              All time: {summary.allTimeAccounts || 0} customers
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitleWrap}>
            <span className={styles.chartEyebrow}>VISUAL INSIGHTS</span>
            <h3>
              {activeMetric === "revenue"
                ? "Revenue Trend"
                : activeMetric === "sales"
                ? "Order Volume Trend"
                : activeMetric === "visitors"
                ? "Website Visitor Traffic"
                : "Customer Signups"}
            </h3>
          </div>

          <div className={styles.chartMetricToggles}>
            {[
              { id: "revenue", label: "Revenue" },
              { id: "sales", label: "Orders" },
              { id: "visitors", label: "Visitors" },
              { id: "accounts", label: "Accounts" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.metricTab} ${activeMetric === m.id ? styles.metricTabActive : ""}`}
                onClick={() => setActiveMetric(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart Canvas */}
        <div className={styles.chartCanvasWrap}>
          {series.length === 0 ? (
            <div className={styles.emptyChart}>No data available for this period.</div>
          ) : (
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className={styles.svgChart}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeColor.stroke} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={activeColor.stroke} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = chartHeight - paddingY - pct * (chartHeight - paddingY * 2);
                const labelVal = Math.round(pct * maxValue);
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#e8efe9"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#899a8e"
                    >
                      {activeColor.unit ? `${activeColor.unit}${labelVal}` : labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area */}
              {areaPathD && <path d={areaPathD} fill="url(#areaGradient)" />}

              {/* Line Curve */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke={activeColor.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Data points & hover detection */}
              {pathPoints.map((pt, index) => {
                const isHovered = hoveredPoint === index;
                const val = getMetricValue(pt.data);
                return (
                  <g key={index}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3}
                      fill="#ffffff"
                      stroke={activeColor.stroke}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      className={styles.chartDot}
                    />
                    <rect
                      x={pt.x - 12}
                      y={0}
                      width={24}
                      height={chartHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint(index)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{ cursor: "pointer" }}
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* Floating Tooltip */}
          {hoveredPoint !== null && pathPoints[hoveredPoint] && (
            <div
              className={styles.tooltip}
              style={{
                left: `${(pathPoints[hoveredPoint].x / chartWidth) * 100}%`,
                top: `${(pathPoints[hoveredPoint].y / chartHeight) * 100}%`,
              }}
            >
              <strong>{pathPoints[hoveredPoint].data.label}</strong>
              <div className={styles.tooltipValue}>
                {activeMetric === "revenue"
                  ? `₹${(pathPoints[hoveredPoint].data.revenue || 0).toLocaleString("en-IN")}`
                  : activeMetric === "sales"
                  ? `${pathPoints[hoveredPoint].data.sales || 0} orders`
                  : activeMetric === "visitors"
                  ? `${pathPoints[hoveredPoint].data.visitors || 0} visitors`
                  : `${pathPoints[hoveredPoint].data.accounts || 0} accounts`}
              </div>
            </div>
          )}
        </div>

        {/* X-axis labels summary */}
        <div className={styles.xAxisLabels}>
          {series
            .filter((_, idx) => idx === 0 || idx === Math.floor(series.length / 2) || idx === series.length - 1)
            .map((pt, i) => (
              <span key={i}>{pt.label}</span>
            ))}
        </div>
      </div>

      {/* Fulfillment Status Cards */}
      {data?.fulfillmentBreakdown && (
        <div className={styles.fulfillmentCard}>
          <div className={styles.fulfillmentHeader}>
            <h3>Order Fulfillment Distribution</h3>
            <span>Overall lifecycle status</span>
          </div>
          <div className={styles.fulfillmentList}>
            {[
              { status: "New", label: "Confirmed", color: "#3b82f6" },
              { status: "Selection", label: "Selection", color: "#8b5cf6" },
              { status: "Packaging", label: "Packaging", color: "#f59e0b" },
              { status: "Dispatched", label: "Dispatched", color: "#06b6d4" },
              { status: "Delivered", label: "Delivered", color: "#10b981" },
            ].map(({ status, label, color }) => {
              const count = data.fulfillmentBreakdown[status] || 0;
              return (
                <div key={status} className={styles.fulfillmentItem}>
                  <span className={styles.statusPillDot} style={{ background: color }} />
                  <span className={styles.fulfillmentItemLabel}>{label}</span>
                  <strong className={styles.fulfillmentItemCount}>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
