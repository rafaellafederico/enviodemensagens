import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

/**
 * Runs every minute — picks up SCHEDULED tasks whose scheduledAt is in the past
 * and marks them as EXECUTED (in production, would also dispatch the actual action).
 */
export function startScheduler(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const pending = await prisma.schedule.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: new Date() },
        },
        include: {
          groups: { include: { group: true } },
          message: true,
        },
        take: 50,
      });

      for (const schedule of pending) {
        try {
          // TODO: In production, dispatch real WhatsApp action based on schedule.type
          // e.g., send message via Baileys, change group name, export contacts, etc.
          logger.info(`Executing schedule ${schedule.id} type=${schedule.type}`);

          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { status: 'EXECUTED', executedAt: new Date() },
          });
        } catch (err) {
          logger.error(`Failed to execute schedule ${schedule.id}`, err);
          await prisma.schedule.update({
            where: { id: schedule.id },
            data: { status: 'FAILED' },
          });
        }
      }
    } catch (err) {
      logger.error('Scheduler error', err);
    }
  });

  logger.info('Scheduler started');
}
