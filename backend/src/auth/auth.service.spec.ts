import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { AuthService } from './auth.service';

const player = { id: 'p1', username: 'alice', email: 'alice@example.com', cash: 1000, energy: 10, power: 0, smartness: 0 };
const VALID_SECRET = '12345678901234567890123456789012';

describe('AuthService', () => {
  test('11. password hashing during registration', async () => {
    let storedHash = '';
    const players = {
      create: async (input: { passwordHash: string }) => { storedHash = input.passwordHash; return player; },
      findCredentials: async () => null,
    };
    const auth = new AuthService(players as never, VALID_SECRET);
    const result = await auth.register({ username: 'alice', email: 'alice@example.com', password: 'password123' });
    assert.match(storedHash, /^scrypt\$/);
    assert.equal(result.player.id, 'p1');
  });

  test('12. password verification and token creation', async () => {
    let storedHash = '';
    const playersToHash = {
      create: async (input: { passwordHash: string }) => { 
        storedHash = input.passwordHash;
        return player;
      },
      findCredentials: async () => null,
    } as any;
    const tempAuth = new AuthService(playersToHash, VALID_SECRET);
    await tempAuth.register({ username: 'alice', email: 'alice@example.com', password: 'password123' });
    
    // Now simulate login
    let loginCalled = false;
    const playersToLogin = {
      findCredentials: async () => {
        loginCalled = true;
        return { player, passwordHash: storedHash };
      }
    };
    const auth = new AuthService(playersToLogin as never, VALID_SECRET);
    const result = await auth.login({ login: 'alice', password: 'password123' });
    assert.ok(loginCalled);
    assert.equal(result.player.id, 'p1');
    assert.equal(auth.verifyToken(result.accessToken), 'p1');
  });

  test('13. invalid password', async () => {
    const players = {
      findCredentials: async () => ({ player, passwordHash: 'scrypt$bad$00' }),
    };
    const auth = new AuthService(players as never, VALID_SECRET);
    await assert.rejects(() => auth.login({ login: 'alice', password: 'wrongpass' }), /Invalid credentials/);
  });

  test('14. invalid token signature', () => {
    const auth1 = new AuthService({} as never, VALID_SECRET);
    const auth2 = new AuthService({} as never, 'different-secret-different-secret-32');
    
    // Create token with auth1, verify with auth2
    const tempAuth = new AuthService({
      create: async (i: any) => player,
      findCredentials: async () => null,
    } as any, VALID_SECRET);
    // Let's manually create a token by mocking register
    
    // We can't access createToken directly, so let's extract it from register
  });
  
  test('14, 15, 16. invalid, expired, and malformed tokens', async () => {
    let mockTime = 100000;
    const auth = new AuthService({
      create: async (i: any) => player,
      findCredentials: async () => null,
    } as never, VALID_SECRET, () => mockTime);

    const reg = await auth.register({ username: 'bob', email: 'bob@example.com', password: 'password123' });
    const token = reg.accessToken;
    
    // valid verification
    assert.equal(auth.verifyToken(token), 'p1');
    
    // 16. malformed token
    assert.throws(() => auth.verifyToken('not-a-token'), /Invalid access token/);
    assert.throws(() => auth.verifyToken(token + '.extra'), /Invalid access token/);
    
    // 14. invalid signature
    const [payload, sig] = token.split('.');
    assert.throws(() => auth.verifyToken(`${payload}.badsignature123`), /Invalid access token/);
    
    // 15. expired token
    mockTime += 60 * 60 * 24 * 7 + 10; // advance time by 7 days and 10 seconds
    assert.throws(() => auth.verifyToken(token), /Access token expired/);
  });
  
  test('rejects short secret keys', () => {
    assert.throws(() => new AuthService({} as never, 'short'), /32 characters/);
  });
});
