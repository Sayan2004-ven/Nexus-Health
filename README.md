# Nexus Health - Healthcare Management System

A comprehensive healthcare management platform built with React and Node.js, featuring appointment booking, prescription management, and real-time notifications.

## 🌟 Features

### For Patients
- **User Registration & Login** with OTP verification
- **Doctor Search & Booking** - Browse doctors by specialization and location
- **Appointment Management** - View upcoming and past appointments
- **Real-time Notifications** - Get notified when appointments are confirmed/rejected
- **Prescription Download** - Download prescriptions as professional PDFs
- **Medical Report Upload** - Upload reports within 10 days of consultation
- **Appointment History** - Track all your medical visits

### For Doctors
- **Doctor Registration** - Create professional profile with specialization
- **Beautiful Calendar View** - Modern gradient calendar with booking indicators
- **Slot Management** - Create and manage available time slots
- **Appointment Handling** - Approve, reject, or complete appointments
- **Prescription Generation** - Create professional PDF prescriptions with:
  - Column-based medicine and dosage layout
  - Patient demographics (age, gender)
  - Diagnosis, symptoms, tests, and follow-up dates
- **Patient History** - View patient visit history by phone number
- **Report Viewing** - Access patient-uploaded medical reports

### For Admins
- **User Management** - View all patients and doctors
- **Dashboard Analytics** - Monitor system usage
- **User Data Export** - Download user data as PDF

## 🎨 Design Highlights

- **Modern UI** with gradient themes and smooth animations
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Professional Color Schemes**:
  - Login: Blue theme
  - Registration: Teal/Green theme
  - Admin: Purple theme
  - Home: Green theme with hexagonal decorations
- **Beautiful Calendar** with gradient header and interactive day cells
- **Professional Prescriptions** with medical-grade PDF format

## 🛠️ Tech Stack

### Frontend
- **React** - UI framework
- **React Router** - Navigation
- **Axios** - HTTP client
- **CSS Modules** - Scoped styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MySQL** - Database
- **PDFKit** - PDF generation
- **Twilio** - SMS/OTP service
- **Multer** - File upload handling
- **bcrypt** - Password hashing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- Twilio account (for OTP functionality)

## 🚀 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/nexus-health.git
cd nexus-health
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=users

# Admin Credentials
ADMIN_EMAIL=admin@hospital.com
ADMIN_PASSWORD=admin123

# Twilio Configuration (for OTP)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890
```

### 3. Database Setup

Create a MySQL database:
```sql
CREATE DATABASE users;
```

The application will automatically create the required tables on first run:
- `users` - User accounts (patients and doctors)
- `doctors` - Doctor profiles
- `hospitals` - Hospital information
- `bookings` - Appointment bookings
- `prescriptions` - Medical prescriptions
- `doctor_slots` - Doctor availability slots
- `patient_reports` - Uploaded medical reports

### 4. Frontend Setup

```bash
cd frontend
npm install
```

### 5. Start the Application

**Backend** (in `backend` directory):
```bash
node server.js
```
Server runs on: `http://localhost:8081`

**Frontend** (in `frontend` directory):
```bash
npm start
```
Application runs on: `http://localhost:3000`

## 📱 Usage

### Patient Flow
1. **Register** - Create account with OTP verification
2. **Login** - Access your dashboard
3. **Browse Doctors** - Search by specialization/location
4. **Book Appointment** - Select available time slot
5. **Track Status** - View appointment status in dashboard
6. **Upload Reports** - Upload medical reports after consultation
7. **Download Prescription** - Get prescription PDF after completion

### Doctor Flow
1. **Register** - Create doctor profile
2. **Login** - Access doctor dashboard
3. **Manage Slots** - Create available time slots
4. **View Calendar** - See bookings on beautiful calendar
5. **Handle Appointments** - Approve/reject booking requests
6. **Complete Consultation** - Fill prescription form
7. **Generate Prescription** - Create professional PDF
8. **View Patient History** - Access patient visit records

### Admin Flow
1. **Login** - Use admin credentials
2. **View Users** - See all patients and doctors
3. **Manage System** - Monitor and manage users

## 🔐 Security Features

- Password hashing with bcrypt
- OTP verification for registration
- Role-based access control
- SQL injection prevention with parameterized queries
- File upload validation (type and size)
- Secure session management

## 📁 Project Structure

```
nexus-health/
├── backend/
│   ├── server.js              # Main server file
│   ├── .env                   # Environment variables (not in git)
│   ├── package.json
│   └── uploads/
│       ├── prescriptions/     # Generated prescription PDFs
│       └── reports/           # Uploaded medical reports
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── AdminDashboard.js
│   │   ├── AdminLogin.js
│   │   ├── Create.js          # Registration page
│   │   ├── Login.js
│   │   ├── Home.js
│   │   ├── DoctorDashboard.js
│   │   ├── PatientDashboard.js
│   │   ├── Doctors.js         # Doctor listing & booking
│   │   ├── PatientNavbar.js
│   │   ├── AuthContext.js
│   │   └── *.module.css       # Component styles
│   └── package.json
└── README.md
```

## 🎯 Key Features Explained

### Slot Management System
- Doctors create time slots for specific dates
- Patients can only book available slots
- Prevents double-booking
- Automatic slot marking as unavailable after booking

### Prescription System
- Professional PDF generation with PDFKit
- Column-based medicine and dosage layout
- Includes patient demographics, diagnosis, symptoms
- Medical-grade format suitable for printing
- Automatic storage and retrieval

### Notification System
- Real-time polling (every 5 seconds)
- Notifications for appointment confirmation/rejection
- Duplicate prevention
- Time-stamped notifications

### Report Upload System
- 10-day upload window after consultation
- Supports PDF, JPG, PNG formats
- 5MB file size limit
- Secure file storage
- Doctor access to patient reports

### Date Handling
- Timezone-safe date parsing
- MySQL `dateStrings: true` configuration
- Consistent date display across all components
- No timezone conversion issues

## 🐛 Troubleshooting

### OTP Not Sending
- Verify Twilio credentials in `.env`
- Check Twilio account status
- For trial accounts, verify recipient phone numbers in Twilio console

### Database Connection Failed
- Ensure MySQL is running
- Verify database credentials in `.env`
- Check if database exists

### Port Already in Use
- Backend: Change port in `server.js` (default: 8081)
- Frontend: Change port in `package.json` or use different port

### Date Showing Wrong Day
- Ensure backend has `dateStrings: true` in MySQL config
- Restart backend server after configuration changes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- React community for excellent documentation
- PDFKit for PDF generation capabilities
- Twilio for SMS/OTP services
- All contributors and testers

## 📞 Support

For support, email your-email@example.com or create an issue in the repository.

---

**Note**: Remember to update Twilio credentials and database configuration before deploying to production. Never commit `.env` files to version control.
