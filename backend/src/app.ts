import dotenv from 'dotenv';
import path from 'path';

// Load environment variables on startup
dotenv.config();

// Register all Mongoose Models at boot
import './models/Permission';
import './models/Role';
import './models/User';
import './models/Department';
import './models/ComplaintCategory';
import './models/Complaint';
import './models/ComplaintHistory';
import './models/ComplaintMessage';
import './models/Rating';
import './models/AuditLog';
import './models/Notification';

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';

import { connectDB } from './config/db';
import { logger } from './config/logger';
import { startSLAService } from './services/slaService';

// Import Route modules
import authRoutes from './routes/auth';
import complaintRoutes from './routes/complaints';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:8081'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Setup global Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows loading local file assets in web pages
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Logging with Winston integration
const morganStream = {
  write: (text: string) => {
    logger.info(text.trim());
  },
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Static directory for locally saved image uploads (mock Cloudinary mode)
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Healthcheck Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Setup REST routing API gateways
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Global express fallback error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled Server Exception: %O', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.',
  });
});

// Socket.io real-time connection routing
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Room mapping: join individual complaint room channel
  socket.on('join_complaint_room', (complaintId: string) => {
    socket.join(complaintId);
    logger.debug(`Socket ${socket.id} joined complaint room: ${complaintId}`);
  });

  // Leaving complaint room
  socket.on('leave_complaint_room', (complaintId: string) => {
    socket.leave(complaintId);
    logger.debug(`Socket ${socket.id} left complaint room: ${complaintId}`);
  });

  // Client typing status indicator event
  socket.on('typing', ({ complaintId, userId, userName, isTyping }) => {
    socket.to(complaintId).emit('typing_status', { userId, userName, isTyping });
  });

  // Direct Message relay handler
  socket.on('send_message', (message) => {
    // message is standard IComplaintMessage object
    socket.to(message.complaintId).emit('new_message', message);
    logger.debug(`Relayed realtime message for complaint ${message.complaintId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Start SLA escalation daemon (scans database every 60 seconds)
startSLAService(60 * 1000);

// Initialize Server listener
server.listen(PORT, () => {
  logger.info(`eCMS Backend Service listening on port ${PORT}`);
});

export { app, server, io };
