import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '../../common/filters/api-error';

/**
 * Parses the numeric post id out of an x.com/twitter.com status URL.
 * Rejects anything that isn't recognizably a post URL rather than
 * guessing — OAS §5's 400 VALIDATION_ERROR case.
 */
export function parseXPostId(postUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(postUrl);
  } catch {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'postUrl must be a valid URL.',
    });
  }

  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'x.com' && host !== 'twitter.com') {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'postUrl must be an x.com or twitter.com post URL.',
    });
  }

  // /<username>/status/<id>
  const match = parsed.pathname.match(/\/status\/(\d+)/);
  if (!match) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'postUrl must be a supported X post URL (missing /status/{id}).',
    });
  }

  return match[1];
}
