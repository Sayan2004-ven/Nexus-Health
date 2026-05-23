import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

/* ─── Inject Navbar Styles ─────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('shared-nav-styles')) {
  const style = document.createElement('style');
  style.id = 'shared-nav-styles';
  style.textContent = `
    @keyframes pulse { 
      0%, 100% { opacity: 1; } 
      50% { opacity: 0.4; } 
    }
    @keyframes scaleIn { 
      from { opacity: 0; transform: scale(0.95); } 
      to { opacity: 1; transform: scale(1); } 
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes meshFloat1 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.1); }
      66% { transform: translate(-20px, 10px) scale(0.9); }
    }
    @keyframes meshFloat2 {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(-25px, 15px) scale(1.05); }
      66% { transform: translate(25px, -15px) scale(0.95); }
    }
    
    .hosp-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      height: 64px;
      background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
      border-bottom: 1px solid rgba(99, 102, 241, 0.1);
      animation: slideDown 0.4s ease;
      overflow: visible;
    }
    
    .hosp-nav::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -100px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
      border-radius: 50%;
      filter: blur(40px);
      animation: meshFloat1 20s ease-in-out infinite;
      pointer-events: none;
    }
    
    .hosp-nav::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -100px;
      width: 250px;
      height: 250px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%);
      border-radius: 50%;
      filter: blur(40px);
      animation: meshFloat2 25s ease-in-out infinite;
      pointer-events: none;
    }
    
    .nav-logo { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      cursor: pointer;
      transition: transform 0.3s ease;
      position: relative;
      z-index: 1;
    }
    
    .nav-logo:hover {
      transform: scale(1.05);
    }
    
    .nav-logo-icon {
      width: 36px; 
      height: 36px;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      border-radius: 10px;
      display: flex; 
      align-items: center; 
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .nav-logo-icon::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      transition: left 0.5s ease;
    }
    
    .nav-logo:hover .nav-logo-icon::before {
      left: 100%;
    }
    
    .nav-logo:hover .nav-logo-icon {
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
      transform: translateY(-2px);
    }
    
    .nav-logo-text { 
      font-size: 18px; 
      font-weight: 700; 
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.5px;
    }
    
    .nav-links { 
      display: flex; 
      align-items: center; 
      gap: 6px;
      background: rgba(255, 255, 255, 0.6);
      padding: 6px;
      border-radius: 12px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
      position: relative;
      z-index: 1;
    }
    
    .nav-link {
      padding: 8px 16px; 
      border-radius: 8px; 
      font-size: 14px; 
      font-weight: 500;
      color: #6b7280; 
      background: transparent; 
      border: none; 
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Inter', sans-serif;
      position: relative;
      overflow: hidden;
    }
    
    .nav-link::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 0;
      height: 2px;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      transform: translateX(-50%);
      transition: width 0.3s ease;
    }
    
    .nav-link:hover { 
      background: rgba(99, 102, 241, 0.08);
      color: #6366f1;
      transform: translateY(-1px);
    }
    
    .nav-link:hover::before {
      width: 80%;
    }
    
    .nav-link.active { 
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    
    .nav-link.active::before {
      display: none;
    }
    
    .nav-right { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      position: relative; 
      z-index: 10;
    }
    
    .live-badge {
      display: flex; 
      align-items: center; 
      gap: 6px; 
      padding: 6px 14px;
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1px solid #6ee7b7;
      border-radius: 20px;
      font-size: 12px; 
      color: #065f46; 
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
      transition: all 0.3s ease;
    }
    
    .live-badge:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .live-dot {
      width: 6px; 
      height: 6px; 
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s ease infinite;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }
    
    .user-chip {
      display: flex; 
      align-items: center; 
      gap: 8px; 
      padding: 6px 6px 6px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 24px; 
      background: white;
      cursor: pointer; 
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none; 
      position: relative;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      z-index: 100;
    }
    
    .user-chip:hover { 
      border-color: #6366f1;
      background: #fafbfc;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
      transform: translateY(-1px);
    }
    
    .user-chip.open { 
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      background: white;
    }
    
    .user-avatar {
      width: 32px; 
      height: 32px; 
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      display: flex; 
      align-items: center; 
      justify-content: center;
      font-size: 12px; 
      font-weight: 700; 
      color: white;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      transition: transform 0.3s ease;
    }
    
    .user-chip:hover .user-avatar {
      transform: scale(1.1);
    }
    
    .user-name { 
      font-size: 14px; 
      color: #111827; 
      font-weight: 600; 
      padding-right: 4px; 
    }
    
    .chevron { 
      color: #9ca3af; 
      transition: transform 0.3s ease; 
      flex-shrink: 0; 
    }
    
    .chevron.open { 
      transform: rotate(180deg); 
      color: #6366f1;
    }
    
    .dropdown {
      position: absolute; 
      top: calc(100% + 12px); 
      right: 0; 
      width: 240px;
      background: white;
      backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid #e5e7eb;
      border-radius: 16px; 
      padding: 8px;
      z-index: 200; 
      box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08);
      animation: scaleIn 0.2s cubic-bezier(0.22,1,0.36,1) forwards;
    }
    
    .dropdown-header { 
      padding: 12px; 
      border-bottom: 1px solid #f3f4f6;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #fafbfc 0%, #f9fafb 100%);
      border-radius: 8px;
    }
    
    .dropdown-name { 
      font-size: 14px; 
      font-weight: 700; 
      color: #111827; 
      margin-bottom: 4px; 
    }
    
    .dropdown-email { 
      font-size: 12px; 
      color: #6b7280; 
    }
    
    .dropdown-id { 
      font-size: 11px; 
      color: #9ca3af; 
      font-family: 'Inter', monospace; 
      margin-top: 4px;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }
    
    .dropdown-btn {
      width: 100%; 
      padding: 10px 12px; 
      background: transparent; 
      border: none;
      border-radius: 8px; 
      color: #6b7280; 
      font-size: 13px; 
      font-family: 'Inter', sans-serif;
      cursor: pointer; 
      text-align: left; 
      display: flex; 
      align-items: center; 
      gap: 10px;
      transition: all 0.2s ease; 
      margin-bottom: 2px;
      font-weight: 500;
    }
    
    .dropdown-btn:hover { 
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      color: #111827;
      transform: translateX(4px);
    }
    
    .dropdown-btn.danger:hover { 
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      color: #dc2626;
    }
    
    .dropdown-divider { 
      height: 1px; 
      background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
      margin: 8px 0; 
    }
  `;
  document.head.appendChild(style);
}

/* ─── Helpers ─────────────────────────────────────────────────────── */
const initials = (name) =>
  name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";

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

/* ─── Main Navbar Component ─────────────────────────────────────────── */
export default function PatientNavbar() {
  const [showProfile, setShowProfile] = useState(false);
  const chipRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chipRef.current && !chipRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    if (showProfile) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [showProfile]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Determine active page
  const isActive = (path) => location.pathname === path;

  console.log('PatientNavbar - showProfile:', showProfile, 'user:', user);

  if (!user) {
    return null;
  }

  return (
    <nav className="hosp-nav">
      <div className="nav-logo" onClick={() => navigate("/hospitals")}>
        <div className="nav-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <span className="nav-logo-text">Nexus Health</span>
      </div>

      <div className="nav-links">
        <button 
          className={`nav-link ${isActive("/hospitals") ? "active" : ""}`}
          onClick={() => navigate("/hospitals")}
        >
          Dashboard
        </button>
        <button 
          className={`nav-link ${isActive("/doctors") ? "active" : ""}`}
          onClick={() => navigate("/doctors")}
        >
          Doctors
        </button>
        <button 
          className={`nav-link ${isActive("/patient-dashboard") ? "active" : ""}`}
          onClick={() => navigate("/patient-dashboard")}
        >
          My Appointments
        </button>
      </div>

      <div className="nav-right" ref={chipRef}>
        <div
          className={`user-chip${showProfile ? " open" : ""}`}
          onClick={e => { e.stopPropagation(); setShowProfile(v => !v); }}
        >
          <div className="user-avatar">{initials(user?.fname)}</div>
          <span className="user-name">{user?.fname}</span>
          <svg
            className={`chevron${showProfile ? " open" : ""}`}
            width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {showProfile && (
          <ProfileDropdown
            user={user}
            onNavigate={navigate}
            onLogout={handleLogout}
          />
        )}
      </div>
    </nav>
  );
}
