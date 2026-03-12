import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router({ mergeParams: true });
router.use(authenticate);

const createScheduleSchema = z.object({
  type: z.enum([
    'SEND_MESSAGE',
    'CHANGE_GROUP_NAME',
    'CHANGE_GROUP_DESCRIPTION',
    'EXPORT_CONTACTS',
    'CHANGE_GROUP_IMAGE',
    'PROMOTE_ADMIN',
    'ADD_USER',
    'EDIT_GROUP_DATA',
    'REMOVE_CONTACTS',
    'LEAVE_GROUP',
    'WELCOME_MESSAGE',
  ]),
  groupIds: z.array(z.string().uuid()),
  messageId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime(),
  config: z.record(z.unknown()).optional(),
});

async function verifyCampaign(campaignId: string, userId: string) {
  return prisma.campaign.findFirst({ where: { id: campaignId, userId } });
}

// GET /campaigns/:campaignId/schedules
router.get('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const { status, date } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { campaignId: req.params.campaignId };
  if (status) where.status = status;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.scheduledAt = { gte: start, lt: end };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      message: { select: { id: true, title: true } },
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  res.json(schedules);
});

// POST /campaigns/:campaignId/schedules
router.post('/', async (req: AuthRequest, res: Response) => {
  const campaign = await verifyCampaign(req.params.campaignId, req.userId!);
  if (!campaign) {
    res.status(404).json({ error: 'Campanha não encontrada' });
    return;
  }

  const parsed = createScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { groupIds, ...rest } = parsed.data;

  const schedule = await prisma.schedule.create({
    data: {
      campaignId: req.params.campaignId,
      ...rest,
      scheduledAt: new Date(rest.scheduledAt),
      groups: {
        create: groupIds.map((groupId) => ({ groupId })),
      },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  res.status(201).json(schedule);
});

// PATCH /campaigns/:campaignId/schedules/:scheduleId/cancel
router.patch('/:scheduleId/cancel', async (req: AuthRequest, res: Response) => {
  const schedule = await prisma.schedule.findFirst({
    where: { id: req.params.scheduleId, campaignId: req.params.campaignId },
  });
  if (!schedule) {
    res.status(404).json({ error: 'Agendamento não encontrado' });
    return;
  }
  const updated = await prisma.schedule.update({
    where: { id: req.params.scheduleId },
    data: { status: 'CANCELLED' },
  });
  res.json(updated);
});

// DELETE /campaigns/:campaignId/schedules/:scheduleId
router.delete('/:scheduleId', async (req: AuthRequest, res: Response) => {
  await prisma.schedule.deleteMany({
    where: { id: req.params.scheduleId, campaignId: req.params.campaignId },
  });
  res.status(204).send();
});

export default router;
