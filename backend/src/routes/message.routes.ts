import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createMessageSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(['TEXT', 'LINK', 'POLL', 'EVENT', 'CONTACT']).optional(),
  folderId: z.string().uuid().optional(),
  mentionAll: z.boolean().optional(),
  hasAttachment: z.boolean().optional(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  useAI: z.boolean().optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/messages
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { folderId, search, type, favorite } = req.query as Record<string, string>;

  const messages = await prisma.message.findMany({
    where: {
      campaignId: req.params.campaignId,
      ...(folderId ? { folderId } : {}),
      ...(type ? { type: type as any } : {}),
      ...(favorite === 'true' ? { isFavorite: true } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { folder: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ messages, total: messages.length });
});

// POST /campaigns/:campaignId/messages
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const message = await prisma.message.create({
    data: {
      campaignId: req.params.campaignId,
      ...parsed.data,
      tags: parsed.data.tags ?? [],
    },
  });
  res.status(201).json(message);
});

// PATCH /campaigns/:campaignId/messages/:messageId
router.patch('/:messageId', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const message = await prisma.message.update({
    where: { id: req.params.messageId },
    data: req.body,
  });
  res.json(message);
});

// PATCH /campaigns/:campaignId/messages/:messageId/favorite
router.patch('/:messageId/favorite', async (req: AuthRequest, res: Response) => {
  const message = await prisma.message.findUnique({
    where: { id: req.params.messageId },
  });
  if (!message) {
    res.status(404).json({ error: 'Mensagem não encontrada' });
    return;
  }
  const updated = await prisma.message.update({
    where: { id: req.params.messageId },
    data: { isFavorite: !message.isFavorite },
  });
  res.json(updated);
});

// DELETE /campaigns/:campaignId/messages/:messageId
router.delete('/:messageId', async (req: AuthRequest, res: Response) => {
  await prisma.message.deleteMany({
    where: { id: req.params.messageId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

// POST /campaigns/:campaignId/messages/import — import messages in bulk
router.post('/import', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { messages } = req.body as {
    messages: z.infer<typeof createMessageSchema>[];
  };

  const created = await prisma.message.createMany({
    data: messages.map((m) => ({
      campaignId: req.params.campaignId,
      ...m,
      tags: m.tags ?? [],
    })),
    skipDuplicates: true,
  });

  res.status(201).json({ count: created.count });
});

export default router;
