import { IsEmail, IsString, MinLength } from 'class-validator';

/** Request body for POST /v1/auth/login — OAS §8. */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
