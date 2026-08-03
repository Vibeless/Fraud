import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubmissionsController } from './submissions.controller';
import { AnalysesController } from './analyses.controller';
import { SubmissionsService } from './submissions.service';
import { Analysis, Finding, Submission } from '../../database/entities';
import { QueueModule } from '../../queue/queue.module';
import { DetectionModule } from '../detection/detection.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Analysis, Finding]),
    QueueModule,
    DetectionModule,
  ],
  controllers: [SubmissionsController, AnalysesController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
