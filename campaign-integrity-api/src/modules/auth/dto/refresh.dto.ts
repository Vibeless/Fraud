import { IsString, MinLength } from 'class-validator';

/** Request body for POST /v1/auth/refresh — OAS §8. */
export class RefreshDto {
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
