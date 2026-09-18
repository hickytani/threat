import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Safety guards: seed is for development/demo purposes only
  if (process.env.NODE_ENV === 'production') {
    console.error('\n[SEED BLOCKED] npm run seed is not permitted in NODE_ENV=production.');
    console.error('Use prisma migrate deploy to apply schema changes in production.');
    console.error('To load demo data into a staging environment, set ALLOW_DEMO_SEED=true with NODE_ENV=staging.\n');
    process.exit(1);
  }

  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    console.warn('\n[SEED SKIPPED] ALLOW_DEMO_SEED is not set to "true". Skipping demo seed.');
    console.warn('Set ALLOW_DEMO_SEED=true in your .env to allow developer demo seeding.\n');
    process.exit(0);
  }

  console.log('Seeding ThreatSync OS database with standard developer credentials...');

  const passwordHash = await bcrypt.hash('ThreatSyncSecured2026!', 12);

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
