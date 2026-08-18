import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

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

  @IsOptional()
  @IsUUID()
  agencyId?: string;
}
