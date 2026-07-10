import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { handleSocketEvents } from './src/socket/socketHandler.js';

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS
const allowedOrigins = [
  'http://localhost:5173', // Local development Vite dev server
  process.env.FRONTEND_URL,  // Production frontend URL deployed on Render
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));

app.use(express.json());

// Render Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const httpServer = createServer(app);

// Integrate Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

handleSocketEvents(io);

httpServer.listen(port, () => {
  console.log(`UNO Multiplayer Server running on port ${port}`);
});
