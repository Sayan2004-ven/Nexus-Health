import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

/* ─── Global styles ──────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(56,161,105,0.5); }
    50%       { box-shadow: 0 0 0 6px rgba(56,161,105,0); }
  }
  @keyframes rotateSlow {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  @keyframes meshMove {
    0%, 100% { 
      transform: translate(0, 0) scale(1); 
      opacity: 1;
    }
    33% { 
      transform: translate(30px, -30px) scale(1.05); 
      opacity: 0.9;
    }
    66% { 
      transform: translate(-20px, 20px) scale(0.95); 
      opacity: 0.95;
    }
  }

  .hd-page  { font-family: 'Inter', sans-serif; }
  .hd-title { font-family: 'Playfair Display', serif; }

  .reveal { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
  .r1 { animation-delay: 0.04s; } .r2 { animation-delay: 0.10s; }
  .r3 { animation-delay: 0.16s; } .r4 { animation-delay: 0.22s; }
  .r5 { animation-delay: 0.28s; } .r6 { animation-delay: 0.34s; }

  .cost-row  { transition: background 0.18s ease, transform 0.18s ease; cursor: default; }
  .cost-row:hover { background: rgba(248,249,250,0.8) !important; transform: translateX(3px); }

  .metric-card { transition: border-color 0.2s ease, box-shadow 0.3s ease, transform 0.3s ease; }
  .metric-card:hover { 
    border-color: rgba(43,108,176,0.3) !important; 
    box-shadow: 0 12px 24px rgba(43,108,176,0.1) !important;
    transform: translateY(-4px) !important;
  }

  .btn-primary   { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .btn-primary:hover  { 
    background: linear-gradient(135deg, #2c5282 0%, #2b6cb0 100%) !important; 
    transform: translateY(-2px) !important; 
    box-shadow: 0 12px 32px rgba(43,108,176,0.3) !important; 
  }
  .btn-secondary { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .btn-secondary:hover { 
    background: rgba(248,249,250,0.9) !important; 
    border-color: rgba(43,108,176,0.3) !important; 
    color: #2b6cb0 !important;
    transform: translateY(-2px) !important;
  }
  .back-btn { transition: all 0.2s ease; }
  .back-btn:hover { background: rgba(248,249,250,0.9) !important; color: #1a202c !important; }
  .tab-btn  { transition: color 0.15s ease; }
  .tab-btn:hover { color: #1a202c !important; }
  .sidebar-card { transition: border-color 0.2s ease, box-shadow 0.3s ease, transform 0.3s ease; }
  .sidebar-card:hover { 
    border-color: rgba(43,108,176,0.3) !important;
    box-shadow: 0 8px 20px rgba(43,108,176,0.08) !important;
    transform: translateY(-2px) !important;
  }
`;

if (typeof document !== "undefined" && !document.getElementById("hd-styles")) {
  const el = document.createElement("style");
  el.id = "hd-styles";
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
}

/* ─── Donut Chart ────────────────────────────────────────────────── */
function DonutChart({ pct, color }) {
  const size = 140, stroke = 11;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [anim, setAnim] = useState(0);

  useEffect(() => {
    let start = null;
    const ease = t => 1 - Math.pow(1 - t, 3);
    const run = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 900, 1);
      setAnim(ease(p) * pct);
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [pct]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e9ecef" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={circ - (anim / 100) * circ}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 10, color: "#718096", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>occupancy</span>
      </div>
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────────────────── */
function MetricCard({ label, value, color, icon, cls }) {
  return (
    <div className={`reveal metric-card ${cls}`} style={s.metricCard}>
      <div style={s.metricIcon}><span style={{ fontSize: 15 }}>{icon}</span></div>
      <span style={{ ...s.metricVal, color }}>{value}</span>
      <span style={s.metricLbl}>{label}</span>
    </div>
  );
}

/* ─── Cost Row ───────────────────────────────────────────────────── */
function CostRow({ label, sub, cost, accent, icon, last }) {
  const fmt = n => Number(n).toLocaleString("en-IN");
  return (
    <div className="cost-row" style={{ ...s.costRow, borderBottom: last ? "none" : "1px solid #f1f3f5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ ...s.costIcon, background: `${accent}14`, border: `0.5px solid ${accent}28` }}>
          <span style={{ fontSize: 15 }}>{icon}</span>
        </div>
        <div>
          <div style={s.costName}>{label}</div>
          <div style={s.costSub}>{sub}</div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ ...s.costAmt, color: accent }}>₹{fmt(cost)}</div>
        <div style={s.costPer}>per day</div>
      </div>
    </div>
  );
}

/* ─── Sidebar stat row ───────────────────────────────────────────── */
function SideStatRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f3f5" }}>
      <span style={{ fontSize: 12, color: "#718096" }}>{label}</span>
      <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, fontWeight: 600, color: color || "#1a202c" }}>{value}</span>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function HospitalDetails() {

  const location = useLocation();
  const navigate = useNavigate();

  const hospital = location.state?.hospital;
  const [activeTab, setActiveTab] = useState("overview");

  // ✅ SAFETY CHECK
  if (!hospital) {
    return (
      <div style={{ color: "white", padding: "20px" }}>
        No hospital data found
      </div>
    );
  }


  const total     = hospital.total_beds    || 0;
  const occupied  = hospital.occupied_beds || 0;
  const available = hospital.available_beds || (total - occupied);
  const pct       = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const statusColor = pct >= 90 ? "#e53e3e" : pct >= 70 ? "#dd6b20" : "#38a169";
  const statusLabel = pct >= 90 ? "Near Capacity" : pct >= 70 ? "High Occupancy" : "Accepting Patients";
  const fmt = n => Number(n).toLocaleString("en-IN");

  return (
    <div className="hd-page" style={s.page}>
      {/* Animated mesh gradient background - Premium effect */}
      <div style={{ 
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse 800px 600px at 0% 0%, ${statusColor}15 0%, transparent 50%),
          radial-gradient(ellipse 600px 800px at 100% 100%, rgba(43,108,176,0.12) 0%, transparent 50%),
          radial-gradient(ellipse 700px 500px at 50% 50%, rgba(99,102,241,0.10) 0%, transparent 50%)
        `,
        animation: "meshMove 20s ease-in-out infinite"
      }} />
      <div style={{ 
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(circle 400px at 20% 80%, rgba(56,161,105,0.10) 0%, transparent 50%),
          radial-gradient(circle 500px at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 50%)
        `,
        animation: "meshMove 25s ease-in-out infinite reverse"
      }} />
      {/* Subtle grid texture */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,0,0,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.015) 1px,transparent 1px)",
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse 80% 50% at 50% 0%,black 30%,transparent 100%)" }} />

      {/* ── Hero ── */}
      <div style={s.hero}>
        <button className="back-btn" onClick={() => navigate(-1)} style={s.backBtn}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div style={{ marginTop: 18, animation: "fadeUp 0.4s ease both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ ...s.statusPill, background: `${statusColor}18`, color: statusColor, borderColor: statusColor }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, flexShrink: 0, animation: "pulse 2s infinite" }} />
              {statusLabel}
            </span>
            <span style={s.idPill}>ID #{hospital.id}</span>
          </div>
          <h1 className="hd-title" style={s.title}>{hospital.name}</h1>
          <p style={{ color: "#4a5568", marginTop: "6px" }}>
            📍 {hospital.address}
          </p>

          <p style={{ color: "#4a5568", marginTop: "6px" }}>
            📞 {hospital.contact}
          </p>

          <p style={{ color: "#4a5568", marginTop: "6px" }}>
            ⭐ {hospital.rating} ({hospital.reviews} reviews)
          </p>
          <p style={s.subtitle}>Hospital details · Bed availability · Pricing</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 22 }}>
          {["overview", "costs", "contact"].map(tab => (
            <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 16px", fontSize: 13, fontWeight: 500, letterSpacing: "0.02em",
              color: activeTab === tab ? "#1a202c" : "#718096",
              borderBottom: activeTab === tab ? `2px solid ${statusColor}` : "2px solid transparent",
            }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div style={s.twoCol}>

        {/* LEFT — main content */}
        <div style={s.leftCol}>

          {/* Metrics */}
          <div style={s.metricsRow}>
            <MetricCard label="Total Beds" value={total}     color="#7bafd4" icon="🏥" cls="r1" />
            <MetricCard label="Occupied"   value={occupied}  color="#E24B4A" icon="🩺" cls="r2" />
            <MetricCard label="Available"  value={available} color="#1D9E75" icon="✅" cls="r3" />
            <MetricCard label="Occupancy"  value={`${pct}%`} color={statusColor} icon="📊" cls="r4" />
          </div>

          {/* Occupancy bar */}
          <div className="reveal r3" style={s.barCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={s.secLabel}>Occupancy breakdown</span>
              <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 99,
                background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}` }}>
                {pct}% full
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: "#e9ecef", overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                height: "100%", borderRadius: 6, width: `${pct}%`,
                background: `linear-gradient(90deg, ${statusColor}, ${statusColor})`,
                boxShadow: `0 0 10px ${statusColor}44`,
                transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              {[{ c: statusColor, label: `Occupied — ${occupied}` }, { c: "#38a169", label: `Available — ${available}` }].map(({ c, label }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#718096" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Costs */}
          <div className="reveal r4">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={s.secLabel}>Bed costs per day</p>
              <span style={{ fontSize: 11, color: "#718096", background: "#f1f3f5", border: "1px solid #e0e4e8", padding: "3px 8px", borderRadius: 6 }}>
                Prices may vary
              </span>
            </div>
            <div style={{ 
              background: "rgba(255,255,255,0.7)", 
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.8)", 
              borderRadius: 14, 
              overflow: "hidden", 
              boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)" 
            }}>
              <CostRow label="General Ward" sub="Shared room · Basic care"         cost={hospital.general_cost} accent="#2b6cb0" icon="🛏" />
              <CostRow label="ICU"          sub="Intensive monitoring · 24/7 care"  cost={hospital.icu_cost}     accent="#e53e3e" icon="❤️‍🔥" />
              <CostRow label="Private Room" sub="Single occupancy · Premium care"   cost={hospital.private_cost} accent="#805ad5" icon="⭐" last />
            </div>
          </div>

          {/* CTAs */}
          <div className="reveal r5" style={{ display: "flex", gap: 10 }}>
            <button className="btn-secondary" style={s.ctaSec}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginRight: 6 }}>
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Save hospital
            </button>
            <button className="btn-primary" style={s.ctaPri}>
              Book a bed
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ marginLeft: 8 }}>
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div style={s.rightCol}>

          {/* Donut + stats */}
          <div className="reveal r1 sidebar-card" style={s.sideCard}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <DonutChart pct={pct} color={statusColor} />
              <div style={{ width: "100%" }}>
                <SideStatRow label="Total beds" value={total} />
                <SideStatRow label="Occupied"   value={occupied}  color="#e53e3e" />
                <SideStatRow label="Available"  value={available} color="#38a169" />
                <div style={{ paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#718096" }}>Status</span>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 9px", borderRadius: 99,
                    background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}` }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick info */}
          <div className="reveal r2 sidebar-card" style={s.sideCard}>
            <p style={{ ...s.secLabel, marginBottom: 14 }}>Quick info</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "🕐", label: "Open 24/7",   sub: "Emergency services available" },
                { icon: "🚑", label: "Ambulance",    sub: "On-call response team" },
                { icon: "🌐", label: "Nexus Network", sub: "Registered & verified" },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f8f9fa",
                    border: "1px solid #e0e4e8", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#1a202c", fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 11, color: "#718096", marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost mini-bars */}
          <div className="reveal r3 sidebar-card" style={s.sideCard}>
            <p style={{ ...s.secLabel, marginBottom: 14 }}>Cost comparison</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "General", value: hospital.general_cost, color: "#2b6cb0" },
                { label: "ICU",     value: hospital.icu_cost,     color: "#e53e3e" },
                { label: "Private", value: hospital.private_cost, color: "#805ad5" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#718096" }}>{label}</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 12, fontWeight: 600, color }}>₹{fmt(value)}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: "#e9ecef", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 99,
                      width: `${Math.min(100, (value / (hospital.private_cost || 1)) * 100)}%`,
                      background: color, opacity: 0.75,
                      transition: "width 1s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="reveal r4" style={{ fontSize: 11, color: "#a0aec0", textAlign: "center" }}>
            Updated just now · Nexus HMS
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────── */
const s = {
  page:  { 
    minHeight: "100vh", 
    background: "#f8f9fa", 
    color: "#1a202c", 
    position: "relative", 
    overflowX: "hidden" 
  },

  hero: {
    position: "relative", zIndex: 1,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderBottom: "1px solid rgba(224,228,232,0.8)",
    padding: "20px 32px 0",
    boxShadow: "0 4px 6px rgba(0,0,0,0.03)",
  },
  backBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#ffffff", border: "1px solid #e0e4e8",
    borderRadius: 8, color: "#4a5568", padding: "6px 12px", cursor: "pointer", fontSize: 13,
  },
  statusPill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    fontSize: 11, fontWeight: 500, padding: "4px 10px", borderRadius: 99, border: "1px solid",
  },
  idPill: { fontSize: 11, color: "#718096", background: "#f1f3f5", border: "1px solid #e0e4e8", padding: "4px 10px", borderRadius: 99 },
  title:    { fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 700, color: "#1a202c", letterSpacing: "-0.4px", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#718096", marginTop: 6, letterSpacing: "0.03em" },

  twoCol: {
    position: "relative", zIndex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    gap: 20,
    padding: "24px 32px",
    alignItems: "start",
  },
  leftCol:  { display: "flex", flexDirection: "column", gap: 20 },
  rightCol: { display: "flex", flexDirection: "column", gap: 16 },

  metricsRow: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
  metricCard: {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.8)", 
    borderRadius: 12,
    padding: "16px 14px",
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
  },
  metricIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: "#f8f9fa", border: "1px solid #e0e4e8",
    display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  metricVal: { fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, lineHeight: 1 },
  metricLbl: { fontSize: 11, color: "#718096", letterSpacing: "0.04em", textTransform: "uppercase" },

  barCard: {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.8)", 
    borderRadius: 14, 
    padding: "18px 20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
  },
  secLabel: { fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", color: "#718096" },

  costRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" },
  costIcon: { width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  costName: { fontSize: 14, color: "#1a202c", fontWeight: 500 },
  costSub:  { fontSize: 11, color: "#718096", marginTop: 2 },
  costAmt:  { fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600 },
  costPer:  { fontSize: 11, color: "#718096", marginTop: 2 },

  ctaPri: {
    flex: 2, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", 
    background: "linear-gradient(135deg, #2b6cb0 0%, #2c5282 100%)", 
    color: "#ffffff", border: "none",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter',sans-serif",
    boxShadow: "0 4px 12px rgba(43,108,176,0.2)",
  },
  ctaSec: {
    flex: 1, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500,
    cursor: "pointer", background: "#ffffff", color: "#4a5568",
    border: "1px solid #e0e4e8",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter',sans-serif",
  },

  sideCard: {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.8)", 
    borderRadius: 14, 
    padding: "18px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
  },
};
