import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  sessionId: z.string().uuid().optional(),
  mainRedirectUrl: z.string().url(),
  endDate: z.string().datetime().optional(),
  planTier: z.enum(['BASIC', 'ADVANCED', 'PREMIUM', 'BLACK']).optional(),
});

const updateSettingsSchema = z.object({
  maxClicksPerGroup: z.number().int().optional(),
  cacheDays: z.number().int().optional(),
  randomizeLinks: z.boolean().optional(),
  facebookPixelId: z.string().optional(),
  welcomeMsgStartTime: z.string().optional(),
  welcomeMsgStopTime: z.string().optional(),
  welcomeMsgOffHours: z.string().optional(),
  monitoringEnabled: z.boolean().optional(),
});

// GET /campaigns
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaigns = await prisma.campaign.findMany({
    where: { userId: req.userId! },
    include: {
      session: { select: { phoneNumber: true, status: true } },
      _count: { select: { groups: true, leads: true, clicks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(campaigns);
});

// POST /campaigns
router.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;

  const campaign = await prisma.campaign.create({
    data: {
      userId: req.userId!,
      name: data.name,
      sessionId: data.sessionId,
      mainRedirectUrl: data.mainRedirectUrl,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      planTier: data.planTier ?? 'BASIC',
    },
  });

  // Auto-generate 4 default links
  const linkTypes = ['MAIN', 'DEEP', 'COOKIE', 'REDIRECT'] as const;
  await prisma.campaignLink.createMany({
    data: linkTypes.map((type) => ({
      campaignId: campaign.id,
      type,
      slug: `${uuid().slice(0, 8)}-${type.toLowerCase()}`,
    })),
  });

  res.status(201).json(campaign);
});

// GET /campaigns/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
    include: {
      session: { select: { phoneNumber: true, status: true } },
      links: true,
      _count: {
        select: { groups: true, leads: true, clicks: true, schedules: true },
      },
    },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }
  res.json(campaign);
});

// PATCH /campaigns/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const campaign = await prisma.campaign.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }
  const updated = await prisma.campaign.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(updated);
});

// DELETE /campaigns/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  await prisma.campaign.deleteMany({
    where: { id: req.params.id, userId: req.userId! },
  });
  res.status(204).send();
});

// GET /campaigns/:id/overview
router.get('/:id/overview', async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId: req.userId! },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const [
    totalClicks,
    totalGroups,
    fullGroups,
    availableGroups,
    totalLeads,
    leftLeads,
  ] = await Promise.all([
    prisma.click.count({ where: { campaignId: id } }),
    prisma.group.count({ where: { campaignId: id } }),
    prisma.group.count({ where: { campaignId: id, status: 'FULL' } }),
    prisma.group.count({
      where: { campaignId: id, status: 'ACTIVE', captureEnabled: true },
    }),
    prisma.lead.count({ where: { campaignId: id } }),
    prisma.lead.count({
      where: { campaignId: id, leftAt: { not: null } },
    }),
  ]);

  const joinedLeads = totalLeads - leftLeads;

  res.json({
    totalClicks,
    totalGroups,
    fullGroups,
    availableGroups,
    totalParticipants: totalLeads,
    joined: joinedLeads,
    left: leftLeads,
  });
});

export default router;
