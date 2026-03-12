import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['GROUP', 'MESSAGE']),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/folders
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { type } = req.query as { type?: string };
  const folders = await prisma.folder.findMany({
    where: {
      campaignId: req.params.campaignId,
      ...(type ? { type: type as any } : {}),
    },
    include: {
      _count: { select: { groups: true, messages: true } },
    },
  });
  res.json(folders);
});

// POST /campaigns/:campaignId/folders
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const folder = await prisma.folder.create({
    data: { campaignId: req.params.campaignId, ...parsed.data },
  });
  res.status(201).json(folder);
});

// PATCH /campaigns/:campaignId/folders/:folderId
router.patch('/:folderId', async (req: AuthRequest, res: Response) => {
  const folder = await prisma.folder.update({
    where: { id: req.params.folderId },
    data: { name: req.body.name },
  });
  res.json(folder);
});

// DELETE /campaigns/:campaignId/folders/:folderId
router.delete('/:folderId', async (req: AuthRequest, res: Response) => {
  await prisma.folder.deleteMany({
    where: { id: req.params.folderId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

export default router;
