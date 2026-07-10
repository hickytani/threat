import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ThreatSync OS database with standard developer credentials...');

  const passwordHash = await bcrypt.hash('ThreatSyncSecured2026!', 10);

  // 1. Create default analyst user
  const user = await prisma.user.upsert({
    where: { email: 'analyst@threatsync.local' },
    update: {},
    create: {
      email: 'analyst@threatsync.local',
      fullName: 'Sarah Connor',
      passwordHash,
      isActive: true,
    },
  });

  // 2. Create default organization
  const org = await prisma.organization.create({
    data: {
      name: 'Default SOC Organization',
      industry: 'Technology',
      size: '11-50',
      country: 'United States',
      timeZone: 'UTC-5 (EST)',
    },
  });

  // 3. Associate as administrator membership
  await prisma.organizationMember.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      role: 'ORG_ADMIN',
    },
  });

  console.log('Database seed completed successfully.');
  console.log('--------------------------------------------------');
  console.log('DEMO LOGIN CREDENTIALS:');
  console.log('Email:     analyst@threatsync.local');
  console.log('Password:  ThreatSyncSecured2026!');
  console.log(`Org ID:    ${org.id}`);
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
