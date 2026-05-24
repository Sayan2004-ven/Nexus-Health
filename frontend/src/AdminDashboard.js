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

function getInitials(first = "", last = "") {
  const initials = `${String(first).charAt(0)}${String(last).charAt(0)}`.trim();
  return initials ? initials.toUpperCase() : "U";
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

function LineChart({ points, totalRevenue }) {
  const width = 760;
  const height = 340;
  const activePoints = points.filter((point) => point.value > 0);
  const selectedPoints = (activePoints.length >= 5 ? activePoints.slice(-5) : points.slice(-5)).map((point, index) => ({
    ...point,
    step: String(index + 1).padStart(2, "0")
  }));
  const maxValue = Math.max(4, ...selectedPoints.map((point) => point.value));
  const barColors = ["#2ec5d3", "#3b82f6", "#10b981", "#f6c515", "#ff7a12"];
  const chartLeft = 68;
  const chartRight = 28;
  const chartTop = 78;
  const chartBottom = 74;
  const chartHeight = height - chartTop - chartBottom;
  const chartWidth = width - chartLeft - chartRight;
  const barWidth = 56;
  const gap = (chartWidth - barWidth * selectedPoints.length) / Math.max(selectedPoints.length - 1, 1);
  const barData = selectedPoints.map((point, index) => {
    const heightValue = (point.value / maxValue) * chartHeight;
    const x = chartLeft + index * (barWidth + gap);
    const y = chartTop + (chartHeight - heightValue);
    const color = barColors[index % barColors.length];
    return { ...point, x, y, heightValue, color };
  });
  const totalAppointments = points.reduce((sum, point) => sum + point.value, 0);
  const averageAppointments = totalAppointments / Math.max(points.length, 1);
  const gridTicks = Array.from({ length: maxValue + 1 }, (_, index) => index).slice(0, 5);

  return (
    <div className={`${styles.chartCard} ${styles.chartCardInfographic}`}>
      <div className={styles.infographicHeader}>
        <span className={styles.infographicEyebrow}>Appointments in last 30 days</span>
        <h3>Bar Graph</h3>
        <div className={styles.infographicUnderline}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className={styles.infographicChart} aria-hidden="true">
        {gridTicks.map((tick) => {
          const y = chartTop + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line x1={chartLeft} y1={y} x2={width - chartRight} y2={y} className={styles.infographicGridLine} />
              <text x={chartLeft - 12} y={y + 4} textAnchor="end" className={styles.infographicAxisText}>
                {tick}
              </text>
            </g>
          );
        })}

        {barData.map((point, index) => {
          return (
            <g key={point.step}>
              <rect
                x={point.x}
                y={point.y}
                width={barWidth}
                height={point.heightValue}
                rx="10"
                fill={point.color}
                className={styles.infographicBarSimple}
              />
              <text x={point.x + barWidth / 2} y={point.y - 10} textAnchor="middle" className={styles.infographicBarValue}>
                {point.value}
              </text>
              <text x={point.x + barWidth / 2} y={height - 38} textAnchor="middle" className={styles.infographicStepTitle}>
                {point.label}
              </text>
              <text x={point.x + barWidth / 2} y={height - 20} textAnchor="middle" className={styles.infographicStepMeta}>
                {point.step}
              </text>
            </g>
          );
        })}

        <line x1={chartLeft} y1={chartTop + chartHeight + 1} x2={width - chartRight} y2={chartTop + chartHeight + 1} className={styles.infographicBaseLine} />
      </svg>

      <div className={styles.infographicFooter}>
        <span>{totalAppointments} total bookings</span>
        <span>{averageAppointments.toFixed(2)} avg/day</span>
        <span>{formatCurrency(totalRevenue || 0)} revenue</span>
      </div>
    </div>
  );
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function describeDonutArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z"
  ].join(" ");
}

function PieChart({ users }) {
  const doctorCount = users.filter((user) => user.role === "doctor").length;
  const patientCount = users.filter((user) => user.role === "patient" || !user.role).length;
  const total = Math.max(doctorCount + patientCount, 1);
  const doctorPercent = Math.round((doctorCount / total) * 100);
  const patientPercent = Math.max(0, 100 - doctorPercent);
  const doctorAngle = (doctorCount / total) * 360;
  const center = 130;
  const outerRadius = 86;
  const innerRadius = 42;
  const depth = 12;
  const startAngle = -90;

  const segments = [
    {
      key: "doctors",
      label: "Doctors",
      value: doctorCount,
      percent: doctorPercent,
      start: startAngle,
      end: startAngle + doctorAngle,
      fill: "url(#doctorSliceGradient)",
      sideFill: "url(#doctorSliceShadow)"
    },
    {
      key: "patients",
      label: "Patients",
      value: patientCount,
      percent: patientPercent,
      start: startAngle + doctorAngle,
      end: startAngle + 360,
      fill: "url(#patientSliceGradient)",
      sideFill: "url(#patientSliceShadow)"
    }
  ];

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>Users by Role</h3>
        <span>{doctorCount + patientCount} users</span>
      </div>
      <div className={styles.pieWrap}>
        <div className={styles.pieStage}>
          <svg viewBox="0 0 260 260" className={styles.pieSvg} aria-hidden="true">
            <defs>
              <linearGradient id="doctorSliceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8cf4f6" />
                <stop offset="100%" stopColor="#20d9e0" />
              </linearGradient>
              <linearGradient id="doctorSliceShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0faeb4" />
                <stop offset="100%" stopColor="#0b8f95" />
              </linearGradient>
              <linearGradient id="patientSliceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff8b80" />
                <stop offset="55%" stopColor="#ff4433" />
                <stop offset="100%" stopColor="#e63424" />
              </linearGradient>
              <linearGradient id="patientSliceShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d63b2d" />
                <stop offset="100%" stopColor="#b62d21" />
              </linearGradient>
              <radialGradient id="donutCenterGlow" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e5e7eb" />
              </radialGradient>
              <filter id="donutShadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="rgba(15,23,42,0.22)" />
              </filter>
            </defs>

            <circle cx={center} cy={center} r="108" className={styles.pieBackdropRing} />
            <circle cx={center} cy={center} r="94" className={styles.pieOuterGuide} />

            {segments.map((segment) => (
              <path
                key={`${segment.key}-side`}
                d={describeDonutArc(center, center + depth, outerRadius, innerRadius, segment.start, segment.end)}
                fill={segment.sideFill}
                className={styles.donutSliceSide}
              />
            ))}

            {segments.map((segment) => (
              <path
                key={segment.key}
                d={describeDonutArc(center, center, outerRadius, innerRadius, segment.start, segment.end)}
                fill={segment.fill}
                filter="url(#donutShadow)"
                className={styles.donutSliceTop}
              />
            ))}

            {segments.map((segment) => {
              const midAngle = (segment.start + segment.end) / 2;
              const labelPoint = polarToCartesian(center, center, (outerRadius + innerRadius) / 2 + 4, midAngle);
              return (
                <text
                  key={`${segment.key}-label`}
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={styles.donutPercent}
                >
                  {segment.percent}%
                </text>
              );
            })}

            <circle cx={center} cy={center} r={innerRadius - 2} fill="url(#donutCenterGlow)" className={styles.donutCenterDisc} />
            <circle cx={center} cy={center - 2} r={innerRadius - 10} className={styles.donutCenterCore} />
            <path d="M112 132 L124 120 L136 129 L150 112" className={styles.donutCenterTrend} />
            <circle cx="112" cy="132" r="2.5" className={styles.donutCenterDot} />
            <circle cx="124" cy="120" r="2.5" className={styles.donutCenterDot} />
            <circle cx="136" cy="129" r="2.5" className={styles.donutCenterDot} />
            <circle cx="150" cy="112" r="2.5" className={styles.donutCenterDot} />
          </svg>

          {segments.map((segment) => (
            <div
              key={`${segment.key}-callout`}
              className={`${styles.pieCallout} ${segment.key === "doctors" ? styles.pieCalloutDoctors : styles.pieCalloutPatients}`}
            >
              <strong>{segment.percent}%</strong>
              <span>{segment.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.legendList}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendDoctor}`}></span>
            <div className={styles.legendContent}>
              <strong>Doctors</strong>
              <span>{doctorCount} members</span>
            </div>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.legendPatient}`}></span>
            <div className={styles.legendContent}>
              <strong>Patients</strong>
              <span>{patientCount} members</span>
            </div>
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

  const dashboardFooterStats = useMemo(() => {
    if (activeTab === "appointments") {
      return [
        { label: "Total appts", value: filteredAppointments.length, tone: styles.footerMetricBlue },
        { label: "Confirmed", value: filteredAppointments.filter((item) => getAppointmentStatus(item) === "confirmed").length, tone: styles.footerMetricGreen },
        { label: "Pending", value: filteredAppointments.filter((item) => getAppointmentStatus(item) === "pending").length, tone: styles.footerMetricRed },
        { label: "Today's appts", value: appointments.filter((item) => item.booking_date === new Date().toISOString().slice(0, 10)).length, tone: styles.footerMetricOrange }
      ];
    }

    return [
      { label: activeTab === "doctors" ? "Total doctors" : "Total patients", value: filteredUsers.length, tone: styles.footerMetricBlue },
      { label: "Active", value: filteredUsers.filter((item) => item.is_active).length, tone: styles.footerMetricGreen },
      { label: "Inactive", value: filteredUsers.filter((item) => !item.is_active).length, tone: styles.footerMetricRed },
      { label: "Today's appts", value: appointments.filter((item) => item.booking_date === new Date().toISOString().slice(0, 10)).length, tone: styles.footerMetricOrange }
    ];
  }, [activeTab, appointments, filteredAppointments, filteredUsers]);

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

      <div className={styles.sectionDivider} aria-hidden="true"></div>

      <div className={styles.insightsGrid}>
        <LineChart points={lineChartPoints} totalRevenue={summary?.total_revenue ?? 0} />
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
                      <td><span className={`${styles.idPill} ${styles['idColor' + (Number(appointment.id) % 6)]}`}>{appointment.id}</span></td>
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
                      <td><span className={`${styles.idPill} ${styles['idColor' + (Number(user.id) % 6)]}`}>{user.id}</span></td>
                      <td>
                        <div className={styles.userCell}>
                          <div className={`${styles.userAvatarSmall} ${styles['avatarColor' + (Number(user.id) % 6)]}`}>{getInitials(user.fname, user.lname)}</div>
                          <div>
                            <div className={styles.primaryCell}>{user.fname} {user.lname}</div>
                            <div className={styles.secondaryCell}>{user.email}</div>
                          </div>
                        </div>
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

        <div className={styles.dashboardFooterBar}>
          <div className={styles.dashboardFooterStats}>
            {dashboardFooterStats.map((item) => (
              <div key={item.label} className={styles.dashboardFooterStat}>
                <strong className={item.tone}>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.dashboardFooterRecords}>
            <span className={styles.dashboardFooterDot}></span>
            Showing {activeTab === "appointments" ? filteredAppointments.length : filteredUsers.length} of {activeTab === "appointments" ? appointments.length : activeTab === "doctors" ? doctors.length : patients.length} records
          </div>
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
                <div className={styles.detailHero}>
                  <div className={styles.detailAvatarLarge}>{getInitials(detailModal.user.fname, detailModal.user.lname)}</div>
                  <div>
                    <h4 className={styles.detailName}>{detailModal.user.fname} {detailModal.user.lname}</h4>
                    <div className={styles.detailMeta}>
                      <span className={styles.roleBadgeSmall}>{detailModal.user.role ? (detailModal.user.role === 'doctor' ? 'Doctor' : detailModal.user.role) : 'Patient'}</span>
                    </div>
                  </div>
                  <div style={{marginLeft: 'auto'}}>
                    <div className={styles.headerCheckbox}></div>
                  </div>
                </div>

                <div className={styles.detailGrid}>
                  <div className={`${styles.detailInfoCard} ${styles.infoColorBlue}`}>
                    <span className={styles.detailInfoLabel}>Name</span>
                    <div className={styles.detailInfoValue}>{detailModal.user.fname} {detailModal.user.lname}</div>
                  </div>
                  <div className={`${styles.detailInfoCard} ${styles.infoColorPink}`}>
                    <span className={styles.detailInfoLabel}>Email</span>
                    <div className={styles.detailInfoValue}>{detailModal.user.email}</div>
                  </div>

                  <div className={`${styles.detailInfoCard} ${styles.infoColorYellow}`}>
                    <span className={styles.detailInfoLabel}>Phone</span>
                    <div className={styles.detailInfoValue}>{detailModal.user.phone}</div>
                  </div>
                  <div className={`${styles.detailInfoCard} ${styles.infoColorGreen}`}>
                    <span className={styles.detailInfoLabel}>Role</span>
                    <div className={styles.detailInfoValue}>{detailModal.user.role || 'Patient'}</div>
                  </div>

                  <div className={`${styles.detailInfoCard} ${styles.infoColorBlue}`}>
                    <span className={styles.detailInfoLabel}>Registered</span>
                    <div className={styles.detailInfoValue}>{formatDateTime(detailModal.user.created_at)}</div>
                  </div>
                  <div className={`${styles.detailInfoCard} ${styles.infoColorRed}`}>
                    <span className={styles.detailInfoLabel}>Last Login</span>
                    <div className={styles.detailInfoValue}>{formatDateTime(detailModal.user.last_login)}</div>
                  </div>
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
                            <td><span className={`${styles.idPill} ${styles['idColor' + (Number(appointment.id) % 6)]} ${styles.modalIdPill}`}>{appointment.id}</span></td>
                            <td>{formatDate(appointment.booking_date)} {formatTime(appointment.booking_time)}</td>
                            <td>{appointment.doctor_name || "N/A"}</td>
                            <td>{appointment.patient_name}</td>
                            <td>
                              <span className={`${styles.statusBadge} ${styles[`status${getAppointmentStatus(appointment)[0].toUpperCase()}${getAppointmentStatus(appointment).slice(1)}`]}`}>{getAppointmentStatus(appointment)}</span>
                            </td>
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
