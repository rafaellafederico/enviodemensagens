import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { logger } from './lib/logger';
import { startScheduler } from './services/scheduler';

import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import groupRoutes from './routes/group.routes';
import messageRoutes from './routes/message.routes';
import scheduleRoutes from './routes/schedule.routes';
import clickRoutes from './routes/click.routes';
import monitoringRoutes from './routes/monitoring.routes';
import folderRoutes from './routes/folder.routes';
import reportRoutes from './routes/report.routes';
import linkRoutes from './routes/link.routes';
import whatsappRoutes from './routes/whatsapp.routes';

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
});

// WebSocket: real-time metrics
io.on('connection', (socket) => {
  logger.debug(`WS connected: ${socket.id}`);
  socket.on('subscribe:campaign', (campaignId: string) => {
    socket.join(`campaign:${campaignId}`);
  });
  socket.on('disconnect', () => {
    logger.debug(`WS disconnected: ${socket.id}`);
  });
});

// Make io available in routes if needed
app.set('io', io);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
});
app.use(limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/campaigns/:campaignId/groups', groupRoutes);
app.use('/api/campaigns/:campaignId/messages', messageRoutes);
app.use('/api/campaigns/:campaignId/schedules', scheduleRoutes);
app.use('/api/campaigns/:campaignId/clicks', clickRoutes);
app.use('/api/campaigns/:campaignId/monitoring', monitoringRoutes);
app.use('/api/campaigns/:campaignId/folders', folderRoutes);
app.use('/api/campaigns/:campaignId/reports', reportRoutes);
app.use('/api/campaigns/:campaignId/links', linkRoutes);

// Public click-tracking route
app.use('/r', clickRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
);

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  startScheduler();
});
