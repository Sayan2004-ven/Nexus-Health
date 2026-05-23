import React, { useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./Create.module.css";

/* ── Password strength helper ─────────────────────────────── */
function getStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "transparent", width: "0%" };
  let score = 0;
  if (pwd.length >= 8)              score++;
  if (/[A-Z]/.test(pwd))           score++;
  if (/[0-9]/.test(pwd))           score++;
  if (/[^A-Za-z0-9]/.test(pwd))    score++;

  const map = [
    { label: "Weak",      color: "#e24b4a", width: "25%" },
    { label: "Fair",      color: "#e2924b", width: "50%" },
    { label: "Good",      color: "#e2d24b", width: "75%" },
    { label: "Strong",    color: "#1dd9a0", width: "100%" },
  ];
  return { score, ...map[Math.max(0, score - 1)] };
}

export default function Create() {
  const [form, setForm] = useState({
    fname: "", lname: "", email: "",
    phone: "", password: "", confirmPassword: "", role: "patient",
  });
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [popup, setPopup] = useState({ msg: "", isError: false });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const strength = getStrength(form.password);

  const handleChange = useCallback((e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value })),
  []);

  const showPopup = (msg, isError = false) => setPopup({ msg, isError });

  /* ── Send OTP ──────────────────────────────────────────── */
  const sendOTP = async () => {
    if (form.phone.length !== 10) {
      showPopup("Please enter a valid 10-digit phone number", true);
      return;
    }
    setOtpLoading(true);
    try {
      const res = await axios.post("http://localhost:8081/send-otp", { phone: form.phone });
      
      if (res.data.success) {
        showPopup("✅ OTP sent successfully! Check your phone.", false);
        setOtpSent(true);
      } else {
        // Show the specific error message from backend
        const errorMsg = res.data.message || "Failed to send OTP. Please try again.";
        showPopup(`❌ ${errorMsg}`, true);
        console.error("OTP Error:", errorMsg);
      }
    } catch (error) {
      console.error("OTP request error:", error);
      showPopup("❌ Failed to send OTP. Please check your connection or contact support.", true);
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Submit ────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      showPopup("Passwords do not match", true);
      return;
    }
    if (form.password.length < 8) {
      showPopup("Password must be at least 8 characters", true);
      return;
    }
    if (!otpSent) {
      showPopup("Please verify your phone number first", true);
      return;
    }

    setSubmitting(true);
    try {
      const verify = await axios.post("http://localhost:8081/verify-otp", {
        phone: form.phone, otp,
      });
      if (!verify.data.success) {
        showPopup("Invalid OTP. Please check and retry.", true);
        setSubmitting(false);
        return;
      }
      
      const res = await axios.post("http://localhost:8081/create", form);
      if (res.data.success) {
        showPopup(`✅ ${res.data.message} · User ID: ${res.data.userId}`);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        showPopup(res.data.message, true);
      }
    } catch (error) {
      showPopup("Something went wrong: " + error.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.createWrapper}>
      {/* Left Side - Welcome Section */}
      <div className={styles.leftSection}>
        <div className={styles.welcomeContent}>
          <h1 className={styles.welcomeTitle}>JOIN US</h1>
          <h2 className={styles.welcomeSubtitle}>START YOUR JOURNEY</h2>
          <p className={styles.welcomeText}>
            Create your account and get access to comprehensive healthcare 
            services, book appointments with top doctors, and manage your 
            medical records all in one place.
          </p>
        </div>
        
        {/* Decorative Squares */}
        <div className={styles.square1}></div>
        <div className={styles.square2}></div>
        <div className={styles.square3}></div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className={styles.rightSection}>
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Create account</h2>
            <p className={styles.formSubtitle}>
              Sign up to access healthcare services
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Account Type Selector */}
            <div className={styles.roleSelector}>
              <button
                type="button"
                className={`${styles.roleTab} ${form.role === "patient" ? styles.roleTabActive : ""}`}
                onClick={() => setForm(prev => ({ ...prev, role: "patient" }))}
              >
                Patient
              </button>
              <button
                type="button"
                className={`${styles.roleTab} ${form.role === "doctor" ? styles.roleTabActive : ""}`}
                onClick={() => setForm(prev => ({ ...prev, role: "doctor" }))}
              >
                Doctor
              </button>
            </div>

            {/* Name Fields */}
            <div className={styles.nameGrid}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="fname"
                  placeholder="First Name"
                  value={form.fname}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="lname"
                  placeholder="Last Name"
                  value={form.lname}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div className={styles.inputGroup}>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={form.email}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>

            {/* Phone + OTP */}
            <div className={styles.phoneWrapper}>
              <div className={styles.inputGroup} style={{ flex: 1 }}>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  value={form.phone}
                  onChange={handleChange}
                  className={styles.input}
                  maxLength={10}
                  required
                />
              </div>
              <button
                type="button"
                className={styles.otpBtn}
                onClick={sendOTP}
                disabled={otpLoading || otpSent}
              >
                {otpLoading ? "..." : otpSent ? "✓" : "Send OTP"}
              </button>
            </div>

            {/* OTP Input */}
            {otpSent && (
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={styles.input}
                  maxLength={6}
                  required
                />
              </div>
            )}

            {/* Password Input */}
            <div className={styles.inputGroup}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password (min. 8 characters)"
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

            {/* Password Strength */}
            {form.password && (
              <div className={styles.strengthBar}>
                <div
                  className={styles.strengthFill}
                  style={{ width: strength.width, background: strength.color }}
                />
                <span className={styles.strengthLabel}>{strength.label}</span>
              </div>
            )}

            {/* Confirm Password Input */}
            <div className={styles.inputGroup}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm Password"
                value={form.confirmPassword}
                onChange={handleChange}
                className={styles.input}
                required
              />
              <button
                type="button"
                className={styles.showBtn}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {/* Create Account Button */}
            <button type="submit" className={styles.createBtn} disabled={submitting}>
              {submitting ? "Creating..." : "Create Account"}
            </button>

            {/* Error/Success Message */}
            {popup.msg && (
              <div className={`${styles.message} ${popup.isError ? styles.messageError : styles.messageSuccess}`}>
                {popup.msg}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className={styles.formFooter}>
            <span>Already have an account?</span>
            <button type="button" className={styles.signInLink} onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
