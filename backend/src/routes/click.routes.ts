import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import UAParser from 'ua-parser-js';
import crypto from 'crypto';

const router = Router({ mergeParams: true });

// Public route: track a click via slug
router.get('/track/:slug', async (req: Request, res: Response) => {
  const link = await prisma.campaignLink.findUnique({
    where: { slug: req.params.slug },
    include: {
      campaign: {
        include: {
          groups: {
            where: { status: 'ACTIVE', captureEnabled: true },
            orderBy: { participantCount: 'asc' },
          },
        },
      },
    },
  });

  if (!link || !link.isActive) {
    res.status(404).json({ error: 'Link não encontrado' });
    return;
  }

  const ua = new UAParser(req.headers['user-agent']);
  const deviceType = ua.getDevice().type ?? 'desktop';
  const deviceMap: Record<string, string> = {
    mobile: 'MOBILE',
    tablet: 'TABLET',
    desktop: 'DESKTOP',
  };

  const ipHash = crypto
    .createHash('sha256')
    .update(req.ip ?? '')
    .digest('hex');

  await prisma.click.create({
    data: {
      campaignId: link.campaignId,
      linkId: link.id,
      device: (deviceMap[deviceType] ?? 'UNKNOWN') as any,
      origin: req.headers.referer ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      ipHash,
    },
  });

  // Redirect to main URL
  res.redirect(link.campaign.mainRedirectUrl);
});

// Authenticated routes below
router.use(authenticate);

// GET /campaigns/:campaignId/clicks
router.get('/', async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { campaignId: req.params.campaignId };
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.createdAt = dateFilter;
  }

  const clicks = await prisma.click.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  // Aggregate by date
  const byDate: Record<string, number> = {};
  const byHour: Record<string, number> = {};
  const byDevice: Record<string, number> = { MOBILE: 0, DESKTOP: 0, TABLET: 0, UNKNOWN: 0 };
  const byOrigin: Record<string, number> = {};

  for (const click of clicks) {
    const date = click.createdAt.toISOString().slice(0, 10);
    const hour = click.createdAt.getHours().toString().padStart(2, '0');
    byDate[date] = (byDate[date] ?? 0) + 1;
    byHour[hour] = (byHour[hour] ?? 0) + 1;
    byDevice[click.device] = (byDevice[click.device] ?? 0) + 1;
    const origin = click.origin ?? 'direct';
    byOrigin[origin] = (byOrigin[origin] ?? 0) + 1;
  }

  res.json({
    total: clicks.length,
    byDate: Object.entries(byDate).map(([date, count]) => ({ date, count })),
    byHour: Object.entries(byHour).map(([hour, count]) => ({ hour, count })),
    byDevice: Object.entries(byDevice).map(([device, count]) => ({
      device,
      count,
    })),
    byOrigin: Object.entries(byOrigin)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([origin, count]) => ({ origin, count })),
  });
});

export default router;
