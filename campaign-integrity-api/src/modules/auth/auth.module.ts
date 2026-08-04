import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User, AuditLog } from "../../database/entities";

@Module({
  imports: [TypeOrmModule.forFeature([User, AuditLog])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
