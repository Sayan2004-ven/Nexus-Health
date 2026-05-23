import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./DoctorDashboard.module.css";

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    specialization: "",
    city: "",
    address: "",
    contact: "",
    consultation_fee: "",
    rating: 4.5,
    reviews: 0
  });
  const [popup, setPopup] = useState({ msg: "", isError: false });
  const [submitting, setSubmitting] = useState(false);

  // Calendar & Bookings
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [dayBookings, setDayBookings] = useState([]);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Track notified booking IDs to prevent duplicates
  const notifiedBookingIds = React.useRef(new Set());
  
  // Prescription Modal
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    illness: '',
    symptoms: '',
    medicines: '',
    dosage: '',
    tests: '',
    notes: '',
    recheckup_date: ''
  });
  
  // Slot Management
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [allSlots, setAllSlots] = useState([]);
  
  // Patient History
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [patientHistory, setPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "doctor") {
      navigate("/login");
      return;
    }

    checkDoctorRegistration();
  }, [user, navigate]);

  // Separate effect for polling bookings
  useEffect(() => {
    if (!isRegistered || !form.id) return;

    // Initial fetch
    fetchBookings(form.id);
    fetchAllSlots(form.id);

    // Poll for new bookings every 5 seconds
    const pollInterval = setInterval(() => {
      fetchBookings(form.id);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isRegistered, form.id]);

  const checkDoctorRegistration = async () => {
    try {
      const res = await axios.get(`http://localhost:8081/api/doctor-profile/${user.id}`);
      if (res.data.success && res.data.doctor) {
        setIsRegistered(true);
        setForm(res.data.doctor);
        // Fetch bookings using the doctor's database ID (not user_id)
        if (res.data.doctor.id) {
          fetchBookings(res.data.doctor.id);
        }
      } else {
        setShowRegistrationForm(true);
      }
    } catch (error) {
      console.error("Error checking registration:", error);
      setShowRegistrationForm(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async (doctorId) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/doctor-bookings/${doctorId}`);
      if (res.data.success) {
        const newBookings = res.data.bookings;
        
        // Check for new bookings that we haven't notified about yet
        const addedBookings = newBookings.filter(b => !notifiedBookingIds.current.has(b.id));
        
        // Create notification for each new booking
        if (addedBookings.length > 0) {
          console.log(`Found ${addedBookings.length} new booking(s)!`);
          
          addedBookings.forEach(booking => {
            const bookingDate = new Date(booking.booking_date);
            const formattedDate = bookingDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            });
            
            console.log("Creating notification for:", booking.patient_name);
            
            // Add to notified set to prevent duplicates
            notifiedBookingIds.current.add(booking.id);
            
            addNotification({
              id: Date.now() + Math.random(),
              type: 'new_appointment',
              title: 'New Appointment Booked',
              message: `${booking.patient_name} booked an appointment for ${formattedDate} at ${booking.booking_time}`,
              time: new Date(),
              read: false
            });
          });
        }
        
        setBookings(newBookings);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => {
      const updated = [notification, ...prev];
      return updated;
    });
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const showPopup = (msg, isError = false) => {
    setPopup({ msg, isError });
    setTimeout(() => setPopup({ msg: "", isError: false }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.specialization || !form.city || !form.contact || !form.consultation_fee) {
      showPopup("Please fill all required fields", true);
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isRegistered 
        ? `http://localhost:8081/api/doctor-profile/${user.id}`
        : "http://localhost:8081/api/doctor-register";
      
      const method = isRegistered ? "put" : "post";
      const res = await axios[method](endpoint, { ...form, user_id: user.id });

      if (res.data.success) {
        showPopup(isRegistered ? "Profile updated successfully!" : "Registration successful!");
        setIsRegistered(true);
        setShowRegistrationForm(false);
        if (res.data.doctorId) {
          fetchBookings(res.data.doctorId);
        }
      } else {
        showPopup(res.data.message || "Something went wrong", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateStr = formatDateForDB(date);
    const filtered = bookings.filter(b => {
      const bookingDate = typeof b.booking_date === 'string' 
        ? b.booking_date.split('T')[0]
        : formatDateForDB(new Date(b.booking_date));
      return bookingDate === dateStr;
    });
    console.log("Date clicked:", dateStr, "Filtered bookings:", filtered); // Debug log
    setDayBookings(filtered);
    setShowBookingsModal(true);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await axios.delete(`http://localhost:8081/api/booking/${bookingId}`);
      if (res.data.success) {
        showPopup("Booking cancelled successfully");
        // Refresh bookings
        if (form.id) {
          fetchBookings(form.id);
        }
        // Update day bookings
        setDayBookings(dayBookings.filter(b => b.id !== bookingId));
      } else {
        showPopup(res.data.message || "Failed to cancel booking", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    }
  };

  const handleApproveBooking = async (bookingId) => {
    try {
      const res = await axios.put(`http://localhost:8081/api/booking/${bookingId}/approve`);
      if (res.data.success) {
        showPopup("Booking approved successfully");
        // Refresh bookings
        if (form.id) {
          fetchBookings(form.id);
        }
        // Update day bookings
        const updatedDayBookings = dayBookings.map(b => 
          b.id === bookingId ? { ...b, status: 'confirmed' } : b
        );
        setDayBookings(updatedDayBookings);
      } else {
        showPopup(res.data.message || "Failed to approve booking", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to reject this booking?")) return;

    try {
      const res = await axios.put(`http://localhost:8081/api/booking/${bookingId}/reject`);
      if (res.data.success) {
        showPopup("Booking rejected successfully");
        // Refresh bookings
        if (form.id) {
          fetchBookings(form.id);
        }
        // Update day bookings
        const updatedDayBookings = dayBookings.map(b => 
          b.id === bookingId ? { ...b, status: 'rejected' } : b
        );
        setDayBookings(updatedDayBookings);
      } else {
        showPopup(res.data.message || "Failed to reject booking", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    }
  };

  const handleCompleteAppointment = (booking) => {
    setSelectedBooking(booking);
    setShowPrescriptionModal(true);
    setPrescriptionForm({
      patient_age: '',
      patient_gender: '',
      illness: '',
      symptoms: '',
      medicines: '',
      dosage: '',
      tests: '',
      notes: '',
      recheckup_date: ''
    });
  };

  const handlePrescriptionChange = (e) => {
    setPrescriptionForm({
      ...prescriptionForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    
    if (!prescriptionForm.illness || !prescriptionForm.medicines || !prescriptionForm.dosage) {
      showPopup("Please fill required fields: Age, Gender, Diagnosis, Medicines, and Dosage", true);
      return;
    }

    try {
      const res = await axios.post('http://localhost:8081/api/prescription', {
        appointment_id: selectedBooking.id,
        doctor_id: form.id,
        patient_id: selectedBooking.patient_id,
        doctor_name: form.name,
        patient_name: selectedBooking.patient_name,
        patient_contact: selectedBooking.patient_contact,
        ...prescriptionForm
      });

      if (res.data.success) {
        showPopup("Prescription created successfully!");
        setShowPrescriptionModal(false);
        setSelectedBooking(null);
        // Refresh bookings
        if (form.id) {
          fetchBookings(form.id);
        }
      } else {
        showPopup(res.data.message || "Failed to create prescription", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    }
  };

  // Slot Management Functions
  const fetchAllSlots = async (doctorId) => {
    try {
      const res = await axios.get(`http://localhost:8081/api/doctor-all-slots/${doctorId}`);
      if (res.data.success) {
        setAllSlots(res.data.slots);
      }
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const handleCreateSlots = async () => {
    if (!slotDate || selectedTimes.length === 0) {
      showPopup("Please select date and at least one time slot", true);
      return;
    }

    // Validate doctor ID is available
    if (!form.id) {
      showPopup("Doctor profile not loaded. Please refresh the page.", true);
      console.error("Doctor ID is missing:", form);
      return;
    }

    console.log("Creating slots with:", {
      doctor_id: form.id,
      slot_date: slotDate,
      slot_times: selectedTimes
    });

    try {
      const res = await axios.post('http://localhost:8081/api/doctor-slots', {
        doctor_id: form.id,
        slot_date: slotDate,
        slot_times: selectedTimes
      });

      if (res.data.success) {
        showPopup("Slots created successfully!");
        setShowSlotModal(false);
        setSlotDate('');
        setSelectedTimes([]);
        fetchAllSlots(form.id);
      } else {
        showPopup(res.data.message || "Failed to create slots", true);
      }
    } catch (error) {
      console.error("Slot creation error:", error);
      showPopup("Error: " + error.message, true);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to delete this slot?")) return;

    try {
      const res = await axios.delete(`http://localhost:8081/api/doctor-slots/${slotId}`);
      if (res.data.success) {
        showPopup("Slot deleted successfully");
        fetchAllSlots(form.id);
      } else {
        showPopup(res.data.message || "Failed to delete slot", true);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
    }
  };

  const toggleTimeSelection = (time) => {
    if (selectedTimes.includes(time)) {
      setSelectedTimes(selectedTimes.filter(t => t !== time));
    } else {
      setSelectedTimes([...selectedTimes, time]);
    }
  };

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ];

  // Patient History Functions
  const handleSearchHistory = async () => {
    if (!searchPhone || searchPhone.length !== 10) {
      showPopup("Please enter a valid 10-digit phone number", true);
      return;
    }

    setLoadingHistory(true);
    try {
      const res = await axios.get(`http://localhost:8081/api/patient-history/${form.id}/${searchPhone}`);
      if (res.data.success) {
        setPatientHistory(res.data);
      } else {
        showPopup(res.data.message || "No history found with you", true);
        setPatientHistory(null);
      }
    } catch (error) {
      showPopup("Error: " + error.message, true);
      setPatientHistory(null);
    } finally {
      setLoadingHistory(false);
    }
  };

  const formatDateForDB = (date) => {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDateFromDB = (dateStr) => {
    // Parse date string as local date to avoid timezone shifts
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatNotificationTime = (time) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(time)) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const hasBookingsOnDate = (date) => {
    const dateStr = formatDateForDB(date);
    const hasBooking = bookings.some(b => {
      // Handle both date formats (YYYY-MM-DD and date objects)
      const bookingDate = typeof b.booking_date === 'string' 
        ? b.booking_date.split('T')[0] // Handle ISO date strings
        : formatDateForDB(new Date(b.booking_date));
      return bookingDate === dateStr;
    });
    return hasBooking;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gridOverlay} />

      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L13 4.5V10.5L8 13.5L3 10.5V4.5L8 1.5Z"
                stroke="#4f8ef7" strokeWidth="1.2" strokeLinejoin="round"/>
              <circle cx="8" cy="7.5" r="1.8" fill="#4f8ef7"/>
            </svg>
          </div>
          <span className={styles.logoName}>Nexus</span>
        </div>

        <div className={styles.navRight}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.fname} {user?.lname}</span>
            <span className={styles.userRole}>Doctor</span>
          </div>
          {isRegistered && !showRegistrationForm && (
            <>
              {/* Notification Bell */}
              <div className={styles.notificationWrapper}>
                <button 
                  className={styles.notificationBtn}
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge}>{unreadCount}</span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className={styles.notificationDropdown}>
                    <div className={styles.notificationHeader}>
                      <h3>Notifications</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className={styles.markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className={styles.notificationList}>
                      {notifications.length === 0 ? (
                        <div className={styles.noNotifications}>
                          <span>📭</span>
                          <p>No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            className={`${styles.notificationItem} ${notif.read ? styles.notificationRead : ''}`}
                            onClick={() => markAsRead(notif.id)}
                          >
                            <div className={styles.notificationIcon}>
                              {notif.type === 'new_appointment' ? '📅' : '✅'}
                            </div>
                            <div className={styles.notificationContent}>
                              <h4>{notif.title}</h4>
                              <p>{notif.message}</p>
                              <span className={styles.notificationTime}>
                                {formatNotificationTime(notif.time)}
                              </span>
                            </div>
                            {!notif.read && <div className={styles.unreadDot}></div>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className={styles.manageSlotsBtn} 
                onClick={() => setShowSlotModal(true)}
                title="Manage available slots"
              >
                📅 Manage Slots
              </button>
              
              <button 
                className={styles.patientHistoryBtn} 
                onClick={() => setShowHistoryModal(true)}
                title="View patient history"
              >
                📋 Patient History
              </button>
              
              <button 
                className={styles.refreshBtn} 
                onClick={() => form.id && fetchBookings(form.id)}
                title="Refresh bookings"
              >
                🔄 Refresh
              </button>
              <button 
                className={styles.editProfileBtn} 
                onClick={() => setShowRegistrationForm(true)}
              >
                Edit Profile
              </button>
            </>
          )}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        {showRegistrationForm ? (
          <RegistrationForm
            form={form}
            isRegistered={isRegistered}
            submitting={submitting}
            popup={popup}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            onCancel={isRegistered ? () => setShowRegistrationForm(false) : null}
          />
        ) : (
          <div className={styles.dashboardContent}>
            <div className={styles.welcomeSection}>
              <h1 className={styles.welcomeTitle}>Welcome, Dr. {form.name?.split(' ')[form.name?.split(' ').length - 1]}</h1>
              <p className={styles.welcomeSubtitle}>Manage your appointments and schedule</p>
            </div>

            <div className={styles.statsRow}>
              <StatCard 
                icon="📅" 
                label="Total Bookings" 
                value={bookings.length} 
                color="#4f8ef7"
              />
              <StatCard 
                icon="⏰" 
                label="Today's Appointments" 
                value={bookings.filter(b => {
                  const bookingDate = typeof b.booking_date === 'string' 
                    ? b.booking_date.split('T')[0]
                    : formatDateForDB(new Date(b.booking_date));
                  return bookingDate === formatDateForDB(new Date());
                }).length}
                color="#1dd9a0"
              />
              <StatCard 
                icon="⭐" 
                label="Rating" 
                value={form.rating || "4.5"}
                color="#EF9F27"
              />
            </div>

            <Calendar
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              hasBookingsOnDate={hasBookingsOnDate}
              onDateClick={handleDateClick}
            />
          </div>
        )}

        {/* Bookings Modal */}
        {showBookingsModal && (
          <BookingsModal
            selectedDate={selectedDate}
            dayBookings={dayBookings}
            onClose={() => setShowBookingsModal(false)}
            onCancel={handleCancelBooking}
            onApprove={handleApproveBooking}
            onReject={handleRejectBooking}
            onComplete={handleCompleteAppointment}
          />
        )}

        {/* Prescription Modal */}
        {showPrescriptionModal && (
          <PrescriptionModal
            booking={selectedBooking}
            form={prescriptionForm}
            onChange={handlePrescriptionChange}
            onSubmit={handleSubmitPrescription}
            onClose={() => {
              setShowPrescriptionModal(false);
              setSelectedBooking(null);
            }}
          />
        )}

        {/* Slot Management Modal */}
        {showSlotModal && (
          <SlotManagementModal
            slotDate={slotDate}
            setSlotDate={setSlotDate}
            selectedTimes={selectedTimes}
            toggleTimeSelection={toggleTimeSelection}
            timeSlots={timeSlots}
            allSlots={allSlots}
            onCreateSlots={handleCreateSlots}
            onDeleteSlot={handleDeleteSlot}
            onClose={() => {
              setShowSlotModal(false);
              setSlotDate('');
              setSelectedTimes([]);
            }}
          />
        )}

        {/* Patient History Modal */}
        {showHistoryModal && (
          <PatientHistoryModal
            searchPhone={searchPhone}
            setSearchPhone={setSearchPhone}
            patientHistory={patientHistory}
            loadingHistory={loadingHistory}
            onSearch={handleSearchHistory}
            onClose={() => {
              setShowHistoryModal(false);
              setSearchPhone('');
              setPatientHistory(null);
            }}
          />
        )}

        {/* Status popup */}
        {popup.msg && !showRegistrationForm && (
          <div className={`${styles.floatingPopup} ${popup.isError ? styles.popupError : ""}`}>
            <span className={styles.popupIcon}>{popup.isError ? "⚠" : "✓"}</span>
            {popup.msg}
          </div>
        )}
      </main>
    </div>
  );
}

// Registration Form Component
function RegistrationForm({ form, isRegistered, submitting, popup, handleChange, handleSubmit, onCancel }) {
  return (
    <div className={styles.formCard}>
      <div className={styles.header}>
        <h1 className={styles.heading}>
          {isRegistered ? "Update Your Profile" : "Register as a Doctor"}
        </h1>
        <p className={styles.subtitle}>
          {isRegistered 
            ? "Keep your professional information up to date"
            : "Complete your profile to appear in our doctor directory"}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>Full Name *</label>
          <input
            className={styles.input}
            type="text"
            name="name"
            placeholder="Dr. John Doe"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Specialization *</label>
          <select
            className={styles.input}
            name="specialization"
            value={form.specialization}
            onChange={handleChange}
            required
          >
            <option value="">Select specialization</option>
            <option value="Cardiologist">Cardiologist</option>
            <option value="Dermatologist">Dermatologist</option>
            <option value="Neurologist">Neurologist</option>
            <option value="Orthopedic">Orthopedic</option>
            <option value="Pediatrician">Pediatrician</option>
            <option value="Psychiatrist">Psychiatrist</option>
            <option value="General Physician">General Physician</option>
            <option value="ENT Specialist">ENT Specialist</option>
            <option value="Gynecologist">Gynecologist</option>
            <option value="Ophthalmologist">Ophthalmologist</option>
          </select>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label}>City *</label>
            <input
              className={styles.input}
              type="text"
              name="city"
              placeholder="Mumbai"
              value={form.city}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Address</label>
            <input
              className={styles.input}
              type="text"
              name="address"
              placeholder="Clinic address"
              value={form.address}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label}>Contact Number *</label>
            <input
              className={styles.input}
              type="tel"
              name="contact"
              placeholder="9876543210"
              value={form.contact}
              onChange={handleChange}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Consultation Fee (₹) *</label>
            <input
              className={styles.input}
              type="number"
              name="consultation_fee"
              placeholder="500"
              value={form.consultation_fee}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.buttonRow}>
          {onCancel && (
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={styles.btnSubmit}
            disabled={submitting}
            style={onCancel ? { flex: 1 } : {}}
          >
            {submitting ? "Saving..." : (
              isRegistered ? "Update Profile" : "Complete Registration"
            )}
          </button>
        </div>
      </form>

      {popup.msg && (
        <p className={`${styles.popup} ${popup.isError ? styles.popupError : ""}`}>
          <span className={styles.popupIcon}>{popup.isError ? "⚠" : "✓"}</span>
          {popup.msg}
        </p>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ color }}>{icon}</div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// Calendar Component
function Calendar({ currentDate, setCurrentDate, hasBookingsOnDate, onDateClick }) {
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const today = new Date();
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isPastDate = (date) => {
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return compareDate < todayDate;
  };

  const days = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className={styles.calendarDayEmpty} />);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isToday = date.toDateString() === today.toDateString();
    const isPast = isPastDate(date);
    const hasBookings = hasBookingsOnDate(date);
    
    days.push(
      <CalendarDay
        key={day}
        day={day}
        date={date}
        isToday={isToday}
        isPast={isPast}
        hasBookings={hasBookings}
        onClick={() => onDateClick(date)}
      />
    );
  }

  return (
    <div className={styles.calendarCard}>
      {/* Header with month/year and navigation */}
      <div className={styles.calendarHeader}>
        <div className={styles.calendarTitleSection}>
          <h2 className={styles.calendarTitle}>
            {monthNames[currentDate.getMonth()]}
          </h2>
          <span className={styles.calendarYear}>{currentDate.getFullYear()}</span>
        </div>
        
        <div className={styles.calendarControls}>
          <button 
            className={styles.todayBtn} 
            onClick={goToToday}
            title="Go to today"
          >
            Today
          </button>
          <div className={styles.calendarNav}>
            <button className={styles.navBtn} onClick={prevMonth} title="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <button className={styles.navBtn} onClick={nextMonth} title="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.calendarLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: '#4f8ef7' }} />
          <span>Today</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendDot} style={{ background: '#e24b4a' }} />
          <span>Has Bookings</span>
        </div>
      </div>
      
      {/* Weekday headers */}
      <div className={styles.calendarWeekdays}>
        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
          <div key={day} className={styles.weekday}>
            <span className={styles.weekdayFull}>{day}</span>
            <span className={styles.weekdayShort}>{day.slice(0, 3)}</span>
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className={styles.calendarGrid}>
        {days}
      </div>
    </div>
  );
}

// Individual Calendar Day Component
function CalendarDay({ day, date, isToday, isPast, hasBookings, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        ${styles.calendarDay} 
        ${styles.calendarDayActive}
        ${isToday ? styles.calendarDayToday : ''}
        ${isPast ? styles.calendarDayPast : ''}
        ${hasBookings ? styles.calendarDayHasBookings : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.dayContent}>
        <span className={styles.dayNumber}>{day}</span>
        {hasBookings && (
          <div className={styles.bookingBadge}>
            <span className={styles.bookingIndicator} />
          </div>
        )}
      </div>
      
      {isHovered && hasBookings && (
        <div className={styles.dayTooltip}>
          Click to view appointments
        </div>
      )}
    </div>
  );
}

// Bookings Modal Component
function BookingsModal({ selectedDate, dayBookings, onClose, onCancel, onApprove, onReject, onComplete }) {
  const [appointmentReports, setAppointmentReports] = React.useState({});
  const [appointmentPrescriptions, setAppointmentPrescriptions] = React.useState({});
  const [expandedAppointments, setExpandedAppointments] = React.useState({});
  
  // Fetch prescriptions and reports for completed appointments
  React.useEffect(() => {
    dayBookings.forEach(booking => {
      if (booking.completed) {
        fetchPrescriptionForAppointment(booking.id);
        fetchReportsForAppointment(booking.id);
      }
    });
  }, [dayBookings]);
  
  const fetchPrescriptionForAppointment = (appointmentId) => {
    axios
      .get(`http://localhost:8081/api/prescription/appointment/${appointmentId}`)
      .then((res) => {
        if (res.data.success) {
          setAppointmentPrescriptions(prev => ({
            ...prev,
            [appointmentId]: res.data.prescription
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch prescription:", err);
      });
  };
  
  const fetchReportsForAppointment = (appointmentId) => {
    axios
      .get(`http://localhost:8081/api/reports/appointment/${appointmentId}`)
      .then((res) => {
        if (res.data.success && res.data.reports.length > 0) {
          setAppointmentReports(prev => ({
            ...prev,
            [appointmentId]: res.data.reports
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch reports:", err);
      });
  };
  
  const downloadReport = (reportId) => {
    window.open(`http://localhost:8081/api/report/download/${reportId}`, '_blank');
  };
  
  const downloadPrescription = (prescriptionId) => {
    window.open(`http://localhost:8081/api/prescription/download/${prescriptionId}`, '_blank');
  };
  
  const toggleExpanded = (bookingId) => {
    setExpandedAppointments(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending' },
      confirmed: { bg: '#d1fae5', color: '#065f46', text: 'Confirmed' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected' }
    };
    
    const style = statusStyles[status] || statusStyles.pending;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {style.text}
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Appointments for {formatDate(selectedDate)}
          </h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.modalContent}>
          {dayBookings.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📅</div>
              <p className={styles.emptyText}>No appointments scheduled for this day</p>
            </div>
          ) : (
            <div className={styles.bookingsList}>
              {dayBookings.map((booking) => {
                const prescription = appointmentPrescriptions[booking.id];
                const reports = appointmentReports[booking.id] || [];
                const isExpanded = expandedAppointments[booking.id];
                
                return (
                  <div key={booking.id} className={styles.bookingItem}>
                    <div className={styles.bookingTime}>
                      <span className={styles.timeIcon}>🕐</span>
                      <span className={styles.timeText}>{booking.booking_time}</span>
                    </div>
                    <div className={styles.bookingDetails}>
                      <div className={styles.patientName}>{booking.patient_name}</div>
                      <div className={styles.patientContact}>{booking.patient_contact}</div>
                      <div style={{ marginTop: '8px' }}>
                        {getStatusBadge(booking.status || 'pending')}
                      </div>
                    </div>
                    <div className={styles.bookingActions}>
                      {(!booking.status || booking.status === 'pending') && !booking.completed && (
                        <>
                          <button
                            className={styles.approveBtn}
                            onClick={() => onApprove(booking.id)}
                            title="Approve booking"
                          >
                            ✓ Approve
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => onReject(booking.id)}
                            title="Reject booking"
                          >
                            ✕ Reject
                          </button>
                        </>
                      )}
                      {booking.status === 'confirmed' && !booking.completed && (
                        <>
                          <button
                            className={styles.completeBtn}
                            onClick={() => onComplete(booking)}
                            title="Complete appointment & create prescription"
                          >
                            ✓ Complete
                          </button>
                          <button
                            className={styles.cancelBtn}
                            onClick={() => onCancel(booking.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {booking.completed && (
                        <>
                          <span className={styles.completedBadge}>
                            ✓ Completed
                          </span>
                          {(prescription || reports.length > 0) && (
                            <button
                              className={styles.viewDetailsBtn}
                              onClick={() => toggleExpanded(booking.id)}
                            >
                              {isExpanded ? '▲ Hide Details' : '▼ View Details'}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Expanded Details Section */}
                    {booking.completed && isExpanded && (
                      <div className={styles.expandedDetails}>
                        {/* Prescription Section */}
                        {prescription && (
                          <div className={styles.prescriptionSection}>
                            <div className={styles.sectionHeader}>
                              <h4>💊 Prescription</h4>
                              <button
                                className={styles.downloadBtn}
                                onClick={() => downloadPrescription(prescription.id)}
                              >
                                <i className="fas fa-download"></i> Download PDF
                              </button>
                            </div>
                            <div className={styles.prescriptionContent}>
                              {prescription.illness && (
                                <div className={styles.detailRow}>
                                  <strong>Diagnosis:</strong>
                                  <span>{prescription.illness}</span>
                                </div>
                              )}
                              {prescription.symptoms && (
                                <div className={styles.detailRow}>
                                  <strong>Symptoms:</strong>
                                  <span>{prescription.symptoms}</span>
                                </div>
                              )}
                              {prescription.medicines && (
                                <div className={styles.detailRow}>
                                  <strong>Medicines:</strong>
                                  <span>{prescription.medicines}</span>
                                </div>
                              )}
                              {prescription.dosage && (
                                <div className={styles.detailRow}>
                                  <strong>Dosage:</strong>
                                  <span>{prescription.dosage}</span>
                                </div>
                              )}
                              {prescription.tests && (
                                <div className={styles.detailRow}>
                                  <strong>Tests:</strong>
                                  <span>{prescription.tests}</span>
                                </div>
                              )}
                              {prescription.notes && (
                                <div className={styles.detailRow}>
                                  <strong>Notes:</strong>
                                  <span>{prescription.notes}</span>
                                </div>
                              )}
                              {prescription.recheckup_date && (
                                <div className={styles.detailRow}>
                                  <strong>Follow-up:</strong>
                                  <span>{new Date(prescription.recheckup_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Reports Section */}
                        {reports.length > 0 && (
                          <div className={styles.reportsSection}>
                            <div className={styles.sectionHeader}>
                              <h4>📄 Patient Uploaded Reports ({reports.length})</h4>
                            </div>
                            <div className={styles.reportsList}>
                              {reports.map(report => (
                                <div key={report.id} className={styles.reportItem}>
                                  <div className={styles.reportInfo}>
                                    <i className={`fas ${report.file_type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}`} 
                                       style={{ color: report.file_type === 'application/pdf' ? '#ef4444' : '#3b82f6', fontSize: '1.5rem' }}></i>
                                    <div className={styles.reportDetails}>
                                      <span className={styles.reportName}>{report.report_name}</span>
                                      <span className={styles.reportMeta}>
                                        Uploaded: {new Date(report.uploaded_at).toLocaleDateString()} • 
                                        {(report.file_size / 1024 / 1024).toFixed(2)} MB
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    className={styles.btnDownloadReport}
                                    onClick={() => downloadReport(report.id)}
                                    title="Download Report"
                                  >
                                    <i className="fas fa-download"></i> Download
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {!prescription && reports.length === 0 && (
                          <div className={styles.noDetails}>
                            <p>No prescription or reports available for this appointment</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Prescription Modal Component
function PrescriptionModal({ booking, form, onChange, onSubmit, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.prescriptionModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            Create Prescription
          </h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        
        <div className={styles.modalContent}>
          <div className={styles.patientInfo}>
            <p><strong>Patient:</strong> {booking?.patient_name}</p>
            <p><strong>Contact:</strong> {booking?.patient_contact}</p>
            <p><strong>Date:</strong> {new Date(booking?.booking_date).toLocaleDateString()}</p>
          </div>

          <form onSubmit={onSubmit} className={styles.prescriptionForm}>
            {/* Patient Demographics */}
            <div className={styles.fieldRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Patient Age *</label>
                <input
                  className={styles.input}
                  type="number"
                  name="patient_age"
                  placeholder="e.g., 35"
                  value={form.patient_age}
                  onChange={onChange}
                  min="0"
                  max="150"
                  required
                />
              </div>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Gender *</label>
                <select
                  className={styles.input}
                  name="patient_gender"
                  value={form.patient_gender}
                  onChange={onChange}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Diagnosis / Cause of Illness *</label>
              <input
                className={styles.input}
                type="text"
                name="illness"
                placeholder="e.g., Viral Fever, Common Cold"
                value={form.illness}
                onChange={onChange}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Symptoms</label>
              <textarea
                className={styles.textarea}
                name="symptoms"
                placeholder="e.g., High fever, headache, body pain"
                value={form.symptoms}
                onChange={onChange}
                rows="3"
              />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Prescribed Medicines * (One per line)</label>
                <textarea
                  className={styles.textarea}
                  name="medicines"
                  placeholder="e.g.,&#10;Paracetamol 500mg&#10;Cetirizine 10mg&#10;Amoxicillin 250mg"
                  value={form.medicines}
                  onChange={onChange}
                  rows="5"
                  required
                />
              </div>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Dosage Instructions * (One per line)</label>
                <textarea
                  className={styles.textarea}
                  name="dosage"
                  placeholder="e.g.,&#10;1 tablet twice daily after meals&#10;1 tablet at bedtime&#10;1 capsule three times daily"
                  value={form.dosage}
                  onChange={onChange}
                  rows="5"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Recommended Tests</label>
              <textarea
                className={styles.textarea}
                name="tests"
                placeholder="e.g., Complete Blood Count (CBC), Blood Sugar Test, X-Ray Chest"
                value={form.tests}
                onChange={onChange}
                rows="2"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Follow-up / Recheckup Date</label>
              <input
                className={styles.input}
                type="date"
                name="recheckup_date"
                value={form.recheckup_date}
                onChange={onChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Additional Notes</label>
              <textarea
                className={styles.textarea}
                name="notes"
                placeholder="e.g., Drink plenty of water, take rest, avoid cold beverages"
                value={form.notes}
                onChange={onChange}
                rows="2"
              />
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.btnSubmit}
              >
                Generate Prescription
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


// Slot Management Modal Component
function SlotManagementModal({ slotDate, setSlotDate, selectedTimes, toggleTimeSelection, timeSlots, allSlots, onCreateSlots, onDeleteSlot, onClose }) {
  const [activeTab, setActiveTab] = useState('create');

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.slotModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Manage Appointment Slots</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabContainer}>
          <button 
            className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Slots
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'view' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('view')}
          >
            View All Slots ({allSlots.length})
          </button>
        </div>

        <div className={styles.modalContent}>
          {activeTab === 'create' ? (
            <div className={styles.createSlotSection}>
              <div className={styles.field}>
                <label className={styles.label}>Select Date *</label>
                <input
                  className={styles.input}
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Select Time Slots * (Click to select multiple)</label>
                <div className={styles.timeGrid}>
                  {timeSlots.map(time => (
                    <button
                      key={time}
                      type="button"
                      className={`${styles.timeSlot} ${selectedTimes.includes(time) ? styles.timeSlotSelected : ''}`}
                      onClick={() => toggleTimeSelection(time)}
                    >
                      {formatTime(time)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.selectedInfo}>
                <strong>Selected:</strong> {selectedTimes.length} slot(s)
                {selectedTimes.length > 0 && (
                  <span> - {selectedTimes.map(t => formatTime(t)).join(', ')}</span>
                )}
              </div>

              <button
                className={styles.btnSubmit}
                onClick={onCreateSlots}
                disabled={!slotDate || selectedTimes.length === 0}
              >
                Create {selectedTimes.length} Slot(s)
              </button>
            </div>
          ) : (
            <div className={styles.viewSlotsSection}>
              {allSlots.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📅</div>
                  <p className={styles.emptyText}>No slots created yet</p>
                </div>
              ) : (
                <div className={styles.slotsList}>
                  {allSlots.map(slot => (
                    <div key={slot.id} className={styles.slotItem}>
                      <div className={styles.slotInfo}>
                        <div className={styles.slotDate}>
                          📅 {formatDate(slot.slot_date)}
                        </div>
                        <div className={styles.slotTime}>
                          🕐 {formatTime(slot.slot_time)}
                        </div>
                      </div>
                      <div className={styles.slotActions}>
                        <span className={`${styles.slotStatus} ${slot.is_available ? styles.slotAvailable : styles.slotBooked}`}>
                          {slot.is_available ? '✓ Available' : '✗ Booked'}
                        </span>
                        {slot.is_available && (
                          <button
                            className={styles.deleteSlotBtn}
                            onClick={() => onDeleteSlot(slot.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// Patient History Modal Component
function PatientHistoryModal({ searchPhone, setSearchPhone, patientHistory, loadingHistory, onSearch, onClose }) {
  const [appointmentReports, setAppointmentReports] = React.useState({});
  const [expandedDates, setExpandedDates] = React.useState({});
  
  // Fetch reports for all appointments when history is loaded
  React.useEffect(() => {
    if (patientHistory && patientHistory.groupedHistory) {
      Object.values(patientHistory.groupedHistory).forEach(records => {
        records.forEach(record => {
          if (record.completed) {
            fetchReportsForAppointment(record.id);
          }
        });
      });
    }
  }, [patientHistory]);
  
  const fetchReportsForAppointment = (appointmentId) => {
    axios
      .get(`http://localhost:8081/api/reports/appointment/${appointmentId}`)
      .then((res) => {
        if (res.data.success && res.data.reports.length > 0) {
          setAppointmentReports(prev => ({
            ...prev,
            [appointmentId]: res.data.reports
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to fetch reports:", err);
      });
  };
  
  const downloadReport = (reportId) => {
    window.open(`http://localhost:8081/api/report/download/${reportId}`, '_blank');
  };
  
  const downloadPrescription = (prescriptionId) => {
    window.open(`http://localhost:8081/api/prescription/download/${prescriptionId}`, '_blank');
  };
  
  const toggleDateExpanded = (appointmentId) => {
    setExpandedDates(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { bg: '#fef3c7', color: '#92400e', text: 'Pending' },
      confirmed: { bg: '#d1fae5', color: '#065f46', text: 'Confirmed' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected' }
    };
    
    const style = statusStyles[status] || statusStyles.pending;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        {style.text}
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.historyModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Patient Medical History</h2>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalContent}>
          {/* Search Section */}
          <div className={styles.searchSection}>
            <div className={styles.field}>
              <label className={styles.label}>Enter Patient Phone Number</label>
              <div className={styles.searchRow}>
                <input
                  className={styles.input}
                  type="tel"
                  placeholder="10-digit phone number"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  maxLength={10}
                  onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                />
                <button
                  className={styles.searchBtn}
                  onClick={onSearch}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? 'Searching...' : '🔍 Search'}
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {loadingHistory ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading patient history...</p>
            </div>
          ) : patientHistory ? (
            <div className={styles.historyResults}>
              {/* Phone Number Header */}
              <div className={styles.phoneHeader}>
                <h3>📞 {searchPhone}</h3>
                <div className={styles.phoneStats}>
                  <span>{patientHistory.totalPatients} Patient(s)</span>
                  <span>•</span>
                  <span>{patientHistory.totalVisits} Total Visit(s)</span>
                </div>
              </div>

              {/* Grouped by Patient Name */}
              {Object.entries(patientHistory.groupedHistory).map(([patientName, records]) => (
                <div key={patientName} className={styles.patientGroup}>
                  {/* Patient Info Header */}
                  <div className={styles.patientInfoHeader}>
                    <div className={styles.patientAvatar}>
                      {patientName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'PT'}
                    </div>
                    <div>
                      <h3 className={styles.patientName}>{patientName}</h3>
                      <p className={styles.totalVisits}>{records.length} visit(s) with you</p>
                    </div>
                  </div>

                  {/* Visit Dates List */}
                  <div className={styles.visitsList}>
                    {records.map((record) => {
                      const isExpanded = expandedDates[record.id];
                      const reports = appointmentReports[record.id] || [];
                      
                      return (
                        <div key={record.id} className={styles.visitCard}>
                          {/* Date Header - Clickable */}
                          <div 
                            className={styles.visitHeader}
                            onClick={() => toggleDateExpanded(record.id)}
                          >
                            <div className={styles.visitDateInfo}>
                              <div className={styles.visitDate}>
                                📅 {formatDate(record.booking_date)}
                              </div>
                              <div className={styles.visitTime}>
                                🕐 {formatTime(record.booking_time)}
                              </div>
                            </div>
                            <div className={styles.visitStatus}>
                              {getStatusBadge(record.status || 'pending')}
                              {record.completed && (
                                <span className={styles.completedBadge}>
                                  ✓ Completed
                                </span>
                              )}
                              {record.completed && (record.prescription_id || reports.length > 0) && (
                                <button className={styles.expandBtn}>
                                  {isExpanded ? '▲' : '▼'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && record.completed && (
                            <div className={styles.visitDetails}>
                              {/* Prescription Section */}
                              {record.prescription_id && (
                                <div className={styles.prescriptionSection}>
                                  <div className={styles.sectionHeader}>
                                    <h4>💊 Prescription</h4>
                                    <button
                                      className={styles.downloadBtn}
                                      onClick={() => downloadPrescription(record.prescription_id)}
                                    >
                                      <i className="fas fa-download"></i> Download PDF
                                    </button>
                                  </div>
                                  <div className={styles.prescriptionContent}>
                                    {record.illness && (
                                      <div className={styles.detailRow}>
                                        <strong>Diagnosis:</strong>
                                        <span>{record.illness}</span>
                                      </div>
                                    )}
                                    {record.symptoms && (
                                      <div className={styles.detailRow}>
                                        <strong>Symptoms:</strong>
                                        <span>{record.symptoms}</span>
                                      </div>
                                    )}
                                    {record.medicines && (
                                      <div className={styles.detailRow}>
                                        <strong>Medicines:</strong>
                                        <span>{record.medicines}</span>
                                      </div>
                                    )}
                                    {record.dosage && (
                                      <div className={styles.detailRow}>
                                        <strong>Dosage:</strong>
                                        <span>{record.dosage}</span>
                                      </div>
                                    )}
                                    {record.tests && (
                                      <div className={styles.detailRow}>
                                        <strong>Tests:</strong>
                                        <span>{record.tests}</span>
                                      </div>
                                    )}
                                    {record.notes && (
                                      <div className={styles.detailRow}>
                                        <strong>Notes:</strong>
                                        <span>{record.notes}</span>
                                      </div>
                                    )}
                                    {record.recheckup_date && (
                                      <div className={styles.detailRow}>
                                        <strong>Follow-up:</strong>
                                        <span>{formatDate(record.recheckup_date)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Patient Reports Section */}
                              {reports.length > 0 && (
                                <div className={styles.reportsSection}>
                                  <div className={styles.reportsSectionHeader}>
                                    <strong>📄 Patient Uploaded Reports ({reports.length})</strong>
                                  </div>
                                  <div className={styles.reportsList}>
                                    {reports.map(report => (
                                      <div key={report.id} className={styles.reportItem}>
                                        <div className={styles.reportInfo}>
                                          <i className={`fas ${report.file_type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}`} 
                                             style={{ color: report.file_type === 'application/pdf' ? '#ef4444' : '#3b82f6' }}></i>
                                          <div className={styles.reportDetails}>
                                            <span className={styles.reportName}>{report.report_name}</span>
                                            <span className={styles.reportMeta}>
                                              Uploaded: {formatDate(report.uploaded_at)} • 
                                              {(report.file_size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                          </div>
                                        </div>
                                        <button
                                          className={styles.btnDownloadReport}
                                          onClick={() => downloadReport(report.id)}
                                          title="Download Report"
                                        >
                                          <i className="fas fa-download"></i> Download
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {!record.prescription_id && reports.length === 0 && (
                                <div className={styles.noDetails}>
                                  <p>No prescription or reports available for this visit</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Not Completed Message */}
                          {!record.completed && (
                            <div className={styles.pendingVisit}>
                              Appointment not completed yet
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔍</div>
              <p className={styles.emptyText}>Enter a phone number to view patient's history with you</p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 8 }}>
                You can only view patients who have visited you
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
