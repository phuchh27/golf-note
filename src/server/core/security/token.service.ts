import { randomBytes, createHash } from 'node:crypto';

export class TokenService {
  generate(): string {
    return randomBytes(32).toString('hex');
  }

  hash(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }
}