import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const upsertSchema = z.object({
  groupId: z.string().uuid(),
  isActive: z.boolean().optional(),
  onJoinWebhook: z
    .enum(['OFFICIAL_CAMPAIGN', 'NORMAL_CAMPAIGN', 'EXTERNAL', 'CURRENT_CAMPAIGN'])
    .optional(),
  onLeaveWebhook: z
    .enum(['OFFICIAL_CAMPAIGN', 'NORMAL_CAMPAIGN', 'EXTERNAL', 'CURRENT_CAMPAIGN'])
    .optional(),
  externalJoinUrl: z.string().url().optional(),
  externalLeaveUrl: z.string().url().optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/monitoring
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const monitorings = await prisma.monitoring.findMany({
    where: { campaignId: req.params.campaignId },
    include: { group: { select: { id: true, name: true, status: true } } },
  });

  res.json({ enabled: campaign.monitoringEnabled, monitorings });
});

// POST /campaigns/:campaignId/monitoring
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const monitoring = await prisma.monitoring.upsert({
    where: {
      campaignId_groupId: {
        campaignId: req.params.campaignId,
        groupId: parsed.data.groupId,
      },
    },
    update: parsed.data,
    create: {
      campaignId: req.params.campaignId,
      ...parsed.data,
    },
  });

  res.status(201).json(monitoring);
});

// PATCH /campaigns/:campaignId/monitoring/toggle
router.patch('/toggle', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const updated = await prisma.campaign.update({
    where: { id: req.params.campaignId },
    data: { monitoringEnabled: !campaign.monitoringEnabled },
  });

  res.json({ monitoringEnabled: updated.monitoringEnabled });
});

// DELETE /campaigns/:campaignId/monitoring/:monitoringId
router.delete('/:monitoringId', async (req: AuthRequest, res: Response) => {
  await prisma.monitoring.deleteMany({
    where: {
      id: req.params.monitoringId,
      campaignId: req.params.campaignId,
    },
  });
  res.status(204).send();
});

export default router;
