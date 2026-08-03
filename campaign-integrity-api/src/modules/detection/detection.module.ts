import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analysis, Finding, Submission, XDataSnapshot } from '../../database/entities';
import { XIntegrationModule } from '../x-integration/x-integration.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { CollectorService } from './pipeline/collector.service';
import { ValidatorService } from './pipeline/validator.service';
import { PipelineOrchestrator } from './pipeline/pipeline.orchestrator';
import { RuleEngineService } from './rule-engine.service';
import { RiskAggregatorService } from './aggregator/risk-aggregator.service';
import { EvidenceGeneratorService } from './evidence/evidence-generator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Analysis, Finding, XDataSnapshot]),
    XIntegrationModule,
    IntelligenceModule,
  ],
  providers: [
    CollectorService,
    ValidatorService,
    PipelineOrchestrator,
    RuleEngineService,
    RiskAggregatorService,
    EvidenceGeneratorService,
  ],
  exports: [PipelineOrchestrator, EvidenceGeneratorService],
})
export class DetectionModule {}
