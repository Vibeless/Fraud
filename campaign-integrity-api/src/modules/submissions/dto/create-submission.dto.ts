import {
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from "class-validator";

/** Request body for POST /v1/submissions — OAS §5. */
export class CreateSubmissionDto {
  @IsUrl({}, { message: "postUrl must be a valid X post URL" })
  postUrl!: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalSubmissionId?: string;

  @IsOptional()
  @IsUUID()
  agencyId?: string;
}
