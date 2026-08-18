import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiKey, AuditLog, User } from "../../database/entities";
import { AuditController } from "./audit.controller";
import { AuditService } from "./audit.service";

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, User, ApiKey])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
