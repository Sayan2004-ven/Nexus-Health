import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import PatientNavbar from "./PatientNavbar";

/* ─── Injected styles ─────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f8f9fa;
    --bg2:       #ffffff;
    --bg3:       #f1f3f5;
    --bg4:       #e9ecef;
    --border:    #e0e4e8;
    --border2:   #cbd5e0;
    --text:      #1a202c;
    --text2:     #4a5568;
    --text3:     #718096;
    --accent:    #2b6cb0;
    --accent2:   #3182ce;
    --green:     #38a169;
    --green-bg:  #f0fff4;
    --orange:    #dd6b20;
    --orange-bg: #fffaf0;
    --red:       #e53e3e;
    --red-bg:    #fff5f5;
    --font:      'Inter', sans-serif;
    --mono:      'Inter', monospace;
    --radius:    12px;
    --radius-lg: 18px;
    --shadow:    0 4px 6px rgba(0,0,0,0.07);
    --shadow-lg: 0 10px 15px rgba(0,0,0,0.08);
  }

  body { background: var(--bg); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes barGrow {
    from { width: 0; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94) translateY(-8px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }

  .hosp-page {
    min-height: 100vh;
    background: #f8f9fa;
    font-family: var(--font);
    color: var(--text);
    position: relative;
    overflow-x: hidden;
  }
  
  /* Animated mesh gradient background */
  .hosp-page::before {
    content: '';
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(ellipse 800px 600px at 0% 0%, rgba(43,108,176,0.12) 0%, transparent 50%),
      radial-gradient(ellipse 600px 800px at 100% 100%, rgba(56,161,105,0.10) 0%, transparent 50%),
      radial-gradient(ellipse 700px 500px at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
    animation: meshMove 20s ease-in-out infinite;
  }
  
  .hosp-page::after {
    content: '';
    position: fixed;
    inset: 0;
    background: 
      radial-gradient(circle 400px at 20% 80%, rgba(236,72,153,0.08) 0%, transparent 50%),
      radial-gradient(circle 500px at 80% 20%, rgba(59,130,246,0.10) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
    animation: meshMove 25s ease-in-out infinite reverse;
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

  /* ── Nav ── */
  .hosp-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 64px;
    border-bottom: 1px solid var(--border);
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }
  .nav-logo-icon {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #2b6cb0, #3182ce);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(43,108,176,0.2);
  }
  .nav-logo-text {
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .nav-link {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13.5px;
    font-weight: 400;
    color: var(--text2);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: var(--font);
  }
  .nav-link:hover { background: var(--bg3); color: var(--text); }
  .nav-link.active { background: #ebf8ff; color: var(--accent); font-weight: 500; }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  }

  /* ── Live badge ── */
  .live-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    background: var(--green-bg);
    border: 1px solid #9ae6b4;
    border-radius: 99px;
    font-size: 12px;
    color: var(--green);
    font-weight: 500;
  }
  .live-dot {
    width: 6px; height: 6px;
    background: var(--green);
    border-radius: 50%;
    animation: pulse 2s ease infinite;
  }

  /* ── User chip ── */
  .user-chip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 5px 5px 10px;
    border: 1px solid var(--border);
    border-radius: 99px;
    background: var(--bg2);
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    position: relative;
  }
  .user-chip:hover { border-color: var(--border2); background: var(--bg3); }
  .user-chip.open  { border-color: var(--accent); box-shadow: 0 0 0 3px #ebf8ff; }

  .user-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2b6cb0, #3182ce);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: white;
    flex-shrink: 0;
  }
  .user-name {
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
    padding-right: 4px;
  }
  .chevron {
    color: var(--text3);
    transition: transform 0.22s ease;
    flex-shrink: 0;
  }
  .chevron.open { transform: rotate(180deg); }

  /* ── Dropdown ── */
  .dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 232px;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(224,228,232,0.8);
    border-radius: var(--radius-lg);
    padding: 8px;
    z-index: 100;
    box-shadow: 0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.06);
    animation: scaleIn 0.2s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  .dropdown-header {
    padding: 10px 10px 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 6px;
  }
  .dropdown-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
  }
  .dropdown-email {
    font-size: 12px;
    color: var(--text2);
  }
  .dropdown-id {
    font-size: 11px;
    color: var(--text3);
    font-family: var(--mono);
    margin-top: 2px;
  }
  .dropdown-btn {
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--text2);
    font-size: 13px;
    font-family: var(--font);
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.15s ease;
    margin-bottom: 2px;
  }
  .dropdown-btn:hover { background: var(--bg3); color: var(--text); }
  .dropdown-btn.danger:hover { background: var(--red-bg); color: var(--red); }
  .dropdown-divider { height: 1px; background: var(--border); margin: 4px 0 6px; }

  /* ── Main ── */
  .hosp-main {
    max-width: 1280px;
    margin: 0 auto;
    padding: 36px 32px;
    animation: fadeUp 0.4s ease forwards;
    position: relative;
    z-index: 1;
  }

  /* ── Page header ── */
  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 32px;
    flex-wrap: wrap;
  }
  .page-title-block {}
  .page-title {
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .page-sub {
    font-size: 13.5px;
    color: var(--text2);
  }

  /* ── Search ── */
  .search-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 12px;
    color: var(--text3);
    pointer-events: none;
  }
  .search-input {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font);
    font-size: 13.5px;
    padding: 9px 14px 9px 38px;
    border-radius: 10px;
    width: 240px;
    transition: all 0.2s ease;
    outline: none;
  }
  .search-input::placeholder { color: var(--text3); }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px #ebf8ff;
    background: var(--bg2);
  }

  /* ── Summary cards ── */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 28px;
  }
  .summary-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.8);
    border-radius: var(--radius-lg);
    padding: 20px 22px;
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
  }
  .summary-card::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 120px;
    height: 120px;
    background: radial-gradient(circle, rgba(43,108,176,0.08) 0%, transparent 70%);
    border-radius: 50%;
    transform: translate(40%, -40%);
    transition: transform 0.3s ease;
  }
  .summary-card:hover { 
    border-color: rgba(43,108,176,0.3); 
    box-shadow: 0 12px 24px rgba(43,108,176,0.08), 0 4px 8px rgba(0,0,0,0.04); 
    transform: translateY(-4px); 
    background: rgba(255,255,255,0.85);
  }
  .summary-card:hover::after { transform: translate(30%, -30%) scale(1.2); }
  .summary-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .summary-text {}
  .summary-label {
    font-size: 12px;
    color: var(--text2);
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .summary-value {
    font-size: 28px;
    font-weight: 700;
    font-family: var(--mono);
    line-height: 1;
  }

  /* ── Toolbar (filter + count) ── */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
  }
  .filter-btn {
    padding: 6px 14px;
    border-radius: 7px;
    font-size: 12.5px;
    font-weight: 500;
    font-family: var(--font);
    border: none;
    background: transparent;
    color: var(--text2);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .filter-btn:hover { background: var(--bg4); color: var(--text); }
  .filter-btn.active { background: var(--accent); color: white; }
  .filter-btn.active.warn { background: var(--orange); }
  .filter-btn.active.danger { background: var(--red); }

  .result-count {
    font-size: 13px;
    color: var(--text3);
  }
  .result-count span {
    color: var(--text2);
    font-weight: 500;
  }

  /* ── Hospital Grid ── */
  .hosp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }

  /* ── Hospital Card ── */
  .hosp-card {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.8);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    animation: fadeUp 0.35s ease both;
    box-shadow: 0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
  }
  .hosp-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(43,108,176,0.08) 0%, rgba(56,161,105,0.05) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .hosp-card:hover {
    border-color: rgba(43,108,176,0.4);
    transform: translateY(-6px);
    box-shadow: 0 20px 40px rgba(43,108,176,0.12), 0 8px 16px rgba(0,0,0,0.06);
    background: rgba(255,255,255,0.85);
  }
  .hosp-card:hover::before { opacity: 1; }

  .card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 16px;
  }
  .card-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    background: #ebf8ff;
    border: 1px solid #bee3f8;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .card-title-block { flex: 1; min-width: 0; }
  .card-name {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card-city {
    font-size: 12px;
    color: var(--text2);
  }
  .occ-badge {
    padding: 4px 10px;
    border-radius: 99px;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--mono);
    flex-shrink: 0;
    white-space: nowrap;
  }

  /* ── Bar ── */
  .bar-section { margin-bottom: 16px; }
  .bar-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .bar-label-text { font-size: 11.5px; color: var(--text2); }
  .bar-track {
    height: 6px;
    background: var(--bg3);
    border-radius: 99px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 99px;
    animation: barGrow 0.8s cubic-bezier(0.22,1,0.36,1) forwards;
    transition: width 0.6s cubic-bezier(0.22,1,0.36,1);
  }

  /* ── Stats row ── */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
  }
  .stat-cell {
    background: var(--bg);
    padding: 10px 8px;
    text-align: center;
    transition: background 0.15s ease;
  }
  .stat-cell:hover { background: var(--bg3); }
  .stat-num {
    font-size: 18px;
    font-weight: 700;
    font-family: var(--mono);
    line-height: 1;
    margin-bottom: 3px;
  }
  .stat-lbl {
    font-size: 10.5px;
    color: var(--text3);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 500;
  }

  /* ── Loading skeleton ── */
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;
  }
  .skeleton-card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    height: 180px;
  }
  .skeleton-line {
    height: 14px;
    border-radius: 6px;
    background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    margin-bottom: 10px;
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center;
    padding: 80px 0;
    animation: fadeIn 0.3s ease;
  }
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    filter: grayscale(0.3);
  }
  .empty-title { font-size: 16px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }
  .empty-sub   { font-size: 13px; color: var(--text3); }

  /* ── Overlay ── */
  .blur-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease forwards;
  }

  /* ── Pagination (matches Doctors.js style) ── */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 32px;
  }
  .page-btn {
    font-size: 13px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg2);
    color: var(--text2);
    font-family: 'Inter', sans-serif;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .page-btn:hover:not(:disabled) {
    background: var(--bg3);
    color: var(--accent);
    border-color: var(--accent);
  }
  .page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .page-numbers {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .page-num {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg2);
    color: var(--text2);
    font-size: 13px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.18s ease;
    display: flex; align-items: center; justify-content: center;
  }
  .page-num:hover { background: var(--bg3); color: var(--text); border-color: var(--border2); }
  .page-num.active { background: var(--accent); color: white; border-color: var(--accent); }
  .page-dots {
    color: var(--text3);
    font-size: 13px;
    padding: 0 4px;
    user-select: none;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 10px; }
  ::-webkit-scrollbar-track { background: var(--bg3); }
  ::-webkit-scrollbar-thumb { background: var(--border-dark); border-radius: 5px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text3); }
`;

if (typeof document !== "undefined" && !document.getElementById("hosp-dash-styles")) {
  const style = document.createElement("style");
  style.id = "hosp-dash-styles";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
const initials = (name) =>
  name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

const pctInfo = (pct) => {
  if (pct >= 90) return { bar: "#e53e3e", badgeBg: "var(--red-bg)", badgeColor: "#e53e3e", badgeBorder: "#fc8181", label: "Critical" };
  if (pct >= 70) return { bar: "#dd6b20", badgeBg: "var(--orange-bg)", badgeColor: "#dd6b20", badgeBorder: "#f6ad55", label: "High" };
  return              { bar: "#38a169", badgeBg: "var(--green-bg)",  badgeColor: "#38a169", badgeBorder: "#9ae6b4", label: "Low" };
};

/* ─── Profile Dropdown ─────────────────────────────────────────────── */
function ProfileDropdown({ user, onNavigate, onLogout }) {
  return (
    <div className="dropdown" onClick={e => e.stopPropagation()}>
      <div className="dropdown-header">
        <div className="dropdown-name">{user.fname} {user.lname}</div>
        <div className="dropdown-email">{user.email}</div>
        <div className="dropdown-id">ID #{user.id}</div>
      </div>
      <button className="dropdown-btn" onClick={() => onNavigate(`/update/${user.id}`)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        Edit Profile
      </button>
      <div className="dropdown-divider" />
      <button className="dropdown-btn danger" onClick={onLogout}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
  );
}

/* ─── Hospital Card ─────────────────────────────────────────────────── */
function HospitalCard({ hospital: h, onClick, index }) {
  const pct = h.total_beds > 0 ? Math.round((h.occupied_beds / h.total_beds) * 100) : 0;
  const { bar, badgeBg, badgeColor, badgeBorder } = pctInfo(pct);

  return (
    <div
      className="hosp-card"
      style={{ animationDelay: `${index * 0.04}s` }}
      onClick={onClick}
    >
      <div className="card-top">
        <div className="card-icon">🏥</div>
        <div className="card-title-block">
          <div className="card-name" title={h.name}>{h.name}</div>
          <div className="card-city">{h.city || "—"}</div>
        </div>
        <span
          className="occ-badge"
          style={{ background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}
        >
          {pct}%
        </span>
      </div>

      <div className="bar-section">
        <div className="bar-labels">
          <span className="bar-label-text">Bed occupancy</span>
          <span className="bar-label-text">{h.occupied_beds} / {h.total_beds}</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${pct}%`, background: bar }} />
        </div>
      </div>

      <div className="stats-row">
        {[
          { num: h.total_beds,     lbl: "Total",     color: "var(--text)" },
          { num: h.occupied_beds,  lbl: "Occupied",  color: "var(--orange)" },
          { num: h.available_beds, lbl: "Available", color: "var(--green)" },
        ].map(({ num, lbl, color }) => (
          <div className="stat-cell" key={lbl}>
            <div className="stat-num" style={{ color }}>{num}</div>
            <div className="stat-lbl">{lbl}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Skeleton loader ─────────────────────────────────────────────── */
function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton-line" style={{ width: "60%", marginBottom: 8 }} />
          <div className="skeleton-line" style={{ width: "35%", height: 10, marginBottom: 20 }} />
          <div className="skeleton-line" style={{ width: "100%", height: 6, marginBottom: 20 }} />
          <div className="skeleton-line" style={{ width: "100%", height: 48, borderRadius: 10 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── Main Dashboard ─────────────────────────────────────────────── */
export default function HospitalDashboard() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter]       = useState("all");
  const [search, setSearch]       = useState("Kolkata");
  const [showProfile, setShowProfile] = useState(false);
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 12;

  const chipRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setHospitals([]);
    setFetchError(false);
    setPage(1);

    axios.get(`http://localhost:8081/api/hospitals?city=${search}`)
      .then(res => {
        if (res.data.success && res.data.hospitals?.length > 0) {
          setHospitals(res.data.hospitals);
          setFetchError(false);
        } else {
          setHospitals([]);
          setFetchError(res.data.message || "No hospitals found for this city");
        }
      })
      .catch(() => setFetchError("Could not connect to server"))
      .finally(() => setLoading(false));
  }, [user, search]);

  useEffect(() => {
    const handleClick = (e) => {
      if (chipRef.current && !chipRef.current.contains(e.target)) setShowProfile(false);
    };
    if (showProfile) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showProfile]);

  const handleLogout = () => { logout(); navigate("/"); };
  if (!user) return null;

  const filtered = hospitals.filter(h => {
    const pct = h.total_beds > 0 ? h.occupied_beds / h.total_beds : 0;
    if (filter === "low")      return pct < 0.7;
    if (filter === "high")     return pct >= 0.7 && pct < 0.9;
    if (filter === "critical") return pct >= 0.9;
    return true;
  });

  const totalBeds  = hospitals.reduce((a, h) => a + h.total_beds, 0);
  const totalOcc   = hospitals.reduce((a, h) => a + h.occupied_beds, 0);
  const totalAvail = totalBeds - totalOcc;

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const paginated  = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const handleFilterChange = (key) => { setFilter(key); setPage(1); };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (safePage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1, "...", totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages);
    } else {
      pages.push(1, "...", safePage-1, safePage, safePage+1, "...", totalPages);
    }
    return pages;
  };

  const FILTERS = [
    { key: "all",      label: "All",      cls: "" },
    { key: "low",      label: "Available",cls: "" },
    { key: "high",     label: "High",     cls: "warn" },
    { key: "critical", label: "Critical", cls: "danger" },
  ];

  return (
    <div className="hosp-page">

      {showProfile && (
        <div className="blur-overlay" onClick={() => setShowProfile(false)} />
      )}

      {/* ── Navbar ── */}
      <PatientNavbar />

      {/* ── Main Content ── */}
      <main className="hosp-main">

        {/* Page header */}
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">Hospital Availability</h1>
            <p className="page-sub">Real-time bed status across your registered network</p>
          </div>

          <div className="search-wrap">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search city…"
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="summary-grid">
          {[
            { label: "Total Beds",     value: totalBeds,  color: "var(--accent2)", icon: "🛏️", iconBg: "rgba(59,130,246,0.1)" },
            { label: "Occupied",       value: totalOcc,   color: "var(--orange)",  icon: "👤", iconBg: "var(--orange-bg)" },
            { label: "Available Now",  value: totalAvail, color: "var(--green)",   icon: "✅", iconBg: "var(--green-bg)" },
          ].map(({ label, value, color, icon, iconBg }) => (
            <div className="summary-card" key={label}>
              <div className="summary-icon" style={{ background: iconBg }}>{icon}</div>
              <div className="summary-text">
                <div className="summary-label">{label}</div>
                <div className="summary-value" style={{ color }}>{loading ? "—" : value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="filter-group">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`filter-btn${filter === f.key ? " active" : ""}${filter === f.key && f.cls ? ` ${f.cls}` : ""}`}
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="result-count">
            Showing <span>{Math.min(pageStart + 1, filtered.length)}–{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of <span>{filtered.length}</span> hospitals
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonGrid />
        ) : fetchError ? (
          <div className="empty-state">
            <div className="empty-icon">🏥</div>
            <div className="empty-title">{fetchError}</div>
            <div className="empty-sub">Try searching for a different city</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <div className="empty-title">No hospitals match this filter</div>
            <div className="empty-sub">Try switching to "All" to see every result</div>
          </div>
        ) : (
          <div className="hosp-grid">
            {paginated.map((h, i) => (
              <HospitalCard
                key={h.id}
                hospital={h}
                index={i}
                onClick={() => navigate("/hospital", { state: { hospital: h } })}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && !fetchError && totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={safePage === 1}
              onClick={() => { setPage(p => p - 1); scrollToTop(); }}
            >← Prev</button>

            <div className="page-numbers">
              {getPageNumbers().map((n, i) =>
                n === "..." ? (
                  <span key={`dots-${i}`} className="page-dots">…</span>
                ) : (
                  <button
                    key={n}
                    className={`page-num${safePage === n ? " active" : ""}`}
                    onClick={() => { setPage(n); scrollToTop(); }}
                  >
                    {n}
                  </button>
                )
              )}
            </div>

            <button
              className="page-btn"
              disabled={safePage === totalPages}
              onClick={() => { setPage(p => p + 1); scrollToTop(); }}
            >Next →</button>
          </div>
        )}

      </main>
    </div>
  );
}