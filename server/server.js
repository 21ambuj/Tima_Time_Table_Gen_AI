
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// 1. MIDDLEWARE

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 2. SOCKET.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => { /* ... */ });

app.use((req, res, next) => {
  req.io = io;
  next();
});

// 3. ROUTES
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/import', require('./routes/import'));

// 4. DB & START
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_timetable_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(5000, () => console.log(`🚀 Server running on port 5000`));
  })
  .catch(err => console.error('❌ MongoDB Error:', err));