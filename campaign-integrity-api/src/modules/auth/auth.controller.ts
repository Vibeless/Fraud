import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';
import { AgencyContext } from '../../common/context/agency-context';

/** docs/specs/02_API_Specification_OAS.md §8. */
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // brute-force protection — AAD §7
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto.email, dto.password, request.ip ?? null);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@CurrentAgency() ctx: AgencyContext) {
    if (ctx.userId) {
      await this.authService.logoutAllSessions(ctx.userId);
    }
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentAgency() ctx: AgencyContext) {
    return { id: ctx.userId, role: ctx.role, agencyId: ctx.agencyId };
  }
}
