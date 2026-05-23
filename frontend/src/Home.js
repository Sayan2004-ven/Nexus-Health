import React from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="homeWrapper">
      {/* Left Side - Welcome Section with Curved Design */}
      <div className="leftSection">
        <div className="curveDecoration"></div>
        <div className="welcomeContent">
          <div className="logoSection">
            <div className="logoCircle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="logoText">Nexus Health</span>
          </div>

          <h1 className="welcomeTitle">Welcome Back!</h1>
          <p className="welcomeSubtitle">
            Your trusted healthcare platform.<br />
            Please login with your personal info
          </p>

          <button className="signInBtn" onClick={() => navigate("/login")}>
            <span>SIGN IN</span>
          </button>

          <div className="accountLinks">
            <button onClick={() => navigate("/create")}>
              <span>OR CREATE HERE</span>
            </button>
            <span className="divider">|</span>
            <button onClick={() => navigate("/admin-login")}>
              <span>ADMIN HERE</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Side - Info Section */}
      <div className="rightSection">
        <div className="infoContent">
          <h2 className="infoTitle">Find care, fast.</h2>
          <p className="infoText">
            Check real-time bed availability across 48+ hospitals, 
            book instantly, and track ambulances live. Your complete 
            healthcare solution in one platform.
          </p>

          <div className="statsContainer">
            <div className="statCard">
              <div className="statIcon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="statInfo">
                <span className="statNumber">48+</span>
                <span className="statLabel">Hospitals</span>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              </div>
              <div className="statInfo">
                <span className="statNumber">1.2k</span>
                <span className="statLabel">Beds Live</span>
              </div>
            </div>

            <div className="statCard">
              <div className="statIcon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"/>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div className="statInfo">
                <span className="statNumber">&lt;4m</span>
                <span className="statLabel">Avg Dispatch</span>
              </div>
            </div>
          </div>

          <div className="featuresList">
            <div className="featureItem">
              <div className="featureDot"></div>
              <span>Real-time bed availability updates</span>
            </div>
            <div className="featureItem">
              <div className="featureDot"></div>
              <span>Instant hospital booking system</span>
            </div>
            <div className="featureItem">
              <div className="featureDot"></div>
              <span>Emergency ambulance tracking</span>
            </div>
            <div className="featureItem">
              <div className="featureDot"></div>
              <span>Multi-hospital comparison dashboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
