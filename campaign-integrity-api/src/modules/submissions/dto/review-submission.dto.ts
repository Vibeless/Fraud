import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * OAS §5 & DUXS §4.3: Request body for PATCH /v1/submissions/{id}/review
 */
export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
  reviewerNote?: string;

  @IsOptional()
  @IsBoolean()
  markReviewed?: boolean;
}
