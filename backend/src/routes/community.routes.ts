import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createCommunitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inviteLink: z.string().url().optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/communities
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const communities = await prisma.community.findMany({
    where: { campaignId: req.params.campaignId },
    include: {
      _count: { select: { groups: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(communities);
});

// POST /campaigns/:campaignId/communities
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createCommunitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const community = await prisma.community.create({
    data: {
      campaignId: req.params.campaignId,
      ...parsed.data,
    },
  });
  res.status(201).json(community);
});

// PATCH /campaigns/:campaignId/communities/:communityId
router.patch('/:communityId', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const community = await prisma.community.update({
    where: { id: req.params.communityId },
    data: req.body,
  });
  res.json(community);
});

// DELETE /campaigns/:campaignId/communities/:communityId
router.delete('/:communityId', async (req: AuthRequest, res: Response) => {
  await prisma.community.deleteMany({
    where: { id: req.params.communityId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

export default router;
