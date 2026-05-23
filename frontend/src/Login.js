import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", role: "patient" });
  const [popup, setPopup] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8081/login", form);
      setPopup(res.data.message);

      if (res.data.success) {
        loginUser(res.data.user);
        
        // Redirect based on role
        if (res.data.user.role === "doctor") {
          navigate("/doctor-dashboard");
        } else {
          navigate("/hospitals");
        }
      }
    } catch (error) {
      setPopup("Error: " + error.message);
    }
  };

  return (
    <div className={styles.loginWrapper}>
      {/* Left Side - Welcome Section */}
      <div className={styles.leftSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>WELCOME</h1>
          <h2 className={styles.welcomeSubtitle}>TO NEXUS HEALTH</h2>
          <p className={styles.welcomeText}>
            Your trusted healthcare platform for booking appointments, 
            managing medical records, and connecting with healthcare 
            professionals across the network.
          </p>
        </div>
        
        {/* Decorative Circles */}
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
        <div className={styles.circle3}></div>
      </div>

      {/* Right Side - Sign In Form */}
      <div className={styles.rightSection}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Sign in</h2>
            <p className={styles.formSubtitle}>
              Login to your {form.role} account to access healthcare services
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Account Type Selector */}
            <div className={styles.roleSelector}>
              <button
                type="button"
                className={`${styles.roleTab} ${form.role === "patient" ? styles.roleTabActive : ""}`}
                onClick={() => setForm({ ...form, role: "patient" })}
              >
                Patient
              </button>
              <button
                type="button"
                className={`${styles.roleTab} ${form.role === "doctor" ? styles.roleTabActive : ""}`}
                onClick={() => setForm({ ...form, role: "doctor" })}
              >
                Doctor
              </button>
            </div>

            {/* Email Input */}
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <input
                type="email"
                name="email"
                placeholder="User Name"
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
                placeholder="Password"
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

            {/* Remember Me & Forgot Password */}
            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className={styles.forgotLink}>
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <button type="submit" className={styles.signInBtn}>
              Sign in
            </button>

            {/* Divider */}
            <div className={styles.divider}>
              <span>Or</span>
            </div>

            {/* Sign in with other */}
            <button type="button" className={styles.altSignInBtn}>
              Sign in with other
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
            <span>Don't have an account?</span>
            <button type="button" className={styles.signUpLink} onClick={() => navigate("/create")}>
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
