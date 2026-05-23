import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import styles from "./AdminDashboard.module.css";
import { useAuth } from "./AuthContext";

const API_BASE = "http://localhost:8081";

const DATE_FILTERS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" }
];

const USER_ROLE_FILTERS = [
  { value: "all", label: "All Roles" },
  { value: "patient", label: "Patients" },
  { value: "doctor", label: "Doctors" },
  { value: "admin", label: "Admins" }
];

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" }
];

const APPOINTMENT_STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" }
];

function formatDate(dateValue) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(dateValue) {
  if (!dateValue) return "N/A";
  return new Date(dateValue).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTime(timeValue) {
  if (!timeValue) return "N/A";
  const [hours, minutes] = String(timeValue).split(":");
  const date = new Date();
  date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function isWithinRange(dateValue, range) {
  if (!dateValue || range === "all") return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateValue);
  target.setHours(0, 0, 0, 0);

  if (range === "today") {
    return target.getTime() === today.getTime();
  }

  if (range === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return target >= start && target <= today;
  }

  if (range === "month") {
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    return target >= start && target <= today;
  }

  return true;
}

function getUserStatusLabel(user) {
  return user.is_active ? "Active" : "Inactive";
}

function getAppointmentStatus(appointment) {
  if (appointment.completed) return "completed";
  return appointment.status || "pending";
}

function buildCsv(rows, columns) {
  const escapeCell = (value) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const header = columns.map((column) => escapeCell(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(column.getValue(row))).join(","));
  return [header, ...body].join("\n");
}

function downloadCsv(filename, rows, columns) {
  const csv = buildCsv(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function buildFallbackSummary(users, appointments) {
  const totalDoctors = users.filter((user) => user.role === "doctor").length;
  const totalPatients = users.filter((user) => user.role === "patient" || !user.role).length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const completedRevenue = appointments.reduce((sum, appointment) => {
    if (!appointment.completed) return sum;
    return sum + Number(appointment.consultation_fee || 0);
  }, 0);

  return {
    total_users: users.length,
    total_doctors: totalDoctors,
    total_patients: totalPatients,
    total_appointments: appointments.length,
    today_appointments: appointments.filter((appointment) => appointment.booking_date === todayIso).length,
    total_revenue: completedRevenue
  };
}

function buildFallbackActivities(users, appointments) {
  const userActivities = users
    .filter((user) => user.created_at)
    .map((user) => ({
      activity_text: `${user.fname || "User"} ${user.lname || ""} registered as ${user.role === "doctor" ? "Doctor" : "Patient"}`.trim(),
      activity_time: user.created_at
    }));

  const appointmentActivities = appointments.map((appointment) => ({
    activity_text: `${appointment.patient_name} booked an appointment with Dr. ${appointment.doctor_name || "Unknown"}`,
    activity_time: appointment.created_at
  }));

  return [...userActivities, ...appointmentActivities]
    .filter((item) => item.activity_time)
    .sort((left, right) => new Date(right.activity_time) - new Date(left.activity_time))
    .slice(0, 10);
}

function LineChart({ points }) {
  const width = 520;
  const height = 220;
  const padding = 24;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const polylinePoints = points.map((point, index) => {
    const x = padding + (index / Math.max(points.length - 1, 1)) * usableWidth;
    const y = height - padding - (point.value / maxValue) * usableHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>Appointments in Last 30 Days</h3>
        <span>{points.reduce((sum, point) => sum + point.value, 0)} total</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.lineChart}>
        {[0, 1, 2, 3].map((step) => {
          const y = padding + (step / 3) * usableHeight;
          return <line key={step} x1={padding} y1={y} x2={width - padding} y2={y} className={styles.gridLine} />;
        })}
        <polyline fill="none" points={polylinePoints} className={styles.linePath} />
        {points.map((point, index) => {
          const x = padding + (index / Math.max(points.length - 1, 1)) * usableWidth;
          const y = height - padding - (point.value / maxValue) * usableHeight;
          return <circle key={point.label + index} cx={x} cy={y} r="3.5" className={styles.linePoint} />;
        })}
      </svg>
      <div className={styles.chartLabels}>
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function PieChart({ users }) {
  const doctorCount = users.filter((user) => user.role === "doctor").length;
  const patientCount = users.filter((user) => user.role === "patient" || !user.role).length;
  const total = Math.max(doctorCount + patientCount, 1);
  const doctorAngle = Math.round((doctorCount / total) * 360);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>Users by Role</h3>
        <span>{doctorCount + patientCount} users</span>
      </div>
      <div className={styles.pieWrap}>
        <div
          className={styles.pieChart}
          style={{
            background: `conic-gradient(#2b6cb0 0deg ${doctorAngle}deg, #38a169 ${doctorAngle}deg 360deg)`
          }}
        >
          <div className={styles.pieCenter}>{doctorCount + patientCount}</div>
        </div>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendDoctor}`}></span>
            Doctors: {doctorCount}
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendPatient}`}></span>
            Patients: {patientCount}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, logout } = useAuth();

  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("patients");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("all");

  const [detailModal, setDetailModal] = useState({ open: false, loading: false, user: null, appointments: [] });

  useEffect(() => {
    if (!isAdmin) {
      navigate("/admin-login");
    }
  }, [isAdmin, navigate]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [usersRes, appointmentsRes, summaryRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/all-users`),
        axios.get(`${API_BASE}/admin/appointments`),
        axios.get(`${API_BASE}/admin/dashboard-summary`)
      ]);

      if (usersRes.status !== "fulfilled" || !usersRes.value.data.success) {
        throw new Error("Could not load users");
      }

      if (appointmentsRes.status !== "fulfilled" || !appointmentsRes.value.data.success) {
        throw new Error("Could not load appointments");
      }

      const nextUsers = usersRes.value.data.users || [];
      const nextAppointments = appointmentsRes.value.data.appointments || [];
      setUsers(nextUsers);
      setAppointments(nextAppointments);

      if (summaryRes.status === "fulfilled" && summaryRes.value.data.success) {
        setSummary(summaryRes.value.data.summary || buildFallbackSummary(nextUsers, nextAppointments));
        setActivities(
          (summaryRes.value.data.activities && summaryRes.value.data.activities.length)
            ? summaryRes.value.data.activities
            : buildFallbackActivities(nextUsers, nextAppointments)
        );
      } else {
        setSummary(buildFallbackSummary(nextUsers, nextAppointments));
        setActivities(buildFallbackActivities(nextUsers, nextAppointments));
      }
    } catch (loadError) {
      console.error("Failed to load admin dashboard:", loadError);
      setError("Failed to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadDashboard();
  }, [isAdmin]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const doctors = useMemo(() => users.filter((user) => user.role === "doctor"), [users]);
  const patients = useMemo(() => users.filter((user) => user.role === "patient" || !user.role), [users]);

  const filteredUsers = useMemo(() => {
    let currentUsers = activeTab === "doctors" ? doctors : patients;

    if (roleFilter !== "all") {
      currentUsers = currentUsers.filter((user) => (user.role || "patient") === roleFilter);
    }

    if (statusFilter !== "all") {
      const shouldBeActive = statusFilter === "active";
      currentUsers = currentUsers.filter((user) => Boolean(user.is_active) === shouldBeActive);
    }

    if (dateFilter !== "all") {
      currentUsers = currentUsers.filter((user) => isWithinRange(user.created_at, dateFilter));
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      currentUsers = currentUsers.filter((user) =>
        [user.fname, user.lname, user.email, user.phone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    return currentUsers;
  }, [activeTab, dateFilter, doctors, patients, roleFilter, search, statusFilter]);

  const filteredAppointments = useMemo(() => {
    let currentAppointments = [...appointments];

    if (appointmentStatusFilter !== "all") {
      currentAppointments = currentAppointments.filter(
        (appointment) => getAppointmentStatus(appointment) === appointmentStatusFilter
      );
    }

    if (dateFilter !== "all") {
      currentAppointments = currentAppointments.filter((appointment) =>
        isWithinRange(appointment.booking_date, dateFilter)
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      currentAppointments = currentAppointments.filter((appointment) =>
        [
          appointment.patient_name,
          appointment.patient_contact,
          appointment.doctor_name,
          appointment.specialization
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      );
    }

    return currentAppointments;
  }, [appointmentStatusFilter, appointments, dateFilter, search]);

  const lineChartPoints = useMemo(() => {
    const points = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let index = 29; index >= 0; index -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      const label = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const iso = date.toISOString().slice(0, 10);
      const value = appointments.filter((appointment) => appointment.booking_date === iso).length;
      points.push({ label, value });
    }

    return points;
  }, [appointments]);

  const statCards = [
    { label: "Total Users", value: summary?.total_users ?? users.length },
    { label: "Total Doctors", value: summary?.total_doctors ?? doctors.length },
    { label: "Total Patients", value: summary?.total_patients ?? patients.length },
    { label: "Appointments", value: summary?.total_appointments ?? appointments.length },
    { label: "Today's Appts", value: summary?.today_appointments ?? 0 },
    { label: "Total Revenue", value: formatCurrency(summary?.total_revenue ?? 0), monetary: true }
  ];

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
    setAppointmentStatusFilter("all");
  };

  const toggleUserStatus = async (user) => {
    const nextStatus = !user.is_active;
    const actionLabel = nextStatus ? "activate" : "deactivate";
    if (!window.confirm(`Do you want to ${actionLabel} this user?`)) return;

    try {
      await axios.put(`${API_BASE}/admin/user-status/${user.id}`, {
        is_active: nextStatus
      });

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? { ...item, is_active: nextStatus } : item
        )
      );
    } catch (statusError) {
      alert(`Status update failed: ${statusError.message}`);
    }
  };

  const openUserDetails = async (userId) => {
    setDetailModal({ open: true, loading: true, user: null, appointments: [] });

    try {
      const response = await axios.get(`${API_BASE}/admin/user-details/${userId}`);
      setDetailModal({
        open: true,
        loading: false,
        user: response.data.user,
        appointments: response.data.appointments || []
      });
    } catch (detailError) {
      setDetailModal({
        open: true,
        loading: false,
        user: null,
        appointments: []
      });
      alert(`Could not load user details: ${detailError.message}`);
    }
  };

  const downloadUserDetails = (userId) => {
    window.open(`${API_BASE}/download-user/${userId}`, "_blank");
  };

  const exportCurrentView = () => {
    if (activeTab === "appointments") {
      downloadCsv("appointments.csv", filteredAppointments, [
        { label: "ID", getValue: (item) => item.id },
        { label: "Date", getValue: (item) => item.booking_date },
        { label: "Time", getValue: (item) => item.booking_time },
        { label: "Patient", getValue: (item) => item.patient_name },
        { label: "Phone", getValue: (item) => item.patient_contact },
        { label: "Doctor", getValue: (item) => item.doctor_name },
        { label: "Specialization", getValue: (item) => item.specialization },
        { label: "Status", getValue: (item) => getAppointmentStatus(item) }
      ]);
      return;
    }

    downloadCsv(`${activeTab}-users.csv`, filteredUsers, [
      { label: "ID", getValue: (item) => item.id },
      { label: "First Name", getValue: (item) => item.fname },
      { label: "Last Name", getValue: (item) => item.lname },
      { label: "Email", getValue: (item) => item.email },
      { label: "Phone", getValue: (item) => item.phone },
      { label: "Role", getValue: (item) => item.role || "patient" },
      { label: "Status", getValue: (item) => getUserStatusLabel(item) },
      { label: "Registered", getValue: (item) => item.created_at || "" },
      { label: "Last Login", getValue: (item) => item.last_login || "" }
    ]);
  };

  if (!isAdmin) return null;

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.topNav}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L13 4.5V10.5L8 13.5L3 10.5V4.5L8 1.5Z" stroke="white" strokeWidth="1.4" />
              <circle cx="8" cy="7.5" r="1.8" fill="white" />
            </svg>
          </div>
          <div>
            <div className={styles.logoName}>Nexus</div>
            <div className={styles.logoSub}>Admin Dashboard</div>
          </div>
        </div>

        <div className={styles.navRight}>
          <div className={styles.adminBadge}>
            <div className={styles.adminDot}></div>
            Admin Panel
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      <div className={styles.statsRow}>
        {statCards.map((card) => (
          <div key={card.label} className={styles.statCard}>
            <div className={styles.statLabel}>{card.label}</div>
            <div className={styles.statValue}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.insightsGrid}>
        <LineChart points={lineChartPoints} />
        <PieChart users={users} />
        <div className={styles.activityCard}>
          <div className={styles.chartHeader}>
            <h3>Recent Activity</h3>
            <span>{activities.length} items</span>
          </div>
          <div className={styles.activityList}>
            {activities.length ? (
              activities.map((item, index) => (
                <div key={`${item.activity_time}-${index}`} className={styles.activityItem}>
                  <div className={styles.activityDot}></div>
                  <div>
                    <div className={styles.activityText}>{item.activity_text}</div>
                    <div className={styles.activityTime}>{formatDateTime(item.activity_time)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No recent activity available.</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "patients" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("patients"); }}
        >
          <span className={styles.tabIcon}>Patients</span>
          <span className={styles.tabBadge}>{patients.length}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "doctors" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("doctors"); }}
        >
          <span className={styles.tabIcon}>Doctors</span>
          <span className={styles.tabBadge}>{doctors.length}</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "appointments" ? styles.tabBtnActive : ""}`}
          onClick={() => { setActiveTab("appointments"); }}
        >
          <span className={styles.tabIcon}>Appointments</span>
          <span className={styles.tabBadge}>{appointments.length}</span>
        </button>
      </div>

      <div className={styles.dashboardCard}>
        <div className={styles.controlHeader}>
          <div>
            <div className={styles.tableTitle}>
              {activeTab === "appointments" ? "All Appointments" : activeTab === "doctors" ? "Doctor Management" : "Patient Management"}
            </div>
            <div className={styles.tableSubtitle}>
              {activeTab === "appointments"
                ? "Monitor every booking with status and date filters."
                : "Search, filter, export, and manage user access from one place."}
            </div>
          </div>

          <div className={styles.controlActions}>
            <button className={styles.secondaryBtn} onClick={exportCurrentView}>
              Export to Excel
            </button>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <input
              type="text"
              placeholder={activeTab === "appointments" ? "Search by patient, doctor, phone..." : "Search by name, email, or phone..."}
              className={styles.search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search ? (
              <button className={styles.clearBtn} onClick={() => setSearch("")}>Clear</button>
            ) : null}
          </div>

          <select
            className={styles.select}
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          >
            {DATE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          {activeTab === "appointments" ? (
            <select
              className={styles.select}
              value={appointmentStatusFilter}
              onChange={(event) => setAppointmentStatusFilter(event.target.value)}
            >
              {APPOINTMENT_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <>
              <select
                className={styles.select}
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
              >
                {USER_ROLE_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                className={styles.select}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </>
          )}

          <button className={styles.secondaryBtn} onClick={clearFilters}>Reset Filters</button>
        </div>

        <div className={styles.tableWrapper}>
          {activeTab === "appointments" ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Specialization</th>
                  <th>Status</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.length ? (
                  filteredAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td><span className={styles.idPill}>{appointment.id}</span></td>
                      <td>
                        <div className={styles.primaryCell}>{formatDate(appointment.booking_date)}</div>
                        <div className={styles.secondaryCell}>{formatTime(appointment.booking_time)}</div>
                      </td>
                      <td>
                        <div className={styles.primaryCell}>{appointment.patient_name}</div>
                        <div className={styles.secondaryCell}>{appointment.patient_contact}</div>
                      </td>
                      <td>{appointment.doctor_name || "N/A"}</td>
                      <td>{appointment.specialization || "N/A"}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[`status${getAppointmentStatus(appointment)[0].toUpperCase()}${getAppointmentStatus(appointment).slice(1)}`]}`}>
                          {getAppointmentStatus(appointment)}
                        </span>
                      </td>
                      <td>{formatCurrency(appointment.consultation_fee || 0)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7"><div className={styles.emptyState}>No appointments found.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td><span className={styles.idPill}>{user.id}</span></td>
                      <td>
                        <div className={styles.primaryCell}>{user.fname} {user.lname}</div>
                        <div className={styles.secondaryCell}>{user.email}</div>
                      </td>
                      <td className={styles.emailCell}>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>
                        <span className={user.role === "doctor" ? styles.roleBadgeDoctor : styles.roleBadgePatient}>
                          {user.role === "doctor" ? "Doctor" : "Patient"}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${user.is_active ? styles.statusActive : styles.statusInactive}`}>
                          {getUserStatusLabel(user)}
                        </span>
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>{formatDateTime(user.last_login)}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button className={`${styles.actionBtn} ${styles.viewBtn}`} onClick={() => openUserDetails(user.id)}>View</button>
                          <button className={`${styles.actionBtn} ${styles.downloadBtn}`} onClick={() => downloadUserDetails(user.id)}>Download</button>
                          <button className={`${styles.actionBtn} ${styles.toggleBtn}`} onClick={() => toggleUserStatus(user)}>
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9"><div className={styles.emptyState}>No users found for this view.</div></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {detailModal.open ? (
        <div className={styles.modalOverlay} onClick={() => setDetailModal({ open: false, loading: false, user: null, appointments: [] })}>
          <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>User Details</h3>
              <button className={styles.closeBtn} onClick={() => setDetailModal({ open: false, loading: false, user: null, appointments: [] })}>×</button>
            </div>
            {detailModal.loading ? (
              <div className={styles.emptyState}>Loading details...</div>
            ) : detailModal.user ? (
              <>
                <div className={styles.detailGrid}>
                  <div><span className={styles.detailLabel}>Name</span><strong>{detailModal.user.fname} {detailModal.user.lname}</strong></div>
                  <div><span className={styles.detailLabel}>Email</span><strong>{detailModal.user.email}</strong></div>
                  <div><span className={styles.detailLabel}>Phone</span><strong>{detailModal.user.phone}</strong></div>
                  <div><span className={styles.detailLabel}>Role</span><strong>{detailModal.user.role || "patient"}</strong></div>
                  <div><span className={styles.detailLabel}>Registered</span><strong>{formatDateTime(detailModal.user.created_at)}</strong></div>
                  <div><span className={styles.detailLabel}>Last Login</span><strong>{formatDateTime(detailModal.user.last_login)}</strong></div>
                </div>
                <div className={styles.modalSectionTitle}>Appointment History</div>
                <div className={styles.modalTableWrap}>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Patient</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModal.appointments.length ? (
                        detailModal.appointments.map((appointment) => (
                          <tr key={appointment.id}>
                            <td>{appointment.id}</td>
                            <td>{formatDate(appointment.booking_date)} {formatTime(appointment.booking_time)}</td>
                            <td>{appointment.doctor_name || "N/A"}</td>
                            <td>{appointment.patient_name}</td>
                            <td>{getAppointmentStatus(appointment)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5"><div className={styles.emptyState}>No appointment history found.</div></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>Unable to load user details.</div>
            )}
          </div>
        </div>
      ) : null}

      {loading ? <div className={styles.loadingOverlay}>Refreshing dashboard...</div> : null}
    </div>
  );
}
