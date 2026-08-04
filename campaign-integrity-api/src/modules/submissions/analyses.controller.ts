import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { SubmissionsService } from "./submissions.service";
import { ApiKeyGuard } from "../../common/guards/api-key.guard";
import { RequireScopes } from "../../common/decorators/require-scopes.decorator";
import { CurrentAgency } from "../../common/decorators/current-agency.decorator";
import { AgencyContext } from "../../common/context/agency-context";

/** docs/specs/02_API_Specification_OAS.md §5 — GET /v1/analyses/{id}. */
@Controller("v1/analyses")
@UseGuards(ApiKeyGuard)
export class AnalysesController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get(":id")
  @RequireScopes("analyses:read")
  getById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentAgency() ctx: AgencyContext,
  ) {
    return this.submissionsService.getAnalysisById(ctx.agencyId, id);
  }
}
