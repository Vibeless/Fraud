import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { API_KEY_SCOPES, ApiKeyScope } from "./api-key-scopes";

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(API_KEY_SCOPES, { each: true })
  scopes!: ApiKeyScope[];

  @IsOptional()
  @IsUUID()
  agencyId?: string;
}
