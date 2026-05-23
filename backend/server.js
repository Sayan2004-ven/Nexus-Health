const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const twilio = require("twilio");
const PDFDocument = require("pdfkit");
const bcrypt = require("bcrypt");
const axios = require("axios");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE;

// Validate Twilio credentials
let client = null;
let twilioConfigured = false;

if (accountSid && authToken && twilioPhone) {
  try {
    client = new twilio(accountSid, authToken);
    twilioConfigured = true;
    console.log("✓ Twilio initialized successfully");
  } catch (error) {
    console.error("✗ Twilio initialization failed:", error.message);
  }
} else {
  console.warn("⚠ Twilio credentials not configured. OTP functionality will not work.");
  console.warn("  Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE in .env file");
}

const SALT_ROUNDS = 10;
let otpStore = {};

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/reports';
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const db = mysql.createConnection({
  host:     process.env.DB_HOST || "localhost",
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_NAME || "users",
  dateStrings: true, // Return dates as strings to avoid timezone conversion
  timezone: 'Z' // Use UTC timezone
});

db.connect(err => {
  if (err) console.error("DB connection failed:", err);
  else {
    console.log(`MySQL connected to ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || "users"}`);
    ensureUsersAdminColumns();
    ensureUsersRoleColumn();
    ensureDoctorsUserIdColumn();
    ensureBookingsTable();
    ensureBookingsPatientIdColumn();
    ensureBookingsStatusColumn();
    ensurePrescriptionsTable();
    ensureBookingsCompletedColumn();
    ensureDoctorSlotsTable();
    ensurePatientReportsTable();
  }
});

// ─── HELPERS ───
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}
function normalizeRole(role) {
  return role === "doctor" ? "doctor" : "patient";
}

function ensureUsersAdminColumns() {
  const queries = [
    "ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE",
    "ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL DEFAULT NULL"
  ];

  queries.forEach((query) => {
    db.query(query, (err) => {
      if (!err || err.code === "ER_DUP_FIELDNAME") return;
      console.error("Could not ensure users admin column:", err.message);
    });
  });
}

function ensureUsersRoleColumn() {
  db.query(
    "ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'patient'",
    (err) => {
      if (!err || err.code === "ER_DUP_FIELDNAME") return;
      console.error("Could not ensure users.role column:", err.message);
    }
  );
}

function ensureDoctorsUserIdColumn() {
  db.query(
    "ALTER TABLE doctors ADD COLUMN user_id INT UNIQUE",
    (err) => {
      if (!err || err.code === "ER_DUP_FIELDNAME") return;
      console.error("Could not ensure doctors.user_id column:", err.message);
    }
  );
}

function ensureBookingsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT NOT NULL,
      patient_name VARCHAR(255) NOT NULL,
      patient_contact VARCHAR(20) NOT NULL,
      booking_date DATE NOT NULL,
      booking_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err && err.code !== "ER_TABLE_EXISTS_ERROR") {
      console.error("Could not ensure bookings table:", err.message);
    }
  });
}

function ensureBookingsPatientIdColumn() {
  db.query("ALTER TABLE bookings ADD COLUMN patient_id INT", (err) => {
    if (err && err.code !== "ER_DUP_FIELDNAME") {
      console.error("Could not add patient_id column:", err.message);
    }
  });
}

function ensureBookingsStatusColumn() {
  db.query("ALTER TABLE bookings ADD COLUMN status VARCHAR(20) DEFAULT 'pending'", (err) => {
    if (err && err.code !== "ER_DUP_FIELDNAME") {
      console.error("Could not add status column:", err.message);
    }
  });
}

function ensurePrescriptionsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT NOT NULL,
      doctor_id INT NOT NULL,
      patient_id INT NOT NULL,
      illness VARCHAR(500),
      symptoms TEXT,
      medicines TEXT,
      dosage TEXT,
      tests TEXT,
      notes TEXT,
      recheckup_date DATE,
      pdf_path VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES bookings(id) ON DELETE CASCADE,
      UNIQUE KEY unique_appointment (appointment_id)
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err && err.code !== "ER_TABLE_EXISTS_ERROR") {
      console.error("Could not ensure prescriptions table:", err.message);
    }
  });
}

function ensureBookingsCompletedColumn() {
  db.query("ALTER TABLE bookings ADD COLUMN completed BOOLEAN DEFAULT FALSE", (err) => {
    if (err && err.code !== "ER_DUP_FIELDNAME") {
      console.error("Could not add completed column:", err.message);
    }
  });
}

function ensureDoctorSlotsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS doctor_slots (
      id INT AUTO_INCREMENT PRIMARY KEY,
      doctor_id INT NOT NULL,
      slot_date DATE NOT NULL,
      slot_time TIME NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
      UNIQUE KEY unique_slot (doctor_id, slot_date, slot_time)
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err && err.code !== "ER_TABLE_EXISTS_ERROR") {
      console.error("Could not ensure doctor_slots table:", err.message);
    }
  });
}

function ensurePatientReportsTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS patient_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      appointment_id INT NOT NULL,
      patient_id INT NOT NULL,
      doctor_id INT NOT NULL,
      report_name VARCHAR(255) NOT NULL,
      report_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(50),
      file_size INT,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (appointment_id) REFERENCES bookings(id) ON DELETE CASCADE,
      INDEX idx_appointment (appointment_id),
      INDEX idx_patient (patient_id)
    )
  `;
  
  db.query(createTableQuery, (err) => {
    if (err && err.code !== "ER_TABLE_EXISTS_ERROR") {
      console.error("Could not ensure patient_reports table:", err.message);
    }
  });
}

// ─── CREATE USER ───
app.post("/create", async (req, res) => {
  const { fname, lname, email, phone, password } = req.body;
  const role = normalizeRole(req.body.role);

  if (!fname || !lname || !email || !phone || !password)
    return res.json({ success: false, message: "All fields are required" });

  if (!isValidEmail(email))
    return res.json({ success: false, message: "Invalid email format" });

  if (!isValidPhone(phone))
    return res.json({ success: false, message: "Phone must be 10 digits" });

  try {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    db.query(
      "INSERT INTO users (fname, lname, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)",
      [fname, lname, email, phone, hashed, role],
      (err, result) => {
        if (err) return res.json({ success: false, message: err.message });

        res.json({
          success: true,
          message: `${role === "doctor" ? "Doctor" : "User"} created successfully!`,
          userId: result.insertId
        });
      }
    );
  } catch {
    res.json({ success: false, message: "Server error" });
  }
});

// ─── LOGIN ───
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const role = normalizeRole(req.body.role);

  db.query(
    "SELECT * FROM users WHERE email = ? AND role = ?",
    [email, role],
    async (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      if (results.length === 0)
        return res.json({ success: false, message: `${role === "doctor" ? "Doctor" : "User"} account not found` });

      const user = results[0];
      if (!user.is_active) {
        return res.json({ success: false, message: "This account has been deactivated. Please contact the administrator." });
      }
      const match = await bcrypt.compare(password, user.password);

      if (match) {
        db.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id], (updateErr) => {
          if (updateErr) {
            console.error("Failed to update last_login:", updateErr.message);
          }
        });
        const { password, ...userData } = user;
        res.json({ success: true, user: userData });
      } else {
        res.json({ success: false, message: "Invalid password" });
      }
    }
  );
});

// ─── USERS ───
app.get("/user/:id", (req, res) => {
  db.query("SELECT * FROM users WHERE id=?", [req.params.id], (err, r) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, user: r[0] });
  });
});

app.put("/update/:id", (req, res) => {
  const { fname, lname, email, phone, role } = req.body;

  db.query(
    "UPDATE users SET fname=?, lname=?, email=?, phone=?, role=? WHERE id=?",
    [fname, lname, email, phone, normalizeRole(role), req.params.id],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

app.delete("/delete/:id", (req, res) => {
  db.query("DELETE FROM users WHERE id=?", [req.params.id], (err) => {
    if (err) return res.json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ─── ADMIN ───
app.post("/admin-login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ─── ALL USERS (Admin Dashboard) ───
app.get("/all-users", (req, res) => {
  db.query(
    `SELECT id, fname, lname, email, phone, role,
            COALESCE(is_active, TRUE) AS is_active,
            created_at,
            last_login
     FROM users
     ORDER BY id DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, users: results });
    }
  );
});

app.get("/admin/dashboard-summary", (req, res) => {
  const summaryQuery = `
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'doctor') AS total_doctors,
      (SELECT COUNT(*) FROM users WHERE role = 'patient' OR role IS NULL) AS total_patients,
      (SELECT COUNT(*) FROM bookings) AS total_appointments,
      (SELECT COUNT(*) FROM bookings WHERE booking_date = CURDATE()) AS today_appointments,
      (
        SELECT COALESCE(ROUND(SUM(COALESCE(d.consultation_fee, 0)), 2), 0)
        FROM bookings b
        LEFT JOIN doctors d ON b.doctor_id = d.id
        WHERE b.completed = TRUE
      ) AS total_revenue
  `;

  const activityQuery = `
    SELECT * FROM (
      SELECT
        CONCAT(COALESCE(fname, ''), ' ', COALESCE(lname, '')) AS actor_name,
        role AS actor_role,
        'registration' AS activity_type,
        created_at AS activity_time,
        CONCAT(COALESCE(fname, 'User'), ' ', COALESCE(lname, ''), ' registered as ', IF(role = 'doctor', 'Doctor', 'Patient')) AS activity_text
      FROM users
      WHERE created_at IS NOT NULL

      UNION ALL

      SELECT
        patient_name AS actor_name,
        'patient' AS actor_role,
        'appointment' AS activity_type,
        created_at AS activity_time,
        CONCAT(patient_name, ' booked an appointment with Dr. ', COALESCE(d.name, 'Unknown')) AS activity_text
      FROM bookings b
      LEFT JOIN doctors d ON b.doctor_id = d.id

      UNION ALL

      SELECT
        COALESCE(d.name, 'Doctor') AS actor_name,
        'doctor' AS actor_role,
        'prescription' AS activity_type,
        p.created_at AS activity_time,
        CONCAT('Dr. ', COALESCE(d.name, 'Unknown'), ' completed appointment #', p.appointment_id) AS activity_text
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id = d.id
    ) activity_feed
    ORDER BY activity_time DESC
    LIMIT 10
  `;

  db.query(summaryQuery, (summaryErr, summaryResults) => {
    if (summaryErr) {
      return res.status(500).json({ success: false, message: summaryErr.message });
    }

    db.query(activityQuery, (activityErr, activityResults) => {
      res.json({
        success: true,
        summary: summaryResults[0],
        activities: activityErr ? [] : activityResults,
        activityError: activityErr ? activityErr.message : null
      });
    });
  });
});

app.get("/admin/appointments", (req, res) => {
  const query = `
    SELECT
      b.id,
      b.booking_date,
      b.booking_time,
      b.created_at,
      b.status,
      b.completed,
      b.patient_id,
      b.patient_name,
      b.patient_contact,
      d.id AS doctor_id,
      d.name AS doctor_name,
      d.specialization,
      d.consultation_fee
    FROM bookings b
    LEFT JOIN doctors d ON b.doctor_id = d.id
    ORDER BY b.booking_date DESC, b.booking_time DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, appointments: results });
  });
});

app.get("/admin/user-details/:id", (req, res) => {
  const userId = req.params.id;

  db.query(
    `SELECT id, fname, lname, email, phone, role,
            COALESCE(is_active, TRUE) AS is_active,
            created_at, last_login
     FROM users
     WHERE id = ?`,
    [userId],
    (userErr, userResults) => {
      if (userErr) return res.status(500).json({ success: false, message: userErr.message });
      if (userResults.length === 0) return res.status(404).json({ success: false, message: "User not found" });

      const user = userResults[0];
      const params = [userId];
      let appointmentQuery = `
        SELECT
          b.id,
          b.booking_date,
          b.booking_time,
          b.status,
          b.completed,
          b.patient_name,
          b.patient_contact,
          d.name AS doctor_name,
          d.specialization,
          d.consultation_fee
        FROM bookings b
        LEFT JOIN doctors d ON b.doctor_id = d.id
      `;

      if (user.role === "doctor") {
        appointmentQuery += `
          WHERE b.doctor_id = (SELECT id FROM doctors WHERE user_id = ? LIMIT 1)
          ORDER BY b.booking_date DESC, b.booking_time DESC
        `;
      } else {
        appointmentQuery += `
          WHERE b.patient_id = ?
          ORDER BY b.booking_date DESC, b.booking_time DESC
        `;
      }

      db.query(appointmentQuery, params, (appointmentErr, appointmentResults) => {
        if (appointmentErr) {
          return res.status(500).json({ success: false, message: appointmentErr.message });
        }

        res.json({
          success: true,
          user,
          appointments: appointmentResults
        });
      });
    }
  );
});

app.put("/admin/user-status/:id", (req, res) => {
  const { is_active } = req.body;

  db.query(
    "UPDATE users SET is_active = ? WHERE id = ?",
    [Boolean(is_active), req.params.id],
    (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true });
    }
  );
});

app.post("/admin/users/bulk-delete", (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No users selected" });
  }

  db.query("DELETE FROM users WHERE id IN (?)", [ids], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

// ─── DOWNLOAD SINGLE USER AS PDF ───
app.get("/download-user/:id", (req, res) => {
  db.query("SELECT * FROM users WHERE id = ?", [req.params.id], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).send("User not found");

    const user = results[0];
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=user_${user.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(18).text("Customer Details", { underline: true }).moveDown();
    doc.fontSize(12)
      .text(`ID: ${user.id}`)
      .text(`First Name: ${user.fname}`)
      .text(`Last Name: ${user.lname}`)
      .text(`Email: ${user.email}`)
      .text(`Phone: ${user.phone}`);
    doc.end();
  });
});

// ─── DOWNLOAD ALL USERS AS PDF ───
app.get("/download-all", (req, res) => {
  db.query("SELECT id, fname, lname, email, phone FROM users", (err, results) => {
    if (err) return res.status(500).send("DB error");

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=all_customers.pdf");
    doc.pipe(res);

    doc.fontSize(18).text("All Customers", { underline: true }).moveDown();
    results.forEach(u => {
      doc.fontSize(11)
        .text(`[${u.id}] ${u.fname} ${u.lname} | ${u.email} | ${u.phone}`)
        .moveDown(0.3);
    });
    doc.end();
  });
});

// ─── OTP ───
app.post("/send-otp", async (req, res) => {
  let { phone } = req.body;

  // Check if Twilio is configured
  if (!twilioConfigured || !client) {
    console.error("OTP Error: Twilio is not properly configured");
    return res.json({ 
      success: false, 
      message: "SMS service is not configured. Please contact administrator." 
    });
  }

  phone = "+91" + phone;
  const otp = Math.floor(100000 + Math.random() * 900000);
  otpStore[phone] = otp;

  console.log(`Attempting to send OTP to ${phone}...`);

  try {
    const message = await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: twilioPhone,
      to: phone
    });
    console.log(`✓ OTP sent successfully to ${phone}. Message SID: ${message.sid}`);
    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.error("✗ Twilio error:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", error.moreInfo);
    
    let userMessage = "Failed to send OTP. ";
    
    if (error.code === 20003) {
      userMessage += "Invalid Twilio credentials. Please contact administrator.";
    } else if (error.code === 21211) {
      userMessage += "Invalid phone number format.";
    } else if (error.code === 21608) {
      userMessage += "Phone number is not verified in Twilio trial account.";
    } else if (error.message.includes("Authenticate")) {
      userMessage += "Twilio authentication failed. Please contact administrator.";
    } else {
      userMessage += "Please try again or contact support.";
    }
    
    res.json({ success: false, message: userMessage });
  }
});

app.post("/verify-otp", (req, res) => {
  let { phone, otp } = req.body;
  phone = "+91" + phone;

  if (otpStore[phone] == otp) {
    delete otpStore[phone];
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ─── HOSPITALS ───
app.get("/api/hospitals", (req, res) => {
  const { city } = req.query;

  let query = "SELECT * FROM hospitals";
  let values = [];

  if (city) {
    query += " WHERE city LIKE ?";
    values.push(`%${city}%`);
  }

  db.query(query, values, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false });
    }

    const hospitals = results.map(h => ({
      ...h,
      available_beds: h.total_beds - h.occupied_beds
    }));

    res.json({ success: true, hospitals });
  });
});

// ─── DOCTORS ───
app.get("/api/doctors", (req, res) => {
  db.query("SELECT * FROM doctors", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

// ─── DOCTOR REGISTRATION ───
app.post("/api/doctor-register", (req, res) => {
  const { user_id, name, specialization, city, address, contact, consultation_fee, rating, reviews } = req.body;

  if (!user_id || !name || !specialization || !city || !contact || !consultation_fee) {
    return res.json({ success: false, message: "All required fields must be filled" });
  }

  db.query(
    "INSERT INTO doctors (user_id, name, specialization, city, address, contact, consultation_fee, rating, reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [user_id, name, specialization, city, address || "", contact, consultation_fee, rating || 4.5, reviews || 0],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, message: "Doctor registered successfully", doctorId: result.insertId });
    }
  );
});

// ─── GET DOCTOR PROFILE ───
app.get("/api/doctor-profile/:userId", (req, res) => {
  db.query("SELECT * FROM doctors WHERE user_id = ?", [req.params.userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: err.message });
    }
    if (results.length === 0) {
      return res.json({ success: false, message: "Doctor profile not found" });
    }
    res.json({ success: true, doctor: results[0] });
  });
});

// ─── UPDATE DOCTOR PROFILE ───
app.put("/api/doctor-profile/:userId", (req, res) => {
  const { name, specialization, city, address, contact, consultation_fee } = req.body;

  db.query(
    "UPDATE doctors SET name=?, specialization=?, city=?, address=?, contact=?, consultation_fee=? WHERE user_id=?",
    [name, specialization, city, address || "", contact, consultation_fee, req.params.userId],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, message: "Profile updated successfully" });
    }
  );
});

// ─── GET DOCTOR BOOKINGS ───
app.get("/api/doctor-bookings/:doctorId", (req, res) => {
  db.query(
    "SELECT * FROM bookings WHERE doctor_id = ? ORDER BY booking_date, booking_time",
    [req.params.doctorId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      
      // Log first booking to see date format
      if (results.length > 0) {
        console.log("📋 Sample booking from DB:", {
          id: results[0].id,
          booking_date: results[0].booking_date,
          booking_date_type: typeof results[0].booking_date
        });
      }
      
      res.json({ success: true, bookings: results });
    }
  );
});

// ─── GET PATIENT BOOKINGS ───
app.get("/api/patient-bookings/:patientId", (req, res) => {
  db.query(
    `SELECT b.*, d.name as doctor_name, d.specialization, d.city, d.consultation_fee 
     FROM bookings b 
     JOIN doctors d ON b.doctor_id = d.id 
     WHERE b.patient_id = ? 
     ORDER BY b.booking_date DESC, b.booking_time DESC`,
    [req.params.patientId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, bookings: results });
    }
  );
});

// ─── CANCEL BOOKING ───
app.delete("/api/booking/:bookingId", (req, res) => {
  db.query("DELETE FROM bookings WHERE id = ?", [req.params.bookingId], (err) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: err.message });
    }
    res.json({ success: true, message: "Booking cancelled successfully" });
  });
});

// ─── APPROVE BOOKING (Doctor) ───
app.put("/api/booking/:bookingId/approve", (req, res) => {
  db.query(
    "UPDATE bookings SET status = 'confirmed' WHERE id = ?",
    [req.params.bookingId],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, message: "Booking approved successfully" });
    }
  );
});

// ─── REJECT BOOKING (Doctor) ───
app.put("/api/booking/:bookingId/reject", (req, res) => {
  db.query(
    "UPDATE bookings SET status = 'rejected' WHERE id = ?",
    [req.params.bookingId],
    (err) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, message: "Booking rejected successfully" });
    }
  );
});

// ─── CREATE PRESCRIPTION & GENERATE PDF ───
app.post("/api/prescription", async (req, res) => {
  const { 
    appointment_id, 
    doctor_id, 
    patient_id, 
    doctor_name,
    patient_name,
    patient_age,
    patient_gender,
    illness, 
    symptoms, 
    medicines, 
    dosage, 
    tests, 
    notes, 
    recheckup_date 
  } = req.body;

  if (!appointment_id || !doctor_id || !patient_id) {
    return res.json({ success: false, message: "Missing required fields" });
  }

  try {
    // Insert prescription into database
    db.query(
      `INSERT INTO prescriptions 
       (appointment_id, doctor_id, patient_id, illness, symptoms, medicines, dosage, tests, notes, recheckup_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [appointment_id, doctor_id, patient_id, illness, symptoms, medicines, dosage, tests, notes, recheckup_date],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.json({ success: false, message: err.message });
        }

        const prescriptionId = result.insertId;

        // Generate PDF
        const doc = new PDFDocument({ 
          margin: 40,
          size: 'A4'
        });
        const fileName = `prescription_${prescriptionId}.pdf`;
        const filePath = `uploads/prescriptions/${fileName}`;

        // Create uploads directory if it doesn't exist
        const fs = require('fs');
        if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
        if (!fs.existsSync('uploads/prescriptions')) fs.mkdirSync('uploads/prescriptions');

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Professional Colors
        const primaryBlue = '#1e40af';
        const lightBlue = '#dbeafe';
        const darkText = '#1f2937';
        const grayText = '#6b7280';
        const borderColor = '#d1d5db';
        const accentGreen = '#059669';

        // ═══════════════════════════════════════════════════════════
        // HEADER SECTION
        // ═══════════════════════════════════════════════════════════
        doc.rect(0, 0, doc.page.width, 100).fill(primaryBlue);
        
        // Medical Symbol
        doc.fontSize(50).fillColor('#ffffff').text('⚕', 40, 25);
        
        // Title
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#ffffff')
           .text('MEDICAL PRESCRIPTION', 110, 30);
        
        doc.fontSize(9).font('Helvetica').fillColor('#e0e7ff')
           .text('Professional Healthcare Services', 110, 60);

        // Prescription ID and Date
        doc.fontSize(8).fillColor('#e0e7ff')
           .text(`Rx No: ${prescriptionId}`, doc.page.width - 150, 35, { align: 'right', width: 110 })
           .text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, doc.page.width - 150, 50, { align: 'right', width: 110 });

        let yPos = 120;

        // ═══════════════════════════════════════════════════════════
        // DOCTOR & PATIENT INFO - SIDE BY SIDE
        // ═══════════════════════════════════════════════════════════
        
        // Doctor Info Box
        doc.rect(40, yPos, 250, 85).stroke(borderColor);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryBlue)
           .text('DOCTOR DETAILS', 50, yPos + 10);
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
           .text(`Dr. ${doctor_name || 'N/A'}`, 50, yPos + 30);
        
        doc.fontSize(8).font('Helvetica').fillColor(grayText)
           .text(`Specialization: ${req.body.specialization || 'General Physician'}`, 50, yPos + 48)
           .text(`Registration: ${req.body.registration_no || 'N/A'}`, 50, yPos + 63);

        // Patient Info Box
        doc.rect(305, yPos, 250, 85).stroke(borderColor);
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryBlue)
           .text('PATIENT DETAILS', 315, yPos + 10);
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
           .text(`${patient_name || 'N/A'}`, 315, yPos + 30);
        
        doc.fontSize(8).font('Helvetica').fillColor(grayText)
           .text(`Age: ${patient_age || 'N/A'} | Gender: ${patient_gender || 'N/A'}`, 315, yPos + 48)
           .text(`Contact: ${req.body.patient_contact || 'N/A'}`, 315, yPos + 63);

        yPos += 105;

        // ═══════════════════════════════════════════════════════════
        // DIAGNOSIS SECTION
        // ═══════════════════════════════════════════════════════════
        if (illness) {
          doc.rect(40, yPos, 515, 20).fill(lightBlue);
          doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryBlue)
             .text('DIAGNOSIS', 50, yPos + 6);
          
          yPos += 25;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
             .text(illness, 50, yPos, { width: 495 });
          yPos += Math.max(doc.heightOfString(illness, { width: 495 }), 15) + 15;
        }

        // ═══════════════════════════════════════════════════════════
        // SYMPTOMS SECTION
        // ═══════════════════════════════════════════════════════════
        if (symptoms) {
          doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryBlue)
             .text('SYMPTOMS', 40, yPos);
          yPos += 15;
          
          doc.fontSize(8).font('Helvetica').fillColor(darkText)
             .text(symptoms, 50, yPos, { width: 495 });
          yPos += doc.heightOfString(symptoms, { width: 495 }) + 15;
        }

        // ═══════════════════════════════════════════════════════════
        // MEDICINES TABLE - COLUMN LAYOUT
        // ═══════════════════════════════════════════════════════════
        if (medicines && dosage) {
          doc.rect(40, yPos, 515, 20).fill(accentGreen);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
             .text('℞  PRESCRIBED MEDICATIONS', 50, yPos + 5);
          
          yPos += 25;

          // Table Header
          doc.rect(40, yPos, 515, 25).fill('#f3f4f6');
          doc.fontSize(9).font('Helvetica-Bold').fillColor(darkText)
             .text('MEDICINE NAME', 50, yPos + 8)
             .text('DOSAGE & INSTRUCTIONS', 300, yPos + 8);
          
          // Header border
          doc.moveTo(40, yPos + 25).lineTo(555, yPos + 25).stroke(borderColor);
          doc.moveTo(290, yPos).lineTo(290, yPos + 25).stroke(borderColor);
          
          yPos += 30;

          // Parse medicines and dosages
          const medicineList = medicines.split('\n').filter(m => m.trim());
          const dosageList = dosage.split('\n').filter(d => d.trim());

          // Table Rows
          medicineList.forEach((medicine, index) => {
            const dosageText = dosageList[index] || 'As directed';
            
            // Check if we need a new page
            if (yPos > doc.page.height - 150) {
              doc.addPage();
              yPos = 40;
            }

            // Row background (alternating)
            if (index % 2 === 0) {
              doc.rect(40, yPos - 5, 515, 30).fill('#fafafa');
            }

            // Medicine name (left column)
            doc.fontSize(8).font('Helvetica-Bold').fillColor(darkText)
               .text(medicine.replace(/^\d+\.\s*/, ''), 50, yPos, { width: 230 });
            
            // Dosage (right column)
            doc.fontSize(8).font('Helvetica').fillColor(grayText)
               .text(dosageText, 300, yPos, { width: 245 });

            // Column separator
            doc.moveTo(290, yPos - 5).lineTo(290, yPos + 25).stroke(borderColor);
            
            yPos += 30;
          });

          // Bottom border
          doc.moveTo(40, yPos - 5).lineTo(555, yPos - 5).stroke(borderColor);
          yPos += 10;
        }

        // ═══════════════════════════════════════════════════════════
        // TESTS SECTION
        // ═══════════════════════════════════════════════════════════
        if (tests) {
          yPos += 10;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryBlue)
             .text('RECOMMENDED TESTS', 40, yPos);
          yPos += 15;
          
          doc.fontSize(8).font('Helvetica').fillColor(darkText)
             .text(tests, 50, yPos, { width: 495 });
          yPos += doc.heightOfString(tests, { width: 495 }) + 15;
        }

        // ═══════════════════════════════════════════════════════════
        // FOLLOW-UP DATE
        // ═══════════════════════════════════════════════════════════
        if (recheckup_date) {
          yPos += 10;
          doc.rect(40, yPos, 515, 25).fill('#fef3c7');
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#92400e')
             .text('📅 FOLLOW-UP DATE:', 50, yPos + 8);
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#92400e')
             .text(new Date(recheckup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }), 200, yPos + 8);
          yPos += 35;
        }

        // ═══════════════════════════════════════════════════════════
        // ADDITIONAL NOTES
        // ═══════════════════════════════════════════════════════════
        if (notes) {
          yPos += 10;
          doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryBlue)
             .text('ADDITIONAL INSTRUCTIONS', 40, yPos);
          yPos += 15;
          
          doc.fontSize(8).font('Helvetica-Oblique').fillColor(grayText)
             .text(notes, 50, yPos, { width: 495 });
          yPos += doc.heightOfString(notes, { width: 495 }) + 20;
        }

        // ═══════════════════════════════════════════════════════════
        // SIGNATURE SECTION
        // ═══════════════════════════════════════════════════════════
        const signatureY = Math.max(yPos + 20, doc.page.height - 120);
        
        doc.moveTo(380, signatureY).lineTo(530, signatureY).stroke(darkText);
        doc.fontSize(8).font('Helvetica-Bold').fillColor(darkText)
           .text("Doctor's Signature", 400, signatureY + 5, { align: 'center', width: 130 });

        // ═══════════════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════════════
        doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill('#f9fafb');
        
        doc.fontSize(7).font('Helvetica').fillColor(grayText)
           .text('This is a digitally generated prescription. Please consult your doctor before making any changes to the medication.', 
                 40, doc.page.height - 35, { align: 'center', width: doc.page.width - 80 });
        
        doc.fontSize(7).fillColor(grayText)
           .text(`Generated: ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`, 
                 40, doc.page.height - 20, { align: 'center', width: doc.page.width - 80 });

        doc.end();

        writeStream.on('finish', () => {
          // Update prescription with PDF path
          db.query(
            "UPDATE prescriptions SET pdf_path = ? WHERE id = ?",
            [filePath, prescriptionId],
            (updateErr) => {
              if (updateErr) {
                console.error(updateErr);
                return res.json({ success: false, message: "PDF generated but failed to update path" });
              }

              // Mark appointment as completed
              db.query(
                "UPDATE bookings SET completed = TRUE WHERE id = ?",
                [appointment_id],
                (completeErr) => {
                  if (completeErr) console.error("Failed to mark appointment as completed:", completeErr);
                  
                  res.json({ 
                    success: true, 
                    message: "Prescription created successfully",
                    prescriptionId,
                    pdfPath: filePath
                  });
                }
              );
            }
          );
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Server error" });
  }
});

// ─── GET PRESCRIPTION BY APPOINTMENT ID ───
app.get("/api/prescription/appointment/:appointmentId", (req, res) => {
  db.query(
    "SELECT * FROM prescriptions WHERE appointment_id = ?",
    [req.params.appointmentId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      if (results.length === 0) {
        return res.json({ success: false, message: "Prescription not found" });
      }
      res.json({ success: true, prescription: results[0] });
    }
  );
});

// ─── DOWNLOAD PRESCRIPTION PDF ───
app.get("/api/prescription/download/:prescriptionId", (req, res) => {
  db.query(
    "SELECT pdf_path FROM prescriptions WHERE id = ?",
    [req.params.prescriptionId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).send("Prescription not found");
      }
      
      const filePath = results[0].pdf_path;
      res.download(filePath, (downloadErr) => {
        if (downloadErr) {
          console.error("Download error:", downloadErr);
          res.status(500).send("Error downloading file");
        }
      });
    }
  );
});

// ─── GET PATIENT PRESCRIPTIONS ───
app.get("/api/prescriptions/patient/:patientId", (req, res) => {
  db.query(
    `SELECT p.*, d.name as doctor_name, b.booking_date, b.booking_time 
     FROM prescriptions p
     JOIN doctors d ON p.doctor_id = d.id
     JOIN bookings b ON p.appointment_id = b.id
     WHERE p.patient_id = ?
     ORDER BY p.created_at DESC`,
    [req.params.patientId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, prescriptions: results });
    }
  );
});

// ─── GET PATIENT HISTORY BY PHONE NUMBER (For specific doctor) ───
app.get("/api/patient-history/:doctorId/:phoneNumber", (req, res) => {
  const { doctorId, phoneNumber } = req.params;
  
  // Get all bookings for this phone number WITH THIS DOCTOR ONLY
  db.query(
    `SELECT 
      b.*,
      d.name as doctor_name,
      d.specialization,
      p.id as prescription_id,
      p.illness,
      p.symptoms,
      p.medicines,
      p.dosage,
      p.tests,
      p.notes,
      p.recheckup_date,
      p.created_at as prescription_date
     FROM bookings b
     JOIN doctors d ON b.doctor_id = d.id
     LEFT JOIN prescriptions p ON b.id = p.appointment_id
     WHERE b.patient_contact = ? AND b.doctor_id = ?
     ORDER BY b.patient_name ASC, b.booking_date DESC, b.booking_time DESC`,
    [phoneNumber, doctorId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      
      if (results.length === 0) {
        return res.json({ success: false, message: "No history found for this patient with you" });
      }
      
      // Group by patient name
      const groupedByPatient = {};
      results.forEach(record => {
        const patientName = record.patient_name;
        if (!groupedByPatient[patientName]) {
          groupedByPatient[patientName] = [];
        }
        groupedByPatient[patientName].push(record);
      });
      
      res.json({ 
        success: true, 
        groupedHistory: groupedByPatient,
        totalPatients: Object.keys(groupedByPatient).length,
        totalVisits: results.length
      });
    }
  );
});

// ─── BOOK APPOINTMENT (Patient) ───
app.post("/api/book-appointment", (req, res) => {
  const { doctor_id, patient_id, patient_name, patient_contact, booking_date, booking_time } = req.body;

  console.log("📅 Booking request received:");
  console.log("  - booking_date from frontend:", booking_date);
  console.log("  - booking_time:", booking_time);

  if (!doctor_id || !patient_name || !patient_contact || !booking_date || !booking_time) {
    return res.json({ success: false, message: "All fields are required" });
  }

  // Validate phone number
  if (!/^\d{10}$/.test(patient_contact)) {
    return res.json({ success: false, message: "Contact number must be 10 digits" });
  }

  // Check if slot exists and is available
  db.query(
    "SELECT * FROM doctor_slots WHERE doctor_id = ? AND slot_date = ? AND slot_time = ? AND is_available = TRUE",
    [doctor_id, booking_date, booking_time],
    (slotErr, slotResults) => {
      if (slotErr) {
        console.error(slotErr);
        return res.json({ success: false, message: "Error checking slot availability" });
      }

      if (slotResults.length === 0) {
        return res.json({ success: false, message: "This slot is not available. Please choose another time." });
      }

      // Check if slot is already booked
      db.query(
        "SELECT * FROM bookings WHERE doctor_id = ? AND booking_date = ? AND booking_time = ? AND status != 'rejected'",
        [doctor_id, booking_date, booking_time],
        (bookingErr, bookingResults) => {
          if (bookingErr) {
            console.error(bookingErr);
            return res.json({ success: false, message: bookingErr.message });
          }

          if (bookingResults.length > 0) {
            return res.json({ success: false, message: "This slot is already booked. Please choose another time." });
          }

          // Book the appointment
          db.query(
            "INSERT INTO bookings (doctor_id, patient_id, patient_name, patient_contact, booking_date, booking_time) VALUES (?, ?, ?, ?, ?, ?)",
            [doctor_id, patient_id, patient_name, patient_contact, booking_date, booking_time],
            (insertErr, result) => {
              if (insertErr) {
                console.error(insertErr);
                return res.json({ success: false, message: insertErr.message });
              }

              console.log("✅ Booking created with ID:", result.insertId);
              
              // Fetch the created booking to see what was stored
              db.query(
                "SELECT booking_date FROM bookings WHERE id = ?",
                [result.insertId],
                (fetchErr, fetchResults) => {
                  if (!fetchErr && fetchResults.length > 0) {
                    console.log("  - booking_date stored in DB:", fetchResults[0].booking_date);
                  }
                }
              );

              // Mark slot as unavailable
              db.query(
                "UPDATE doctor_slots SET is_available = FALSE WHERE doctor_id = ? AND slot_date = ? AND slot_time = ?",
                [doctor_id, booking_date, booking_time],
                (updateErr) => {
                  if (updateErr) console.error("Failed to update slot availability:", updateErr);
                  
                  res.json({ success: true, message: "Appointment booked successfully", bookingId: result.insertId });
                }
              );
            }
          );
        }
      );
    }
  );
});

// ─── GET AVAILABLE SLOTS FOR DOCTOR ───
app.get("/api/doctor-slots/:doctorId", (req, res) => {
  const { date } = req.query;
  
  let query = "SELECT * FROM doctor_slots WHERE doctor_id = ? AND is_available = TRUE";
  let params = [req.params.doctorId];
  
  if (date) {
    query += " AND slot_date = ?";
    params.push(date);
  }
  
  query += " ORDER BY slot_date, slot_time";
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: err.message });
    }
    res.json({ success: true, slots: results });
  });
});

// ─── CREATE SLOTS (Doctor) ───
app.post("/api/doctor-slots", (req, res) => {
  const { doctor_id, slot_date, slot_times } = req.body;
  
  console.log("Slot creation request received:", {
    doctor_id,
    slot_date,
    slot_times,
    slot_times_length: slot_times ? slot_times.length : 0
  });
  
  if (!doctor_id || !slot_date || !slot_times || slot_times.length === 0) {
    console.log("Validation failed - missing fields");
    return res.json({ success: false, message: "All fields are required" });
  }
  
  // Insert multiple slots
  const values = slot_times.map(time => [doctor_id, slot_date, time, true]);
  
  db.query(
    "INSERT INTO doctor_slots (doctor_id, slot_date, slot_time, is_available) VALUES ?",
    [values],
    (err) => {
      if (err) {
        console.error("Slot creation error:", err);
        // Handle duplicate key error
        if (err.code === 'ER_DUP_ENTRY') {
          return res.json({ success: false, message: "Some slots already exist for this date" });
        }
        return res.json({ success: false, message: err.message });
      }
      console.log(`✓ Created ${slot_times.length} slots for doctor ${doctor_id} on ${slot_date}`);
      res.json({ success: true, message: "Slots created successfully" });
    }
  );
});

// ─── DELETE SLOT (Doctor) ───
app.delete("/api/doctor-slots/:slotId", (req, res) => {
  db.query("DELETE FROM doctor_slots WHERE id = ?", [req.params.slotId], (err) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, message: err.message });
    }
    res.json({ success: true, message: "Slot deleted successfully" });
  });
});

// ─── GET ALL SLOTS FOR DOCTOR (Including booked) ───
app.get("/api/doctor-all-slots/:doctorId", (req, res) => {
  db.query(
    "SELECT * FROM doctor_slots WHERE doctor_id = ? ORDER BY slot_date DESC, slot_time",
    [req.params.doctorId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, slots: results });
    }
  );
});

// ─── UPLOAD PATIENT REPORT ───
app.post("/api/upload-report", upload.single('report'), (req, res) => {
  const { appointment_id, patient_id, doctor_id } = req.body;
  
  if (!appointment_id || !patient_id || !doctor_id) {
    return res.json({ success: false, message: "Missing required fields" });
  }
  
  if (!req.file) {
    return res.json({ success: false, message: "No file uploaded" });
  }
  
  // Check if appointment exists and is completed
  db.query(
    "SELECT * FROM bookings WHERE id = ? AND patient_id = ? AND completed = TRUE",
    [appointment_id, patient_id],
    (err, bookingResults) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "Database error" });
      }
      
      if (bookingResults.length === 0) {
        // Delete uploaded file if appointment not found or not completed
        fs.unlinkSync(req.file.path);
        return res.json({ success: false, message: "Appointment not found or not completed" });
      }
      
      const booking = bookingResults[0];
      const appointmentDate = new Date(booking.booking_date);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate - appointmentDate) / (1000 * 60 * 60 * 24));
      
      // Check if within 10 days
      if (daysDifference > 10) {
        // Delete uploaded file if outside 10-day window
        fs.unlinkSync(req.file.path);
        return res.json({ 
          success: false, 
          message: "Upload period expired. Reports can only be uploaded within 10 days of consultation." 
        });
      }
      
      // Save report info to database
      db.query(
        `INSERT INTO patient_reports 
         (appointment_id, patient_id, doctor_id, report_name, report_path, file_type, file_size) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          appointment_id, 
          patient_id, 
          doctor_id, 
          req.file.originalname, 
          req.file.path, 
          req.file.mimetype, 
          req.file.size
        ],
        (insertErr, result) => {
          if (insertErr) {
            console.error(insertErr);
            // Delete uploaded file if database insert fails
            fs.unlinkSync(req.file.path);
            return res.json({ success: false, message: "Failed to save report information" });
          }
          
          res.json({ 
            success: true, 
            message: "Report uploaded successfully",
            reportId: result.insertId
          });
        }
      );
    }
  );
});

// ─── GET REPORTS FOR APPOINTMENT ───
app.get("/api/reports/appointment/:appointmentId", (req, res) => {
  db.query(
    "SELECT * FROM patient_reports WHERE appointment_id = ? ORDER BY uploaded_at DESC",
    [req.params.appointmentId],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: err.message });
      }
      res.json({ success: true, reports: results });
    }
  );
});

// ─── DOWNLOAD REPORT ───
app.get("/api/report/download/:reportId", (req, res) => {
  db.query(
    "SELECT * FROM patient_reports WHERE id = ?",
    [req.params.reportId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).send("Report not found");
      }
      
      const report = results[0];
      const filePath = report.report_path;
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Report file not found");
      }
      
      res.download(filePath, report.report_name, (downloadErr) => {
        if (downloadErr) {
          console.error("Download error:", downloadErr);
          res.status(500).send("Error downloading file");
        }
      });
    }
  );
});

// ─── CHECK UPLOAD ELIGIBILITY ───
app.get("/api/check-upload-eligibility/:appointmentId", (req, res) => {
  db.query(
    "SELECT booking_date, completed FROM bookings WHERE id = ?",
    [req.params.appointmentId],
    (err, results) => {
      if (err || results.length === 0) {
        return res.json({ success: false, eligible: false, message: "Appointment not found" });
      }
      
      const booking = results[0];
      
      if (!booking.completed) {
        return res.json({ success: false, eligible: false, message: "Appointment not completed yet" });
      }
      
      const appointmentDate = new Date(booking.booking_date);
      const currentDate = new Date();
      const daysDifference = Math.floor((currentDate - appointmentDate) / (1000 * 60 * 60 * 24));
      
      if (daysDifference > 10) {
        return res.json({ 
          success: true, 
          eligible: false, 
          message: "Upload period expired (10 days limit)",
          daysRemaining: 0
        });
      }
      
      res.json({ 
        success: true, 
        eligible: true, 
        daysRemaining: 10 - daysDifference,
        message: `You have ${10 - daysDifference} days remaining to upload reports`
      });
    }
  );
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
