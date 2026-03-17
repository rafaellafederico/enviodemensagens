import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createChannelSchema = z.object({
  name: z.string().min(1),
  inviteLink: z.string().url().optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/channels
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const channels = await prisma.channel.findMany({
    where: { campaignId: req.params.campaignId },
    orderBy: { createdAt: 'desc' },
  });

  res.json(channels);
});

// POST /campaigns/:campaignId/channels
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const channel = await prisma.channel.create({
    data: {
      campaignId: req.params.campaignId,
      ...parsed.data,
    },
  });
  res.status(201).json(channel);
});

// PATCH /campaigns/:campaignId/channels/:channelId
router.patch('/:channelId', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const channel = await prisma.channel.update({
    where: { id: req.params.channelId },
    data: req.body,
  });
  res.json(channel);
});

// DELETE /campaigns/:campaignId/channels/:channelId
router.delete('/:channelId', async (req: AuthRequest, res: Response) => {
  await prisma.channel.deleteMany({
    where: { id: req.params.channelId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

export default router;
