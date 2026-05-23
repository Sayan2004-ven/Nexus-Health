import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./AdminDashboard.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("patients"); // "patients" or "doctors"
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  // ✅ FIX 7: Guard — redirect anyone who isn't an admin
  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin-login");
    }
  }, [isAdmin, navigate]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;
    axios.get("http://localhost:8081/all-users")
      .then(res => {
        if (res.data.success) setUsers(res.data.users);
      })
      .catch(err => console.error("Failed to fetch users:", err));
  }, [isAdmin]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ✅ FIX 10: Added .catch() so errors aren't swallowed silently
  const deleteUser = (id) => {
    if (window.confirm("Delete this user?")) {
      axios.delete(`http://localhost:8081/delete/${id}`)
        .then(() => setUsers(users.filter(u => u.id !== id)))
        .catch(err => alert("Delete failed: " + err.message));
    }
  };

  const printUser = (user) => {
    const w = window.open("", "", "width=600,height=400");
    w.document.write(`
      <h2>${user.role === 'doctor' ? 'Doctor' : 'Patient'} Details</h2>
      <p><b>ID:</b> ${user.id}</p>
      <p><b>First Name:</b> ${user.fname}</p>
      <p><b>Last Name:</b> ${user.lname}</p>
      <p><b>Email:</b> ${user.email}</p>
      <p><b>Phone:</b> ${user.phone}</p>
      <p><b>Role:</b> ${user.role || 'patient'}</p>
    `);
    w.document.close();
    w.print();
  };

  const printAll = (filteredList) => {
    const w = window.open("", "", "width=900,height=600");
    const title = activeTab === "doctors" ? "Doctors List" : "Patients List";
    let table = `
      <h2>${title}</h2>
      <table border="1" cellpadding="10">
      <tr><th>ID</th><th>First Name</th><th>Last Name</th><th>Email</th><th>Phone</th><th>Role</th></tr>
    `;
    filteredList.forEach(u => {
      table += `<tr>
        <td>${u.id}</td><td>${u.fname}</td><td>${u.lname}</td>
        <td>${u.email}</td><td>${u.phone}</td><td>${u.role || 'patient'}</td>
      </tr>`;
    });
    table += "</table>";
    w.document.write(table);
    w.document.close();
    w.print();
  };

  // Filter by role and search
  const doctors = users.filter(u => u.role === 'doctor');
  const patients = users.filter(u => u.role === 'patient' || !u.role);
  
  const currentList = activeTab === "doctors" ? doctors : patients;
  
  const filteredUsers = currentList.filter(u =>
    u.fname.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // Don't render while redirecting
  if (!isAdmin) return null;

  return (
    <div className={styles.dashboardContainer}>

      {/* TOP NAV */}
      <div className={styles.topNav}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L13 4.5V10.5L8 13.5L3 10.5V4.5L8 1.5Z"
                stroke="white" strokeWidth="1.4"/>
              <circle cx="8" cy="7.5" r="1.8" fill="white"/>
            </svg>
          </div>
          <span className={styles.logoName}>Nexus</span>
        </div>

        <div className={styles.navRight}>
          <div className={styles.adminBadge}>
            <div className={styles.adminDot}></div>
            Admin Panel
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Users</div>
          <div className={styles.statValue}>{users.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Doctors</div>
          <div className={styles.statValue}>{doctors.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Patients</div>
          <div className={styles.statValue}>{patients.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Search Results</div>
          <div className={styles.statValue}>{filteredUsers.length}</div>
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === "patients" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("patients"); setSearch(""); }}
        >
          <span className={styles.tabIcon}>👤</span>
          Patients
          <span className={styles.tabBadge}>{patients.length}</span>
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "doctors" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("doctors"); setSearch(""); }}
        >
          <span className={styles.tabIcon}>👨‍⚕️</span>
          Doctors
          <span className={styles.tabBadge}>{doctors.length}</span>
        </button>
      </div>

      {/* TABLE CARD */}
      <div className={styles.dashboardCard}>
        <div className={styles.tableHeader}>
          <span className={styles.tableTitle}>
            {activeTab === "doctors" ? "All Doctors" : "All Patients"}
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            className={styles.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className={styles.deleteBtn}
            onClick={() => window.open("http://localhost:8081/download-all")}
          >
            ⬇ Download All
          </button>
          <button onClick={() => printAll(filteredUsers)} className={styles.deleteBtn}>Print All</button>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th><th>First Name</th><th>Last Name</th>
                <th>Email</th><th>Phone</th><th>Role</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <tr key={index}>
                    <td><span className={styles.idPill}>{user.id}</span></td>
                    <td className={styles.nameCell}>{user.fname}</td>
                    <td>{user.lname}</td>
                    <td className={styles.emailCell}>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>
                      <span className={user.role === 'doctor' ? styles.roleBadgeDoctor : styles.roleBadgePatient}>
                        {user.role === 'doctor' ? '👨‍⚕️ Doctor' : '👤 Patient'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`${styles.actionBtn} ${styles.downloadBtn}`}
                        onClick={() => window.open(`http://localhost:8081/download-user/${user.id}`)}
                      >⬇</button>
                      <button
                        className={`${styles.actionBtn} ${styles.printBtn}`}
                        style={{ marginLeft: "6px" }}
                        onClick={() => printUser(user)}
                      >🖨</button>
                      <button
                        className={`${styles.actionBtn} ${styles.deleteSmallBtn}`}
                        style={{ marginLeft: "6px" }}
                        onClick={() => deleteUser(user.id)}
                      >🗑</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className={styles.emptyState}>
                      No {activeTab === "doctors" ? "doctors" : "patients"} found
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}