'use server';

import { cookies } from 'next/headers';
import { apiClient, ApiClientError } from '@/lib/api-client';

export interface UserSession {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSession;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResult {
  success: boolean;
  user?: UserSession;
  error?: string;
}

/**
 * Exchanges email + password for a dashboard session per docs/specs/02_API_Specification_OAS.md §8
 * and stores session tokens in httpOnly cookies per docs/specs/04_Authentication_Authorization_Design_AAD.md §4.1.
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const data = await apiClient<LoginResponse>('auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Store accessToken in httpOnly cookie
    cookieStore.set('ci_access_token', data.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: data.expiresIn,
    });

    // Store refreshToken in httpOnly cookie (30-day TTL per AAD §4.1)
    cookieStore.set('ci_refresh_token', data.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return {
      success: true,
      user: data.user,
    };
  } catch (error: unknown) {
    if (error instanceof ApiClientError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred.',
    };
  }
}
