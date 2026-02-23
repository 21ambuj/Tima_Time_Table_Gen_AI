# 📅 Tima – AI-Powered Academic Timetable Scheduler

> **“Intelligent Scheduling Made Effortless.”**

Tima is a robust, multi-tenant SaaS application designed to automate the complex process of academic timetable generation.  
It replaces weeks of manual administrative work by generating **conflict-free schedules in seconds** using intelligent algorithms.

---

## 🚀 Key Features

### 🔐 Security & Access Control
- **Multi-Tenancy:** Complete data isolation for each institution using unique School IDs  
- **Role-Based Access:** Super Admin, School Admin, Faculty, and Student roles  
- **Secure Authentication:** JWT-based authentication with HTTP-only cookies  
- **OTP Verification:** Email-based OTP for signup and password reset  

---

### 🧠 Intelligent Automation
- **AI Timetable Generator:** Automatically resolves constraints like:
  - Teacher overlap  
  - Room capacity  
  - Section workload  
- **Real-Time Visualization:** Live progress view of timetable generation using Socket.io  
- **Automatic Resource Mapping:** CSV uploads auto-link teachers with eligible subjects  

---

### 💻 Modern User Experience
- **Universal Bulk Upload:** Upload Teachers, Subjects, Rooms, and Sections via CSV  
- **Progressive Web App (PWA):** Installable on mobile and desktop devices  
- **Modern UI:** Glassmorphism-inspired interface using Tailwind CSS  
- **Developer Console:** Centralized management panel for global control  

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (Vite)  
- **Styling:** Tailwind CSS  
- **State Management:** React Context API  
- **HTTP Client:** Axios  
- **Real-Time:** Socket.io Client  

### Backend
- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** MongoDB Atlas (Mongoose ODM)  
- **Authentication:** JWT, BCrypt  
- **Email Service:** Nodemailer (SMTP)  
- **Real-Time:** Socket.io  

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/21ambuj/Tima_Time_Table_Gen_AI.git
cd Tima_Time_Table_Gen_AI

