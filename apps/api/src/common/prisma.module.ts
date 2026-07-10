import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { SeederService } from './seeder.service.js';

@Global()
@Module({
  providers: [PrismaService, SeederService],
  exports: [PrismaService, SeederService],
})
export class PrismaModule {}
