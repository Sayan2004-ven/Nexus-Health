# Patient Dashboard - Reference Design Implementation Guide

## Overview
This guide explains how to update the Patient Dashboard to match the exact reference design shown in the image.

## Key Design Changes

### 1. **Top Navigation Bar** (New)
Replace `<PatientNavbar />` with a custom top navigation:
- Logo on the left
- Navigation tabs: Dashboard, Doctors, My Appointments (active)
- User profile with avatar on the right

### 2. **Page Header with Stats** (New)
Add a header section with:
- Title: "My Appointments"
- Subtitle: "Track and manage all your bookings and meetings"
- "Book New Appointment" button
- 3 stat cards in a row:
  - Total Appointments (blue background)
  - Upcoming/Pending (yellow background)
  - Completed (green background)

### 3. **Layout Structure**
```
┌─────────────────────────────────────────────────────────┐
│ Top Navigation Bar (Logo | Tabs | User Profile)        │
├─────────────────────────────────────────────────────────┤
│ Page Header (Title | Button)                           │
│ Stats Row (3 cards)                                    │
├──────────────┬──────────────────────────────────────────┤
│   Sidebar    │   Main Content                          │
│   (280px)    │   (Appointments grouped by date)        │
│              │                                          │
│   Search     │   MON, MAY 13, 2024                     │
│   Status     │   ┌──────────────────────────┐          │
│   Doctors    │   │ Appointment Card         │          │
│   Sort       │   └──────────────────────────┘          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 4. **Sidebar Updates**
- Keep search box at top
- Status filters with colored dots (not icons)
- Doctor list with avatars
- Sort dropdown at bottom

### 5. **Main Content Updates**
- Group appointments by date with headers (e.g., "MON, MAY 13, 2024")
- Cleaner appointment cards:
  - Doctor avatar (left)
  - Doctor name and specialization
  - Time and fee (right side)
  - Status badge (right side)
  - No expand/collapse - show all info inline

### 6. **Appointment Card Layout**
```
┌────────────────────────────────────────────────────────┐
│  [Avatar]  Dr. Chetan Shah              2:17 PM  ₹1200 │
│            Cardiologist                 Kolkata  CONFIRMED │
└────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Update CSS
✅ Already done - `PatientDashboard.module.css` updated with reference design

### Step 2: Update JSX Structure

Replace the current return statement with:

```jsx
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
          <button className={styles.navTab}>Dashboard</button>
          <button className={styles.navTab}>Doctors</button>
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
          <h2 className={styles.statNumber}>{statusCounts.pending}</h2>
          <p className={styles.statLabel}>Upcoming</p>
          <p className={styles.statSubtext}>Pending</p>
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
                <span className={styles.filterLabel}>Today</span>
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
            <p>You haven't booked any appointments yet</p>
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
                  return (
                    <div key={booking.id} className={styles.appointmentCard}>
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
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  </div>
);
```

### Step 3: Add Helper Function

Add this function before the return statement:

```javascript
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
```

## Visual Comparison

### Before
- Navbar component at top
- Sidebar with icon-based filters
- Expandable appointment cards
- No date grouping
- Complex nested structure

### After
- Custom top navigation with tabs
- Clean header with stats
- Sidebar with dot-based filters
- Simple appointment cards
- Date-grouped appointments
- Cleaner, more spacious design

## Benefits

1. **Better Visual Hierarchy**: Clear separation of sections
2. **Improved Scannability**: Date headers make it easy to find appointments
3. **Cleaner Design**: Less clutter, more whitespace
4. **Better Alignment**: Everything lines up perfectly
5. **Professional Look**: Matches modern healthcare app designs

## Next Steps

1. Update the JSX structure in PatientDashboard.js
2. Test all functionality (filters, search, sort)
3. Verify responsive design on mobile
4. Test with real data
5. Get user feedback

---

**Status**: CSS Complete ✅ | JSX Update Needed ⚠️
**Date**: May 23, 2026
