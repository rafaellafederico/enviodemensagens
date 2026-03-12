import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createGroupSchema = z.object({
  name: z.string().min(1),
  inviteLink: z.string().url().optional(),
  folderId: z.string().uuid().optional(),
  communityId: z.string().uuid().optional(),
  maxCapacity: z.number().int().optional(),
  whatsappGroupId: z.string().optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/groups
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { status, folderId, search } = req.query as Record<string, string>;

  const groups = await prisma.group.findMany({
    where: {
      campaignId: req.params.campaignId,
      ...(status ? { status: status as any } : {}),
      ...(folderId ? { folderId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      folder: { select: { id: true, name: true } },
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const counts = {
    total: await prisma.group.count({ where: { campaignId: req.params.campaignId } }),
    active: await prisma.group.count({ where: { campaignId: req.params.campaignId, status: 'ACTIVE' } }),
    inactive: await prisma.group.count({ where: { campaignId: req.params.campaignId, status: 'INACTIVE' } }),
    warning: await prisma.group.count({ where: { campaignId: req.params.campaignId, status: 'WARNING' } }),
    full: await prisma.group.count({ where: { campaignId: req.params.campaignId, status: 'FULL' } }),
  };

  res.json({ groups, counts });
});

// POST /campaigns/:campaignId/groups
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const group = await prisma.group.create({
    data: {
      campaignId: req.params.campaignId,
      ...parsed.data,
    },
  });
  res.status(201).json(group);
});

// POST /campaigns/:campaignId/groups/bulk — import multiple groups
router.post('/bulk', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { groups } = req.body as { groups: z.infer<typeof createGroupSchema>[] };
  if (!Array.isArray(groups)) {
    res.status(400).json({ error: 'groups deve ser um array' });
    return;
  }

  const created = await prisma.group.createMany({
    data: groups.map((g) => ({ campaignId: req.params.campaignId, ...g })),
    skipDuplicates: true,
  });

  res.status(201).json({ count: created.count });
});

// PATCH /campaigns/:campaignId/groups/:groupId
router.patch('/:groupId', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const group = await prisma.group.update({
    where: { id: req.params.groupId },
    data: req.body,
  });
  res.json(group);
});

// DELETE /campaigns/:campaignId/groups/:groupId
router.delete('/:groupId', async (req: AuthRequest, res: Response) => {
  await prisma.group.deleteMany({
    where: { id: req.params.groupId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

// PATCH /campaigns/:campaignId/groups/bulk-action
router.patch('/bulk-action', async (req: AuthRequest, res: Response) => {
  const { groupIds, action } = req.body as {
    groupIds: string[];
    action: 'activate' | 'deactivate' | 'delete';
  };

  if (!Array.isArray(groupIds)) {
    res.status(400).json({ error: 'groupIds deve ser um array' });
    return;
  }

  if (action === 'delete') {
    await prisma.group.deleteMany({
      where: { id: { in: groupIds }, campaignId: req.params.campaignId },
    });
  } else {
    const status = action === 'activate' ? 'ACTIVE' : 'INACTIVE';
    const captureEnabled = action === 'activate';
    await prisma.group.updateMany({
      where: { id: { in: groupIds }, campaignId: req.params.campaignId },
      data: { status: status as any, captureEnabled },
    });
  }

  res.json({ success: true });
});

export default router;
