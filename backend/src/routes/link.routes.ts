import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createExtraSchema = z.object({
  label: z.string().min(1),
  groupIds: z.array(z.string().uuid()).optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/links
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const links = await prisma.campaignLink.findMany({
    where: { campaignId: req.params.campaignId },
    include: {
      groupLinks: { include: { group: { select: { id: true, name: true } } } },
      _count: { select: { clicks: true } },
    },
  });
  res.json(links);
});

// POST /campaigns/:campaignId/links (create extra link)
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createExtraSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const link = await prisma.campaignLink.create({
    data: {
      campaignId: req.params.campaignId,
      type: 'EXTRA',
      slug: `${uuid().slice(0, 8)}-extra`,
      label: parsed.data.label,
      groupLinks: parsed.data.groupIds
        ? {
            create: parsed.data.groupIds.map((groupId) => ({ groupId })),
          }
        : undefined,
    },
    include: { groupLinks: true },
  });
  res.status(201).json(link);
});

// PATCH /campaigns/:campaignId/links/:linkId
router.patch('/:linkId', async (req: AuthRequest, res: Response) => {
  const { label, isActive, groupIds } = req.body;

  const link = await prisma.campaignLink.update({
    where: { id: req.params.linkId },
    data: {
      ...(label !== undefined ? { label } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  if (groupIds !== undefined) {
    await prisma.groupLink.deleteMany({ where: { linkId: req.params.linkId } });
    if (groupIds.length > 0) {
      await prisma.groupLink.createMany({
        data: (groupIds as string[]).map((groupId) => ({
          linkId: req.params.linkId,
          groupId,
        })),
      });
    }
  }

  res.json(link);
});

// DELETE /campaigns/:campaignId/links/:linkId (only EXTRA links)
router.delete('/:linkId', async (req: AuthRequest, res: Response) => {
  const link = await prisma.campaignLink.findFirst({
    where: {
      id: req.params.linkId,
      campaignId: req.params.campaignId,
      type: 'EXTRA',
    },
  });
  if (!link) {
    res.status(404).json({ error: 'Link não encontrado ou não pode ser removido' });
    return;
  }
  await prisma.campaignLink.delete({ where: { id: req.params.linkId } });
  res.status(204).send();
});

export default router;
