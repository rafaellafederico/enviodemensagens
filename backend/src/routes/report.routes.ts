import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/reports
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const reports = await prisma.report.findMany({
    where: { campaignId: req.params.campaignId },
    orderBy: { generatedAt: 'desc' },
  });
  res.json(reports);
});

// POST /campaigns/:campaignId/reports/generate
router.post('/generate', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { type } = req.body as {
    type: 'SCHEDULED' | 'GROUPS_LEADS' | 'GROUPS_LINKS' | 'ENTRY_EXIT';
  };

  // Plan tier checks
  if (type === 'GROUPS_LEADS' && campaign.planTier !== 'BLACK') {
    res.status(403).json({ error: 'Plano Black necessário para este relatório' });
    return;
  }
  if (
    (type === 'GROUPS_LINKS' || type === 'ENTRY_EXIT') &&
    !['PREMIUM', 'BLACK'].includes(campaign.planTier)
  ) {
    res.status(403).json({
      error: 'Plano Premium ou Black necessário para este relatório',
    });
    return;
  }

  let data: Record<string, unknown> = {};

  if (type === 'SCHEDULED') {
    const schedules = await prisma.schedule.findMany({
      where: { campaignId: req.params.campaignId },
      include: { message: { select: { title: true } }, groups: true },
    });
    data = { schedules };
  } else if (type === 'GROUPS_LEADS') {
    const groups = await prisma.group.findMany({
      where: { campaignId: req.params.campaignId },
      include: { leads: true },
    });
    data = { groups };
  } else if (type === 'GROUPS_LINKS') {
    const groups = await prisma.group.findMany({
      where: { campaignId: req.params.campaignId },
      select: { id: true, name: true, inviteLink: true, status: true },
    });
    data = { groups };
  } else if (type === 'ENTRY_EXIT') {
    const leads = await prisma.lead.findMany({
      where: { campaignId: req.params.campaignId },
      include: { group: { select: { name: true } } },
      orderBy: { joinedAt: 'desc' },
    });
    data = { leads };
  }

  const report = await prisma.report.create({
    data: {
      campaignId: req.params.campaignId,
      type,
      data,
    },
  });

  res.status(201).json(report);
});

export default router;
