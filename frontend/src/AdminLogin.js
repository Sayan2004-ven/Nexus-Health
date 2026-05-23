import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [popup, setPopup] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8081/admin-login", form);
      setPopup(res.data.message);

      if (res.data.success) {
        loginAdmin();
        navigate("/admin-dashboard");
      }
    } catch (error) {
      setPopup("Error: " + error.message);
    }
  };

  return (
    <div className={styles.adminWrapper}>
      {/* Left Side - Welcome Section */}
      <div className={styles.leftSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>ADMIN</h1>
          <h2 className={styles.welcomeSubtitle}>CONTROL PANEL</h2>
          <p className={styles.welcomeText}>
            Secure access to the administrative dashboard. Manage users, 
            monitor system activities, and oversee all healthcare operations 
            from a centralized control panel.
          </p>
        </div>
        
        {/* Decorative Triangles */}
        <div className={styles.triangle1}></div>
        <div className={styles.triangle2}></div>
        <div className={styles.triangle3}></div>
      </div>

      {/* Right Side - Admin Login Form */}
      <div className={styles.rightSection}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <div className={styles.adminBadge}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h2 className={styles.formTitle}>Admin Access</h2>
            <p className={styles.formSubtitle}>
              Enter your credentials to access the admin panel
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Email Input */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                name="email"
                placeholder="Admin Email"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            {/* Password Input */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Admin Password"
                value={form.password}
                onChange={handleChange}
                className={styles.input}
                required
              />
              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Security Notice */}
            <div className={styles.securityNotice}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>This is a secure admin area. All activities are logged.</span>
            </div>

            {/* Login Button */}
            <button type="submit" className={styles.loginBtn}>
              Access Admin Panel
            </button>

            {/* Error/Success Message */}
            {popup && (
              <div className={`${styles.message} ${popup.includes("Error") ? styles.messageError : styles.messageSuccess}`}>
                {popup}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className={styles.formFooter}>
            <button type="button" className={styles.backLink} onClick={() => navigate("/")}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
