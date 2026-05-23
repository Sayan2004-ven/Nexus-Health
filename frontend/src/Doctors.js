import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext";
import PatientNavbar from "./PatientNavbar";

/* ─── Injected keyframes ─────────────────────────────────────────── */
const KEYFRAMES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes livePulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(29,158,117,0.5); }
    50%       { box-shadow: 0 0 0 5px rgba(29,158,117,0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById("doctors-keyframes");
  if (!existing) {
    const style = document.createElement("style");
    style.id = "doctors-keyframes";
    style.textContent = KEYFRAMES;
    document.head.appendChild(style);
  }
}

/* ─── Star rating display ───────────────────────────────────────── */
function StarRating({ rating }) {
  return (
    <span style={{ letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{ color: star <= Math.round(rating) ? "#EF9F27" : "#e0e4e8", fontSize: 14 }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

/* ─── Doctor Card ───────────────────────────────────────────────── *//* ─── Doctor Card ───────────────────────────────────────────────── */
function DoctorCard({ d, index }) {
  const [hovered, setHovered] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  return (
    <>
      <div
        style={{
          ...s.card,
          border: hovered ? "0.5px solid #2a4060" : "0.5px solid #1a2540",
          transform: hovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 16px 40px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(123,175,212,0.07)"
            : "0 4px 12px rgba(0,0,0,0.2)",
          transition: "all 0.22s cubic-bezier(0.22,1,0.36,1)",
          animation: `fadeSlideUp 0.4s ease ${index * 0.04}s both`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Header: Avatar + Name + Specialization */}
        <div style={s.cardHeader}>
          <div style={s.avatar}>
            {String(d.name ?? "")
              .replace(/^\d+[\.\)\-\s]+/, "")
              .replace(/\s*[\(\[]?\s*(id|ID)?\s*:?\s*\d+\s*[\)\]]?\s*$/i, "")
              .trim()
              .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "DR"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.docName}>
              {String(d.name ?? "")
                .replace(/^\d+[\.\)\-\s]+/, "")
                .replace(/\s*[\(\[]?\s*(id|ID)?\s*:?\s*\d+\s*[\)\]]?\s*$/i, "")
                .trim()}
            </div>
            <div style={s.specBadge}>{d.specialization}</div>
          </div>
          <div style={s.feeBadge}>
            <span style={{ fontSize: 10, color: "#475569" }}>Fee</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: "#1D9E75" }}>₹{d.consultation_fee}</span>
          </div>
        </div>

        <div style={s.divider} />

        {/* Info rows */}
        <div style={s.infoGrid}>
          <InfoRow icon="📍" value={`${d.city}${d.address ? ` · ${d.address}` : ""}`} />
          <InfoRow icon="📞" value={d.contact} />
        </div>

        {/* Rating + Reviews */}
        <div style={s.ratingRow}>
          <StarRating rating={d.rating} />
          <span style={s.ratingNum}>{d.rating}</span>
          <span style={s.reviewCount}>({d.reviews} reviews)</span>
        </div>

        {/* Book Button */}
        <BookButton onClick={() => setShowBookingModal(true)} />
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          doctor={d}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </>
  );
}

function InfoRow({ icon, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoIcon}>{icon}</span>
      <span style={s.infoValue}>{value}</span>
    </div>
  );
}

function BookButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        ...s.bookBtn,
        background: hovered
          ? "rgba(123,175,212,0.18)"
          : "rgba(123,175,212,0.08)",
        borderColor: hovered ? "#4a80b0" : "#2a4060",
        color: hovered ? "#a8d4f0" : "#7bafd4",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Book Appointment
    </button>
  );
}

/* ─── Filter Chip ───────────────────────────────────────────────── */
function FilterChip({ children, active, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      style={{
        ...s.chip,
        ...(active ? s.chipActive : {}),
        transform: hovered && !active ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.18s ease",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

/* ─── Skeleton Loader ───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={s.skeleton}>
      <div style={{ ...s.skeletonLine, width: "40%", height: 14, marginBottom: 10 }} />
      <div style={{ ...s.skeletonLine, width: "60%", height: 10, marginBottom: 18 }} />
      <div style={{ ...s.skeletonLine, width: "80%", height: 10, marginBottom: 8 }} />
      <div style={{ ...s.skeletonLine, width: "55%", height: 10, marginBottom: 20 }} />
      <div style={{ ...s.skeletonLine, width: "100%", height: 32, borderRadius: 8 }} />
    </div>
  );
}

/* ─── Main Doctors Component ────────────────────────────────────── */
function Doctors() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [spec, setSpec] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 9;
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8081/api/doctors")
      .then(res => res.json())
      .then(data => { setDocs(data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, city, spec]);

  const cities = [...new Set(docs.map(d => d.city))].filter(Boolean).sort();
  const specs  = [...new Set(docs.map(d => d.specialization))].filter(Boolean).sort();

  const filtered = docs.filter(d =>
    (d.name?.toLowerCase().includes(search.toLowerCase()) ||
     d.specialization?.toLowerCase().includes(search.toLowerCase())) &&
    (city ? d.city === city : true) &&
    (spec ? d.specialization === spec : true)
  );

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated  = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div style={s.page}>

      {/* ── Navbar ── */}
      <PatientNavbar />

      {/* ── Main ── */}
      <main style={s.main}>

        {/* Page heading */}
        <div style={s.topRow}>
          <div>
            <h1 style={s.pageTitle}>Find a Doctor</h1>
            <p style={s.pageSub}>Browse specialists across all cities</p>
          </div>
        </div>

        {/* ── Search + Filters ── */}
        <div style={s.filterBar}>
          {/* Search input */}
          <div style={s.searchWrap}>
            <span style={s.searchIcon}>🔍</span>
            <input
              placeholder="Search by name or specialization…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={s.searchInput}
            />
          </div>

          {/* City select */}
          <div style={s.selectWrap}>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              style={s.select}
            >
              <option value="">All Cities</option>
              {cities.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Specialization select */}
          <div style={s.selectWrap}>
            <select
              value={spec}
              onChange={e => setSpec(e.target.value)}
              style={s.select}
            >
              <option value="">All Specializations</option>
              {specs.map((sp, i) => <option key={i} value={sp}>{sp}</option>)}
            </select>
          </div>

          {/* Clear filters */}
          {(search || city || spec) && (
            <button
              style={s.clearBtn}
              onClick={() => { setSearch(""); setCity(""); setSpec(""); }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Spec filter chips ── */}
        {specs.length > 0 && (
          <div style={s.chipRow}>
            <FilterChip active={spec === ""} onClick={() => setSpec("")}>All</FilterChip>
            {specs.slice(0, 8).map((sp, i) => (
              <FilterChip key={i} active={spec === sp} onClick={() => setSpec(sp)}>{sp}</FilterChip>
            ))}
          </div>
        )}

        {/* ── Grid ── */}
        {loading ? (
          <div style={s.grid}>
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : paginated.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🩺</div>
            <div style={{ color: "#94a3b8", fontSize: 16, marginBottom: 4 }}>No doctors found</div>
            <div style={{ color: "#475569", fontSize: 13 }}>Try adjusting your filters</div>
          </div>
        ) : (
          <div style={s.grid}>
            {paginated.map((d, i) => (
              <DoctorCard key={d.id ?? i} d={d} index={i} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div style={s.paginationRow}>
            <PaginationBtn disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</PaginationBtn>

            <div style={s.pageNums}>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={i} style={s.ellipsis}>…</span>
                  ) : (
                    <button
                      key={i}
                      style={{ ...s.pageNum, ...(p === page ? s.pageNumActive : {}) }}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <PaginationBtn disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</PaginationBtn>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Nav Link ──────────────────────────────────────────────────── */
function NavLink({ label, onClick, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        color: active ? "#7bafd4" : hovered ? "#cbd5e1" : "#64748b",
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        padding: "4px 0",
        borderBottom: active ? "1.5px solid #7bafd4" : "1.5px solid transparent",
        transition: "all 0.18s ease",
        fontFamily: "'DM Sans', sans-serif",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

/* ─── Pagination Button ─────────────────────────────────────────── */
function PaginationBtn({ children, disabled, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        ...s.paginationBtn,
        opacity: disabled ? 0.35 : 1,
        background: hovered && !disabled ? "rgba(123,175,212,0.1)" : "transparent",
        color: hovered && !disabled ? "#7bafd4" : "#64748b",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}

/* ─── Booking Modal ─────────────────────────────────────────────── */
function BookingModal({ doctor, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    patient_name: "",
    patient_contact: "",
    booking_date: "",
    booking_time: ""
  });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", isError: false });

  // Fetch available slots when date changes
  useEffect(() => {
    if (form.booking_date) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [form.booking_date]);

  const fetchAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const res = await axios.get(`http://localhost:8081/api/doctor-slots/${doctor.id}?date=${form.booking_date}`);
      if (res.data.success) {
        setAvailableSlots(res.data.slots);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSlotSelect = (time) => {
    setForm({ ...form, booking_time: time });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.patient_name || !form.patient_contact || !form.booking_date || !form.booking_time) {
      setMessage({ text: "Please fill all fields", isError: true });
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("http://localhost:8081/api/book-appointment", {
        doctor_id: doctor.id,
        patient_id: user?.id,
        ...form
      });

      if (res.data.success) {
        setMessage({ text: "Appointment booked successfully!", isError: false });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ text: res.data.message || "Booking failed", isError: true });
      }
    } catch (error) {
      setMessage({ text: "Error: " + error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  };

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h2 style={s.modalTitle}>Book Appointment</h2>
            <p style={s.modalSubtitle}>with {doctor.name}</p>
          </div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.modalContent}>
          <div style={s.formField}>
            <label style={s.formLabel}>Your Name *</label>
            <input
              style={s.formInput}
              type="text"
              name="patient_name"
              placeholder="Enter your full name"
              value={form.patient_name}
              onChange={handleChange}
              required
            />
          </div>

          <div style={s.formField}>
            <label style={s.formLabel}>Contact Number *</label>
            <input
              style={s.formInput}
              type="tel"
              name="patient_contact"
              placeholder="10-digit mobile number"
              value={form.patient_contact}
              onChange={handleChange}
              maxLength={10}
              required
            />
          </div>

          <div style={s.formField}>
            <label style={s.formLabel}>Appointment Date *</label>
            <input
              style={s.formInput}
              type="date"
              name="booking_date"
              value={form.booking_date}
              onChange={handleChange}
              min={today}
              required
            />
          </div>

          {form.booking_date && (
            <div style={s.formField}>
              <label style={s.formLabel}>Select Available Time Slot *</label>
              {loadingSlots ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                  Loading available slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#e26b6a", background: "#fff5f5", borderRadius: 10, border: "1px solid #fc8181" }}>
                  No slots available for this date. Please choose another date.
                </div>
              ) : (
                <div style={s.slotsGrid}>
                  {availableSlots.map(slot => (
                    <button
                      key={slot.id}
                      type="button"
                      style={{
                        ...s.slotButton,
                        ...(form.booking_time === slot.slot_time ? s.slotButtonSelected : {})
                      }}
                      onClick={() => handleSlotSelect(slot.slot_time)}
                    >
                      {formatTime(slot.slot_time)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={s.feeInfo}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Consultation Fee:</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#1D9E75" }}>₹{doctor.consultation_fee}</span>
          </div>

          {message.text && (
            <div style={{
              ...s.message,
              background: message.isError ? "rgba(226,75,74,0.1)" : "rgba(29,158,117,0.1)",
              borderColor: message.isError ? "rgba(226,75,74,0.3)" : "rgba(29,158,117,0.3)",
              color: message.isError ? "#e26b6a" : "#1D9E75"
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            style={s.submitBtn}
            disabled={submitting || !form.booking_time}
          >
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const s = {
  page:      { minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Inter', sans-serif", color: "#1a202c" },

  /* Nav */
  nav:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", borderBottom: "1px solid #e0e4e8", position: "sticky", top: 0, zIndex: 20, background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  logo:      { display: "flex", alignItems: "center", gap: 12 },
  logoMark:  { width: 40, height: 40, background: "#2b6cb0", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" },
  logoName:  { fontWeight: 700, fontSize: 22, color: "#1a202c", letterSpacing: "-0.5px", fontFamily: "'Playfair Display', serif" },
  navCenter: { display: "flex", alignItems: "center", gap: 28 },
  navRight:  { display: "flex", alignItems: "center", gap: 12 },

  livePill:  { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "#38a169", background: "#f0fff4", border: "1px solid #9ae6b4", padding: "6px 14px", borderRadius: 100, fontWeight: 600 },
  liveDot:   { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#38a169", boxShadow: "0 0 0 3px rgba(56,161,105,0.2)", animation: "livePulse 2s ease infinite" },

  /* Main */
  main:      { padding: "32px 28px" },
  topRow:    { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#1a202c", letterSpacing: "-0.5px", marginBottom: 6, fontFamily: "'Playfair Display', serif" },
  pageSub:   { fontSize: 15, color: "#4a5568" },

  /* Filter bar */
  filterBar:   { display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  searchWrap:  { display: "flex", alignItems: "center", gap: 10, background: "#ffffff", border: "1px solid #cbd5e0", borderRadius: 10, padding: "10px 16px", flex: "1 1 240px", minWidth: 200, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  searchIcon:  { fontSize: 16, flexShrink: 0, color: "#718096" },
  searchInput: { background: "transparent", border: "none", outline: "none", color: "#1a202c", fontSize: 14, fontFamily: "'Inter', sans-serif", width: "100%" },

  selectWrap: { background: "#ffffff", border: "1px solid #cbd5e0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  select:     { background: "transparent", border: "none", outline: "none", color: "#4a5568", fontSize: 14, padding: "10px 14px", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500 },

  clearBtn: { background: "#fff5f5", border: "1px solid #fc8181", color: "#e53e3e", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease", fontWeight: 600 },

  /* Chips */
  chipRow:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 24, flexWrap: "wrap" },
  chip:      { fontSize: 13, padding: "8px 16px", borderRadius: 100, border: "1px solid #cbd5e0", background: "#ffffff", color: "#4a5568", cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", fontWeight: 500 },
  chipActive: { background: "#2b6cb0", color: "#ffffff", borderColor: "#2b6cb0", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },

  /* Grid */
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 },

  /* Card */
  card: { background: "#ffffff", borderRadius: 16, padding: "24px", cursor: "default", border: "1px solid #e0e4e8", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },

  cardHeader: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 },

  avatar: {
    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
    background: "linear-gradient(135deg, #ebf8ff, #bee3f8)",
    border: "1px solid #2b6cb0",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 14, fontWeight: 700, color: "#2b6cb0",
  },

  docName:  { fontSize: 16, fontWeight: 600, color: "#1a202c", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  specBadge: { display: "inline-block", fontSize: 12, color: "#2b6cb0", background: "#ebf8ff", border: "1px solid #2b6cb0", borderRadius: 100, padding: "4px 12px", fontWeight: 600 },

  feeBadge: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 },

  divider: { height: "1px", background: "#e0e4e8", marginBottom: 14 },

  infoGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  infoRow:  { display: "flex", alignItems: "center", gap: 8 },
  infoIcon: { fontSize: 14, flexShrink: 0 },
  infoValue: { fontSize: 13, color: "#4a5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  ratingRow:    { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  ratingNum:    { fontSize: 14, fontWeight: 600, color: "#EF9F27" },
  reviewCount:  { fontSize: 13, color: "#718096" },

  bookBtn: {
    width: "100%", padding: "12px",
    border: "none",
    borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", transition: "all 0.2s ease",
    fontFamily: "'Inter', sans-serif",
    letterSpacing: "0.01em",
    background: "#2b6cb0",
    color: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  },

  /* Skeleton */
  skeleton: { background: "#ffffff", borderRadius: 16, padding: "24px", border: "1px solid #e0e4e8" },
  skeletonLine: {
    background: "linear-gradient(90deg, #f1f3f5 25%, #e9ecef 50%, #f1f3f5 75%)",
    backgroundSize: "400px 100%",
    animation: "shimmer 1.4s ease infinite",
    borderRadius: 6,
    height: 12,
  },

  /* Pagination */
  paginationRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 40 },
  paginationBtn: { fontSize: 14, padding: "10px 16px", borderRadius: 8, border: "1px solid #cbd5e0", transition: "all 0.2s ease", fontFamily: "'Inter', sans-serif", background: "#ffffff", color: "#4a5568", fontWeight: 600 },
  pageNums:      { display: "flex", alignItems: "center", gap: 6 },
  pageNum:       { width: 36, height: 36, borderRadius: 8, border: "1px solid #cbd5e0", background: "#ffffff", color: "#4a5568", fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s ease", fontWeight: 500 },
  pageNumActive: { background: "#2b6cb0", color: "#ffffff", borderColor: "#2b6cb0", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  ellipsis:      { color: "#a0aec0", fontSize: 14, padding: "0 6px" },

  empty: { textAlign: "center", padding: "80px 20px", color: "#718096", fontSize: 16 },
  
  /* Modal styles */
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, animation: "fadeIn 0.2s ease" },
  modal: { background: "#ffffff", border: "1px solid #e0e4e8", borderRadius: 16, width: "90%", maxWidth: 520, maxHeight: "90vh", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" },
  modalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 28px", borderBottom: "1px solid #e0e4e8" },
  modalTitle: { fontSize: 22, fontWeight: 700, color: "#1a202c", margin: "0 0 6px", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" },
  modalSubtitle: { fontSize: 14, color: "#4a5568", margin: 0, fontFamily: "'Inter', sans-serif" },
  modalClose: { width: 36, height: 36, background: "#f1f3f5", border: "1px solid #e0e4e8", borderRadius: 8, color: "#4a5568", fontSize: 18, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center" },
  modalContent: { padding: "24px 28px", maxHeight: "calc(90vh - 100px)", overflowY: "auto" },
  
  formField: { marginBottom: 18 },
  formLabel: { display: "block", fontSize: 13, fontWeight: 600, color: "#1a202c", marginBottom: 8, letterSpacing: "0.01em", fontFamily: "'Inter', sans-serif" },
  formInput: { width: "100%", background: "#ffffff", border: "1px solid #cbd5e0", borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "#1a202c", fontFamily: "'Inter', sans-serif", outline: "none", transition: "all 0.2s", boxSizing: "border-box" },
  formRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 },
  
  feeInfo: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: "#f0fff4", border: "1px solid #9ae6b4", borderRadius: 10, marginBottom: 18 },
  
  message: { padding: "12px 16px", borderRadius: 8, fontSize: 13, marginBottom: 18, border: "1px solid", fontFamily: "'Inter', sans-serif" },
  
  submitBtn: { width: "100%", padding: "14px", background: "#2b6cb0", border: "none", borderRadius: 10, color: "#ffffff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
  
  /* Slots Grid */
  slotsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10, marginTop: 10 },
  slotButton: { padding: "12px", background: "#f1f3f5", border: "2px solid #cbd5e0", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#1a202c", cursor: "pointer", transition: "all 0.2s", fontFamily: "'Inter', sans-serif" },
  slotButtonSelected: { background: "#2b6cb0", borderColor: "#2b6cb0", color: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" },
};

export default Doctors;