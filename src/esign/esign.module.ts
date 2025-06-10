// src/esign/esign.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EsignController } from './esign.controller';
import { EsignService } from './esign.service';

@Module({
  imports: [HttpModule],
  controllers: [EsignController],
  providers: [EsignService],
})
export class EsignModule {}
