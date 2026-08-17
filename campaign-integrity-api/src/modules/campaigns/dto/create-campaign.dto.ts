import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * OAS §7: Request body for POST /v1/campaigns
 */
export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalCampaignId?: string;
}
