import React, { useEffect, useState } from "react";
import axios from "axios";
import styles from "./PatientDashboard.module.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import PatientNavbar from "./PatientNavbar";
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function PatientDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Track notified booking IDs to prevent duplicates
  const notifiedBookingIds = React.useRef(new Set());
  
  // Track prescriptions for each appointment
  const [prescriptions, setPrescriptions] = useState({});
  
  // Upload report modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadEligibility, setUploadEligibility] = useState({});
  
  // Track reports for each appointment
  const [appointmentReports, setAppointmentReports] = useState({});
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [expandedAppointment, setExpandedAppointment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-newest');

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    // Initial fetch with loading spinner
    fetchBookings(false);
    fetchPrescriptions();
    
    // Poll for booking updates every 30 seconds (silent updates)
    const pollInterval = setInterval(() => {
      fetchBookings(true); // Silent update - no loading spinner
      fetchPrescriptions();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(pollInterval);
  }, [user, navigate]);

  useEffect(() => {
    // Fetch reports for all completed appointments
    bookings.forEach(booking => {
      if (booking.completed) {
        fetchReportsForAppointment(booking.id);
        checkUploadEligibility(booking.id);
      }
    });
  }, [bookings]);

  const fetchBookings = (silent = false) => {
    if (!user?.id) return;
    
    // Only show loading spinner on initial load, not during polling
    if (!silent) {
      setLoading(true);
    }
    
    axios
      .get(`http://localhost:8081/api/patient-bookings/${user.id}`)
      .then((res) => {
        if (res.data.success) {
          const newBookings = res.data.bookings;
          
          // Check for status changes in bookings
          newBookings.forEach(newBooking => {
            const status = newBooking.status || 'pending';
            const notificationKey = `${newBooking.id}-${status}`;
            
            // If we haven't notified about this booking in this status
            if (!notifiedBookingIds.current.has(notificationKey)) {
              // Parse date correctly to avoid timezone shifts
              const [year, month, day] = newBooking.booking_date.split('T')[0].split('-');
              const bookingDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const formattedDate = bookingDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
              
              // Mark as notified first to prevent duplicates
              notifiedBookingIds.current.add(notificationKey);
              
              // Notify on confirmed status
              if (status === 'confirmed') {
                console.log("Creating confirmation notification for booking:", newBooking.id);
                
                addNotification({
                  id: Date.now() + Math.random(),
                  type: 'appointment_confirmed',
                  title: '✅ Appointment Confirmed',
                  message: `Dr. ${newBooking.doctor_name} confirmed your appointment on ${formattedDate} at ${formatTime(newBooking.booking_time)}`,
                  time: new Date(),
                  read: false
                });
              }
              
              // Notify on rejected status
              if (status === 'rejected') {
                console.log("Creating rejection notification for booking:", newBooking.id);
                
                addNotification({
                  id: Date.now() + Math.random(),
                  type: 'appointment_rejected',
                  title: '❌ Appointment Rejected',
                  message: `Dr. ${newBooking.doctor_name} rejected your appointment request for ${formattedDate} at ${formatTime(newBooking.booking_time)}`,
                  time: new Date(),
                  read: false
                });
              }
            }
          });
          
          setBookings(newBookings);
        }
        if (!silent) {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch bookings:", err);
        if (!silent) {
          setLoading(false);
        }
      });
  };

  const fetchPrescriptions = () => {
    if (!user?.id) return;
    
    axios
      .get(`http://localhost:8081/api/prescriptions/patient/${user.id}`)
      .then((res) => {
        if (res.data.success) {
          // Create a map of appointment_id -> prescription
          const prescriptionMap = {};
          res.data.prescriptions.forEach(prescription => {
            prescriptionMap[prescription.appointment_id] = prescription;
          });
          setPrescriptions(prescriptionMap);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch prescriptions:", err);
      });
  };

  const downloadPrescription = (prescriptionId) => {
    window.open(`http://localhost:8081/api/prescription/download/${prescriptionId}`, '_blank');
  };

  const fetchReportsForAppointment = (appointmentId) => {
    axios
      .get(`http://localhost:8081/api/reports/appointment/${appointmentId}`)
      .then((res) => {
        if (res.data.success) {
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

  const checkUploadEligibility = (appointmentId) => {
    axios
      .get(`http://localhost:8081/api/check-upload-eligibility/${appointmentId}`)
      .then((res) => {
        if (res.data.success) {
          setUploadEligibility(prev => ({
            ...prev,
            [appointmentId]: res.data
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to check eligibility:", err);
      });
  };

  const openUploadModal = (booking) => {
    setSelectedAppointment(booking);
    setShowUploadModal(true);
    setUploadFile(null);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedAppointment(null);
    setUploadFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only PDF, JPG, and PNG files are allowed.');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }
      
      setUploadFile(file);
    }
  };

  const handleUploadReport = async () => {
    if (!uploadFile || !selectedAppointment) {
      alert('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('report', uploadFile);
    formData.append('appointment_id', selectedAppointment.id);
    formData.append('patient_id', user.id);
    formData.append('doctor_id', selectedAppointment.doctor_id);
    
    try {
      const res = await axios.post('http://localhost:8081/api/upload-report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (res.data.success) {
        alert('Report uploaded successfully!');
        closeUploadModal();
        // Refresh reports for this appointment
        fetchReportsForAppointment(selectedAppointment.id);
      } else {
        alert(res.data.message || 'Failed to upload report');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload report. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const downloadReport = (reportId) => {
    window.open(`http://localhost:8081/api/report/download/${reportId}`, '_blank');
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

  const formatNotificationTime = (time) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(time)) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const cancelBooking = (bookingId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      axios
        .delete(`http://localhost:8081/api/booking/${bookingId}`)
        .then((res) => {
          if (res.data.success) {
            alert("Appointment cancelled successfully");
            fetchBookings();
          }
        })
        .catch((err) => {
          console.error("Failed to cancel booking:", err);
          alert("Failed to cancel appointment");
        });
    }
  };

  const getBookingStatus = (booking) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const status = booking.status || 'pending';
    
    // If rejected, show rejected status
    if (status === 'rejected') {
      return { status: "Rejected", className: styles.statusRejected };
    }
    
    // If marked as completed by doctor (prescription created), show completed
    if (booking.completed) {
      return { status: "Completed", className: styles.statusCompleted };
    }
    
    // If confirmed and today
    if (status === 'confirmed' && appointmentDateTime.toDateString() === now.toDateString()) {
      return { status: "Today", className: styles.statusToday };
    }
    
    // If confirmed and upcoming
    if (status === 'confirmed') {
      return { status: "Confirmed", className: styles.statusConfirmed };
    }
    
    // If pending
    if (status === 'pending') {
      return { status: "Pending", className: styles.statusPending };
    }
    
    // Default upcoming
    return { status: "Upcoming", className: styles.statusUpcoming };
  };

  const parseDateFromDB = (dateStr) => {
    // Parse date string as local date to avoid timezone shifts
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const formatDate = (dateStr) => {
    const date = parseDateFromDB(dateStr);
    if (!date) return 'N/A';
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get unique doctors for filter
  const uniqueDoctors = [...new Map(bookings.map(b => [b.doctor_id, { id: b.doctor_id, name: b.doctor_name, specialization: b.specialization }])).values()];
  
  // Filter bookings based on status, doctor, and search
  const filteredBookings = bookings.filter(booking => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDoctor = booking.doctor_name.toLowerCase().includes(query);
      const matchesSpec = booking.specialization.toLowerCase().includes(query);
      const matchesCity = booking.city.toLowerCase().includes(query);
      const matchesPatient = booking.patient_name.toLowerCase().includes(query);
      if (!matchesDoctor && !matchesSpec && !matchesCity && !matchesPatient) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const status = booking.status || 'pending';
      if (statusFilter === 'pending' && status !== 'pending') return false;
      if (statusFilter === 'confirmed' && status !== 'confirmed') return false;
      if (statusFilter === 'completed' && !booking.completed) return false;
      if (statusFilter === 'cancelled' && status !== 'rejected') return false;
    }
    
    // Doctor filter
    if (selectedDoctor && booking.doctor_id !== selectedDoctor) return false;
    
    return true;
  });
  
  // Sort bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateA = new Date(`${a.booking_date}T${a.booking_time}`);
    const dateB = new Date(`${b.booking_date}T${b.booking_time}`);
    
    if (sortBy === 'date-newest') return dateB - dateA;
    if (sortBy === 'date-oldest') return dateA - dateB;
    if (sortBy === 'doctor-name') return a.doctor_name.localeCompare(b.doctor_name);
    return 0;
  });
  
  // Count by status
  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => (b.status || 'pending') === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed' && !b.completed).length,
    completed: bookings.filter(b => b.completed).length,
    cancelled: bookings.filter(b => b.status === 'rejected').length
  };

  const upcomingBookings = bookings.filter((b) => {
    const appointmentDateTime = new Date(`${b.booking_date}T${b.booking_time}`);
    return appointmentDateTime >= new Date();
  });

  const pastBookings = bookings.filter((b) => {
    const appointmentDateTime = new Date(`${b.booking_date}T${b.booking_time}`);
    return appointmentDateTime < new Date();
  });

  // Group bookings by date
  const groupByDate = (bookings) => {
    const grouped = {};
    bookings.forEach(booking => {
      const date = parseDateFromDB(booking.booking_date);
      if (!date) return;
      
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).toUpperCase();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(booking);
    });
    return grouped;
  };

  return (
  <div className={styles.container}>
    {/* Top Navigation */}
    <nav className={styles.topNav}>
      <div className={styles.navLeft}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>NH</div>
          <span>Nexus Health</span>
        </div>
        <div className={styles.navTabs}>
          <button className={styles.navTab} onClick={() => navigate("/")}>Dashboard</button>
          <button className={styles.navTab} onClick={() => navigate("/hospitals")}>Doctors</button>
          <button className={`${styles.navTab} ${styles.active}`}>My Appointments</button>
        </div>
      </div>
      <div className={styles.navRight}>
        <div className={styles.userProfile}>
          <div className={styles.userAvatar}>
            {user?.fname?.charAt(0)}{user?.lname?.charAt(0)}
          </div>
          <span className={styles.userName}>{user?.fname}</span>
        </div>
      </div>
    </nav>

    {/* Page Header with Stats */}
    <div className={styles.pageHeader}>
      <div className={styles.headerTop}>
        <div className={styles.headerTitle}>
          <h1>My Appointments</h1>
          <p>Track and manage all your bookings and meetings</p>
        </div>
        <button className={styles.bookBtn} onClick={() => navigate("/hospitals")}>
          Book New Appointment
        </button>
      </div>
      
      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.blue}`}>
          <h2 className={styles.statNumber}>{statusCounts.all}</h2>
          <p className={styles.statLabel}>Total Appointments</p>
          <p className={styles.statSubtext}>All time</p>
        </div>
        <div className={`${styles.statCard} ${styles.yellow}`}>
          <h2 className={styles.statNumber}>{statusCounts.pending + statusCounts.confirmed}</h2>
          <p className={styles.statLabel}>Upcoming</p>
          <p className={styles.statSubtext}>Pending & Confirmed</p>
        </div>
        <div className={`${styles.statCard} ${styles.green}`}>
          <h2 className={styles.statNumber}>{statusCounts.completed}</h2>
          <p className={styles.statLabel}>Completed</p>
          <p className={styles.statSubtext}>All time</p>
        </div>
      </div>
    </div>

    {/* Main Layout */}
    <div className={styles.mainLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Search */}
        <div className={styles.searchBox}>
          <i className={`fas fa-search ${styles.searchIcon}`}></i>
          <input
            type="text"
            placeholder="Search doctor, type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filters */}
        <div className={styles.filterSection}>
          <h3 className={styles.filterTitle}>Status</h3>
          <div className={styles.filterList}>
            <div 
              className={`${styles.filterItem} ${statusFilter === 'all' ? styles.active : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              <div className={styles.filterLeft}>
                <div className={`${styles.filterDot} ${styles.all}`}></div>
                <span className={styles.filterLabel}>All</span>
              </div>
              <span className={styles.filterCount}>{statusCounts.all}</span>
            </div>
            <div 
              className={`${styles.filterItem} ${statusFilter === 'pending' ? styles.active : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              <div className={styles.filterLeft}>
                <div className={`${styles.filterDot} ${styles.today}`}></div>
                <span className={styles.filterLabel}>Pending</span>
              </div>
              <span className={styles.filterCount}>{statusCounts.pending}</span>
            </div>
            <div 
              className={`${styles.filterItem} ${statusFilter === 'confirmed' ? styles.active : ''}`}
              onClick={() => setStatusFilter('confirmed')}
            >
              <div className={styles.filterLeft}>
                <div className={`${styles.filterDot} ${styles.confirmed}`}></div>
                <span className={styles.filterLabel}>Confirmed</span>
              </div>
              <span className={styles.filterCount}>{statusCounts.confirmed}</span>
            </div>
            <div 
              className={`${styles.filterItem} ${statusFilter === 'completed' ? styles.active : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              <div className={styles.filterLeft}>
                <div className={`${styles.filterDot} ${styles.completed}`}></div>
                <span className={styles.filterLabel}>Completed</span>
              </div>
              <span className={styles.filterCount}>{statusCounts.completed}</span>
            </div>
            <div 
              className={`${styles.filterItem} ${statusFilter === 'cancelled' ? styles.active : ''}`}
              onClick={() => setStatusFilter('cancelled')}
            >
              <div className={styles.filterLeft}>
                <div className={`${styles.filterDot} ${styles.cancelled}`}></div>
                <span className={styles.filterLabel}>Cancelled</span>
              </div>
              <span className={styles.filterCount}>{statusCounts.cancelled}</span>
            </div>
          </div>
        </div>

        {/* Doctor Filters */}
        <div className={styles.filterSection}>
          <h3 className={styles.filterTitle}>Doctor</h3>
          <div className={styles.doctorList}>
            <div 
              className={`${styles.doctorItem} ${!selectedDoctor ? styles.active : ''}`}
              onClick={() => setSelectedDoctor(null)}
            >
              <div className={styles.doctorAvatar}>All</div>
              <div className={styles.doctorInfo}>
                <p className={styles.doctorName}>All Doctors</p>
                <p className={styles.doctorSpec}>{uniqueDoctors.length} doctors</p>
              </div>
            </div>
            {uniqueDoctors.map(doctor => (
              <div 
                key={doctor.id}
                className={`${styles.doctorItem} ${selectedDoctor === doctor.id ? styles.active : ''}`}
                onClick={() => setSelectedDoctor(doctor.id)}
              >
                <div className={styles.doctorAvatar}>
                  {doctor.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className={styles.doctorInfo}>
                  <p className={styles.doctorName}>Dr. {doctor.name}</p>
                  <p className={styles.doctorSpec}>{doctor.specialization}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className={styles.sortSection}>
          <h3 className={styles.filterTitle}>Sort By</h3>
          <select 
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-newest">Date: Newest First</option>
            <option value="date-oldest">Date: Oldest First</option>
            <option value="doctor-name">Doctor Name</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {loading ? (
          <div className={styles.loading}>Loading your appointments...</div>
        ) : sortedBookings.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <i className="fas fa-clipboard-list"></i>
            </div>
            <h3>No Appointments Found</h3>
            <p>{searchQuery ? 'No results match your search' : statusFilter !== 'all' ? 'Try changing your filters' : 'You haven\'t booked any appointments yet'}</p>
            {(searchQuery || statusFilter !== 'all' || selectedDoctor) && (
              <button
                className={styles.bookBtn}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSelectedDoctor(null);
                }}
                style={{marginBottom: '1rem', background: '#6b7280'}}
              >
                Clear Filters
              </button>
            )}
            <button className={styles.bookBtn} onClick={() => navigate("/hospitals")}>
              Find Doctors
            </button>
          </div>
        ) : (
          // Group appointments by date
          Object.entries(groupByDate(sortedBookings)).map(([date, appointments]) => (
            <div key={date} className={styles.dateSection}>
              <h2 className={styles.dateHeader}>{date}</h2>
              <div className={styles.appointmentsList}>
                {appointments.map((booking) => {
                  const statusInfo = getBookingStatus(booking);
                  const hasPrescription = prescriptions[booking.id];
                  const reports = appointmentReports[booking.id] || [];
                  const eligibility = uploadEligibility[booking.id];
                  const canUpload = eligibility?.eligible && booking.completed;
                  
                  const isExpanded = expandedAppointment === booking.id;
                  
                  return (
                    <div key={booking.id} className={styles.appointmentWrapper}>
                      <div 
                        className={`${styles.appointmentCard} ${isExpanded ? styles.expanded : ''}`}
                        onClick={() => setExpandedAppointment(isExpanded ? null : booking.id)}
                      >
                        <div className={styles.appointmentLeft}>
                          <div className={styles.appointmentAvatar}>
                            {booking.doctor_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div className={styles.appointmentInfo}>
                            <h3 className={styles.appointmentDoctor}>Dr. {booking.doctor_name}</h3>
                            <p className={styles.appointmentSpec}>{booking.specialization}</p>
                          </div>
                        </div>
                        <div className={styles.appointmentRight}>
                          <div className={styles.appointmentTime}>
                            <p className={styles.timeLabel}>{formatTime(booking.booking_time)}</p>
                            <p className={styles.feeLabel}>{booking.city} • ₹{booking.consultation_fee}</p>
                          </div>
                          <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                            {statusInfo.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className={styles.appointmentDetails}>
                          <div className={styles.detailsHeader}>
                            <h4>Appointment Details</h4>
                          </div>
                          
                          <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Patient:</span>
                              <span className={styles.detailValue}>{booking.patient_name}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Contact:</span>
                              <span className={styles.detailValue}>{booking.patient_contact}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Date:</span>
                              <span className={styles.detailValue}>{formatDate(booking.booking_date)}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Time:</span>
                              <span className={styles.detailValue}>{formatTime(booking.booking_time)}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Location:</span>
                              <span className={styles.detailValue}>{booking.city}</span>
                            </div>
                            <div className={styles.detailItem}>
                              <span className={styles.detailLabel}>Fee:</span>
                              <span className={styles.detailValue}>₹{booking.consultation_fee}</span>
                            </div>
                          </div>
                          
                          {/* Notes Section */}
                          {booking.completed && (
                            <div className={styles.notesSection}>
                              <h5>Notes</h5>
                              <p>Upload report within 15 days post-visit.</p>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className={styles.actionButtons}>
                            {/* Pending - Show Cancel */}
                            {booking.status === 'pending' && (
                              <button
                                className={styles.btnCancel}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelBooking(booking.id);
                                }}
                              >
                                <i className="fas fa-times"></i>
                                Cancel Appointment
                              </button>
                            )}
                            
                            {/* Completed - Show Download Prescription and Upload Report */}
                            {booking.completed && (
                              <>
                                {hasPrescription && (
                                  <button
                                    className={styles.btnDownload}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      downloadPrescription(hasPrescription.id);
                                    }}
                                  >
                                    <i className="fas fa-download"></i>
                                    Download Prescription
                                  </button>
                                )}
                                
                                {canUpload && (
                                  <button
                                    className={styles.btnUpload}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUploadModal(booking);
                                    }}
                                  >
                                    <i className="fas fa-upload"></i>
                                    Upload Report ({eligibility.daysRemaining} days left)
                                  </button>
                                )}
                                
                                {/* Show uploaded reports */}
                                {reports.length > 0 && (
                                  <div className={styles.reportsSection}>
                                    <h5>Uploaded Reports ({reports.length})</h5>
                                    <div className={styles.reportsList}>
                                      {reports.map(report => (
                                        <div key={report.id} className={styles.reportItem}>
                                          <div className={styles.reportInfo}>
                                            <i className={`fas ${report.file_type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                                            <span className={styles.reportName}>{report.report_name}</span>
                                            <span className={styles.reportDate}>
                                              {new Date(report.uploaded_at).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <button
                                            className={styles.btnDownloadReport}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              downloadReport(report.id);
                                            }}
                                          >
                                            <i className="fas fa-download"></i>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
    
    {/* Upload Report Modal */}
    {showUploadModal && selectedAppointment && (
      <div className={styles.modalOverlay} onClick={closeUploadModal}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Upload Medical Report</h2>
            <button className={styles.closeBtn} onClick={closeUploadModal}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            <div className={styles.appointmentInfo}>
              <h3>Appointment Details</h3>
              <p><strong>Doctor:</strong> Dr. {selectedAppointment.doctor_name}</p>
              <p><strong>Date:</strong> {formatDate(selectedAppointment.booking_date)}</p>
              <p><strong>Time:</strong> {formatTime(selectedAppointment.booking_time)}</p>
            </div>
            
            <div className={styles.uploadSection}>
              <label className={styles.fileInputLabel}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                />
                <div className={styles.fileInputButton}>
                  <i className="fas fa-cloud-upload-alt"></i>
                  <span>Choose File</span>
                </div>
              </label>
              
              {uploadFile && (
                <div className={styles.selectedFile}>
                  <i className={`fas ${uploadFile.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image'}`}></i>
                  <span>{uploadFile.name}</span>
                  <span className={styles.fileSize}>
                    ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              )}
              
              <p className={styles.uploadNote}>
                <i className="fas fa-info-circle"></i>
                Accepted formats: PDF, JPG, PNG (Max 5MB)
              </p>
              
              {uploadEligibility[selectedAppointment.id] && (
                <p className={styles.uploadWarning}>
                  <i className="fas fa-clock"></i>
                  {uploadEligibility[selectedAppointment.id].message}
                </p>
              )}
            </div>
          </div>
          
          <div className={styles.modalFooter}>
            <button 
              className={styles.btnSecondary} 
              onClick={closeUploadModal}
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              className={styles.btnPrimary} 
              onClick={handleUploadReport}
              disabled={!uploadFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Report'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}

