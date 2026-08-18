import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { CampaignStatus } from "../../../database/entities/campaign.entity";

/** Query params for GET /v1/campaigns — OAS §7. */
export class ListCampaignsQueryDto {
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}
