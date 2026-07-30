import { describe, expect, it } from 'vitest';

import { PasswordService } from '../core/security/password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('should hash a password', async () => {
    const password = 'admin';

    const hash = await service.hash(password);

    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('should verify a correct password', async () => {
    const password = 'admin';

    const hash = await service.hash(password);

    const result = await service.verify(
      password,
      hash,
    );

    expect(result).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const password = 'admin';

    const hash = await service.hash(password);

    const result = await service.verify(
      'wrong-password',
      hash,
    );

    expect(result).toBe(false);
  });
});