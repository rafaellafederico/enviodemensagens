import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'admin@enviomensagens.com' },
    update: {},
    create: {
      name: 'Admin EnvioMensagens',
      email: 'admin@enviomensagens.com',
      passwordHash,
      plan: 'BLACK',
    },
  });

  console.log(`User: ${user.email}`);

  const session = await prisma.whatsappSession.create({
    data: {
      userId: user.id,
      phoneNumber: '+55 (11) 99999-9999',
      status: 'CONNECTED',
    },
  });

  const campaign = await prisma.campaign.create({
    data: {
      userId: user.id,
      sessionId: session.id,
      name: 'Campanha Demo',
      mainRedirectUrl: 'https://enviomensagens.com',
      planTier: 'BLACK',
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Links
  const linkTypes = ['MAIN', 'DEEP', 'COOKIE', 'REDIRECT'] as const;
  await prisma.campaignLink.createMany({
    data: linkTypes.map((type) => ({
      campaignId: campaign.id,
      type,
      slug: `demo-${type.toLowerCase()}`,
    })),
  });

  // Folders
  const groupFolder = await prisma.folder.create({
    data: { campaignId: campaign.id, name: 'Grupos Principais', type: 'GROUP' },
  });
  const msgFolder = await prisma.folder.create({
    data: { campaignId: campaign.id, name: 'Boas-vindas', type: 'MESSAGE' },
  });

  // Groups
  for (let i = 1; i <= 5; i++) {
    await prisma.group.create({
      data: {
        campaignId: campaign.id,
        folderId: groupFolder.id,
        name: `Grupo VIP ${i}`,
        inviteLink: `https://chat.whatsapp.com/demo${i}`,
        participantCount: Math.floor(Math.random() * 900),
        maxCapacity: 1024,
        status: 'ACTIVE',
        captureEnabled: true,
      },
    });
  }

  // Messages
  const messageTitles = [
    'Boas-vindas ao Grupo',
    'Oferta Especial',
    'Lembrete Diário',
    'Anúncio Importante',
    'Promoção Relâmpago',
  ];

  for (const title of messageTitles) {
    await prisma.message.create({
      data: {
        campaignId: campaign.id,
        folderId: msgFolder.id,
        title,
        content: `${title} — conteúdo da mensagem aqui. 🎉`,
        type: 'TEXT',
        tags: ['Boas Vindas'],
      },
    });
  }

  console.log('Seed completed!');
  console.log('Login: admin@enviomensagens.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
