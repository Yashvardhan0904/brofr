import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialResolvers } from './social.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SocialService, ...SocialResolvers],
  exports: [SocialService],
})
export class SocialModule {}
