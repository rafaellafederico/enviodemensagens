import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const createSessionSchema = z.object({
  phoneNumber: z.string().min(10),
});

// GET /whatsapp/sessions
router.get('/sessions', async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.whatsappSession.findMany({
    where: { userId: req.userId! },
    select: {
      id: true,
      phoneNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  res.json(sessions);
});

// POST /whatsapp/sessions
router.post('/sessions', async (req: AuthRequest, res: Response) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const session = await prisma.whatsappSession.create({
    data: {
      userId: req.userId!,
      phoneNumber: parsed.data.phoneNumber,
      status: 'DISCONNECTED',
    },
  });

  // In a real implementation, initialize WhatsApp Web connection here
  // and emit QR code via WebSocket
  res.status(201).json({
    ...session,
    message: 'Sessão criada. Conecte via QR Code ou código de pareamento.',
  });
});

// POST /whatsapp/sessions/:sessionId/connect
router.post('/sessions/:sessionId/connect', async (req: AuthRequest, res: Response) => {
  const session = await prisma.whatsappSession.findFirst({
    where: { id: req.params.sessionId, userId: req.userId! },
  });
  if (!session) {
    res.status(404).json({ error: 'Sessão não encontrada' });
    return;
  }

  // Mock QR code — in production, generate real QR via Baileys/WA-Web
  const mockQr = `https://api.qrserver.com/v1/create-qr-code/?data=whatsapp-pairing-${session.id}&size=200x200`;

  await prisma.whatsappSession.update({
    where: { id: session.id },
    data: { status: 'PAIRING', qrCode: mockQr },
  });

  res.json({ qrCode: mockQr, status: 'PAIRING' });
});

// DELETE /whatsapp/sessions/:sessionId
router.delete('/sessions/:sessionId', async (req: AuthRequest, res: Response) => {
  await prisma.whatsappSession.deleteMany({
    where: { id: req.params.sessionId, userId: req.userId! },
  });
  res.status(204).send();
});

export default router;
