import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { AppModule } from './backend/src/app/app.module';
import { createRateLimiter } from './backend/src/middleware/rate-limit';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

async function startServer() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length < 10) {
    process.env.DATABASE_URL = 'postgres://campus-memory-sqlite';
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    process.env.JWT_SECRET = 'college-geeks-secure-jwt-key-auto-generated-production-secret-32chars';
  }

  const app = express();
  app.set('trust proxy', 1);
  const appModule = new AppModule();

  app.use(cors({
    origin: (origin, callback) => {
      const env = appModule.config.environment;
      const allowedOrigins = appModule.config.corsOrigins || [appModule.config.corsOrigin];
      const appUrl = process.env.APP_URL;
      const preUrl = appUrl ? appUrl.replace('ais-dev-', 'ais-pre-') : undefined;

      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        appModule.config.corsOrigin === '*' ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin === appModule.config.corsOrigin
      ) {
        callback(null, true);
        return;
      }

      if (appUrl && (origin === appUrl || origin === preUrl)) {
        callback(null, true);
        return;
      }

      if (
        origin === 'https://aistudio.google.com' ||
        origin === 'https://ai.studio'
      ) {
        callback(null, true);
        return;
      }

      if (process.env.APPLET_ID && origin.includes(process.env.APPLET_ID) && origin.endsWith('.run.app')) {
        callback(null, true);
        return;
      }

      if (env === 'development' || env === 'test') {
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
          return;
        }
        if (env === 'development' && (origin.endsWith('.run.app') || origin.endsWith('.aistudio.google.com'))) {
          callback(null, true);
          return;
        }
      }

      callback(new Error('Not allowed by CORS'));
    }
  }));
  app.use(express.json({ limit: '100kb' }));

  const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many authentication attempts' });
  const actionLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60, message: 'Too many actions, slow down' });
  const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120, message: 'Too many requests' });

  // Apply rate limiters
  app.use('/auth', authLimiter);
  app.use('/battles', actionLimiter);
  app.use('/jobs', actionLimiter);
  app.use('/friends/request', actionLimiter);
  app.use('/inbox/send', actionLimiter);
  app.use('/player', generalLimiter);
  app.use('/tower', generalLimiter);
  app.use('/allies', generalLimiter);
  app.use('/bank', generalLimiter);

  // Error Sanitization Middleware
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 400 && body && typeof body.error === 'string') {
        const msg = body.error.toLowerCase();
        if (
          msg.includes('prisma') ||
          msg.includes('sql') ||
          msg.includes('enoent') ||
          msg.includes('postgres://') ||
          msg.includes('scrypt') ||
          msg.includes('jwt_secret')
        ) {
          body.error = 'An internal system error occurred.';
          if (appModule.config.environment !== 'production') {
            console.warn('[Security Sanitizer] Sanitized sensitive error message to client.');
          }
        }
      }
      return originalJson.call(this, body);
    };
    next();
  });

  const sanitizePublicPlayer = (p: any) => {
    if (!p) return p;
    const { email, bankCash, ownedCosmetics, claimedMilestones, ...publicData } = p;
    return publicData;
  };

  // Helper to extract player ID from Authorization header
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
      }
      const token = header.slice(7).trim();
      const playerId = appModule.authService.verifyToken(token);
      (req as any).playerId = playerId;
      next();
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Authentication required.' });
    }
  };

  // --- API Routes ---
  app.get(['/health', '/api/health'], (_req, res) => {
    res.json(appModule.healthService.check());
  });

  app.post('/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        res.status(400).json({ error: 'username, email, and password are required.' });
        return;
      }
      const result = await appModule.authService.register({ username, email, password });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed.' });
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      const { login, password } = req.body;
      if (!login || !password) {
        res.status(400).json({ error: 'login and password are required.' });
        return;
      }
      const result = await appModule.authService.login({ login, password });
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed.' });
    }
  });

  app.get('/me', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const player = await appModule.databasePlayerService.get(playerId);
      res.json({ player });
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Player not found.' });
    }
  });

  app.get('/players', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const query = (req.query.q as string) || '';
      const includeBots = req.query.includeBots === 'true' || req.query.pvp === 'true';
      const players = includeBots
        ? await appModule.databasePlayerService.searchPvPOpponents(query, playerId)
        : await appModule.databasePlayerService.search(query, playerId);
      res.json({ players: players.map(sanitizePublicPlayer) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to list players.' });
    }
  });

  app.get('/jobs', requireAuth, async (_req, res) => {
    try {
      const jobs = await appModule.databaseJobsService.listJobs();
      res.json({ jobs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list jobs.' });
    }
  });

  app.get('/jobs/active', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const activeJob = await appModule.databaseJobsService.getActive(playerId);
      res.json({ activeJob });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get active job.' });
    }
  });

  app.post('/jobs/:id/start', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const jobId = req.params.id;
      const activeJob = await appModule.databaseJobsService.start(playerId, jobId);
      res.status(201).json({ activeJob });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to start job.' });
    }
  });

  app.post('/jobs/active/:id/collect', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const activeJobId = req.params.id;
      const result = await appModule.databaseJobsService.collect(playerId, activeJobId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to collect job reward.' });
    }
  });

  app.post('/jobs/active/:id/cancel', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const activeJobId = req.params.id;
      const result = await appModule.databaseJobsService.cancel(playerId, activeJobId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to cancel job.' });
    }
  });

  app.post('/jobs/reset', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const result = await appModule.databaseJobsService.cancel(playerId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to reset active job.' });
    }
  });

  app.get('/tower', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const rooms = await appModule.databaseTowerService.list(playerId);
      res.json({ rooms });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list tower rooms.' });
    }
  });

  app.post('/tower/unlock', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { roomNumber } = req.body;
      if (typeof roomNumber !== 'number') {
        res.status(400).json({ error: 'roomNumber is required.' });
        return;
      }
      const room = await appModule.databaseTowerService.unlock(playerId, { roomNumber });
      res.status(201).json({ room });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to unlock room.' });
    }
  });

  app.get('/allies', requireAuth, async (_req, res) => {
    try {
      const allies = await appModule.databaseAlliesService.listAllies();
      res.json({ allies });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list allies.' });
    }
  });

  app.post('/allies/hire', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { allyId, towerRoomId } = req.body;
      if (!allyId || !towerRoomId) {
        res.status(400).json({ error: 'allyId and towerRoomId are required.' });
        return;
      }
      const result = await appModule.databaseAlliesService.hire(playerId, allyId, towerRoomId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to hire ally.' });
    }
  });

  app.post('/allies/upgrade', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { towerRoomId } = req.body;
      if (!towerRoomId) {
        res.status(400).json({ error: 'towerRoomId is required.' });
        return;
      }
      const result = await appModule.databaseAlliesService.upgrade(playerId, towerRoomId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to upgrade dormmate.' });
    }
  });

  app.post('/allies/evict', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { towerRoomId } = req.body;
      if (!towerRoomId) {
        res.status(400).json({ error: 'towerRoomId is required.' });
        return;
      }
      const result = await appModule.databaseAlliesService.evict(playerId, towerRoomId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to evict dormmate.' });
    }
  });

  app.post('/battles', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { defenderId, action } = req.body;
      const normalizedAction = (action || '').toLowerCase().trim();
      const validActions = ['fight', 'punch', 'prank', 'face_off', 'face-off', 'spy'];
      if (!validActions.includes(normalizedAction)) {
        res.status(400).json({ error: 'action must be fight, prank, or spy.' });
        return;
      }

      let mappedAction: 'fight' | 'prank' | 'spy' = 'fight';
      if (normalizedAction === 'spy') mappedAction = 'spy';
      else if (normalizedAction === 'prank' || normalizedAction === 'face_off' || normalizedAction === 'face-off') mappedAction = 'prank';
      else mappedAction = 'fight';

      const result = await appModule.databaseBattleService.fight(
        playerId,
        defenderId,
        mappedAction,
      );

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Battle failed.' });
    }
  });

  app.get('/battles/feed', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const feed = await appModule.databaseBattleService.getPlayerBattleFeed(playerId);
      res.json({ feed });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch battle feed.' });
    }
  });

  // --- Campus ATM & Bank Vault Routes ---
  app.post('/bank/deposit', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { amount } = req.body;
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Valid positive deposit amount is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.depositBank(playerId, parsedAmount);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Bank deposit failed.' });
    }
  });

  app.post('/bank/withdraw', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { amount } = req.body;
      const parsedAmount = Number(amount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        res.status(400).json({ error: 'Valid positive withdrawal amount is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.withdrawBank(playerId, parsedAmount);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Bank withdrawal failed.' });
    }
  });

  app.get(['/bank/transactions', '/player/transactions'], requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const transactions = await appModule.databasePlayerService.getTransactionHistory(playerId, {
        limit: Number.isFinite(limit) ? limit : 50,
        offset: Number.isFinite(offset) ? offset : 0,
        type,
      });
      res.json({ transactions });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch transaction history.' });
    }
  });

  // --- PvP Scouting & Threat Evaluation Route ---
  app.get('/pvp/scout/:id', requireAuth, async (req, res) => {
    try {
      const attackerId = (req as any).playerId;
      const defenderId = req.params.id;
      const report = await appModule.databaseBattleService.scout(attackerId, defenderId);
      res.json({ report });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Scouting report failed.' });
    }
  });

  // --- Campus Leaderboards Route ---
  app.get('/leaderboards', requireAuth, async (_req, res) => {
    try {
      const leaderboards = await appModule.databaseBattleService.getLeaderboards();
      res.json(leaderboards);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch leaderboards.' });
    }
  });

  // --- Dorm Room Customization & Furniture Catalog Routes ---
  app.get('/dorm/furniture', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const catalog = await appModule.databasePlayerService.getDormFurniture(playerId);
      res.json({ catalog });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dorm furniture catalog.' });
    }
  });

  app.post('/dorm/furniture/buy', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { furnitureId } = req.body;
      if (!furnitureId) {
        res.status(400).json({ error: 'furnitureId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.buyDormFurniture(playerId, furnitureId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to purchase dorm furniture.' });
    }
  });

  // --- Student Profile & Character Closet Routes ---
  app.get('/player/profile', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const player = await appModule.databasePlayerService.get(playerId);
      const trophies = await appModule.databasePlayerService.getMilestonesAndTrophies(playerId);
      res.json({
        player,
        availableTitles: trophies.availableTitles,
        unlockedTitles: trophies.unlockedTitles,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch player profile.' });
    }
  });

  app.post('/player/profile', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { equippedTitle, avatarId, avatarAura, avatarFrame, avatarOutfit, avatarHeadwear, avatarAccessory, customBio } = req.body;
      const updated = await appModule.databasePlayerService.updateProfile(playerId, {
        equippedTitle,
        avatarId,
        avatarAura,
        avatarFrame,
        avatarOutfit,
        avatarHeadwear,
        avatarAccessory,
        customBio,
      });
      res.json({ player: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update profile.' });
    }
  });

  app.post('/player/profile/buy-cosmetic', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { cosmeticId, cost } = req.body;
      if (!cosmeticId || typeof cosmeticId !== 'string') {
        res.status(400).json({ error: 'cosmeticId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.buyCosmetic(playerId, cosmeticId, typeof cost === 'number' ? cost : undefined);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to purchase cosmetic item.' });
    }
  });

  app.post('/player/profile/claim-cosmetic', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { cosmeticId } = req.body;
      if (!cosmeticId) {
        res.status(400).json({ error: 'cosmeticId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.claimCosmeticFeat(playerId, cosmeticId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to claim feat cosmetic.' });
    }
  });

  app.get('/player/inspect/:id', requireAuth, async (req, res) => {
    try {
      const targetId = req.params.id;
      const player = await appModule.databasePlayerService.get(targetId);
      res.json({ player: sanitizePublicPlayer(player) });
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Player not found.' });
    }
  });

  // --- Daily Quests & Streaks Routes ---
  app.get('/player/quests', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const questsData = await appModule.databasePlayerService.getDailyQuests(playerId);
      res.json(questsData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch daily quests.' });
    }
  });

  app.post('/player/quests/claim', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { questId } = req.body;
      if (!questId) {
        res.status(400).json({ error: 'questId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.claimDailyQuest(playerId, questId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to claim daily quest.' });
    }
  });

  app.post('/player/quests/bonus', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const result = await appModule.databasePlayerService.claimDailyBonus(playerId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to claim daily bonus.' });
    }
  });

  // --- Trophies & Milestones Routes ---
  app.get('/player/trophies', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const trophiesData = await appModule.databasePlayerService.getMilestonesAndTrophies(playerId);
      res.json(trophiesData);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch trophies.' });
    }
  });

  app.post('/player/trophies/claim', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { milestoneId } = req.body;
      if (!milestoneId) {
        res.status(400).json({ error: 'milestoneId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.claimMilestone(playerId, milestoneId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to claim trophy milestone.' });
    }
  });

  // --- Campus Buddies & Friends Routes ---
  app.get('/friends', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const data = await appModule.databasePlayerService.getFriends(playerId);
      
      // Sanitize all friend records
      if (data.friends) {
        data.friends = data.friends.map((f: any) => ({
          ...f,
          friend: sanitizePublicPlayer(f.friend)
        }));
      }
      if (data.requests?.incoming) {
        data.requests.incoming = data.requests.incoming.map((r: any) => ({
          ...r,
          sender: sanitizePublicPlayer(r.sender)
        }));
      }
      if (data.requests?.outgoing) {
        data.requests.outgoing = data.requests.outgoing.map((r: any) => ({
          ...r,
          receiver: sanitizePublicPlayer(r.receiver)
        }));
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to retrieve friends.' });
    }
  });

  app.post('/friends/request', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        res.status(400).json({ error: 'Username is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.sendFriendRequest(playerId, username);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send buddy request.' });
    }
  });

  app.post('/friends/respond', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { friendshipId, accept } = req.body;
      if (!friendshipId) {
        res.status(400).json({ error: 'friendshipId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.respondFriendRequest(playerId, friendshipId, Boolean(accept));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to respond to request.' });
    }
  });

  app.post('/friends/gift', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { friendshipId } = req.body;
      if (!friendshipId) {
        res.status(400).json({ error: 'friendshipId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.sendCarePackage(playerId, friendshipId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send care package.' });
    }
  });

  app.post('/friends/remove', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { friendshipId } = req.body;
      if (!friendshipId) {
        res.status(400).json({ error: 'friendshipId is required.' });
        return;
      }
      const result = await appModule.databasePlayerService.removeFriend(playerId, friendshipId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to remove buddy.' });
    }
  });

  // --- Real Classmates & Inbox Routes ---
  app.get('/players/real', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const players = await appModule.databasePlayerService.getRealPlayers(playerId);
      res.json({ players: players.map(sanitizePublicPlayer) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to get students.' });
    }
  });

  app.get('/inbox', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const data = await appModule.databasePlayerService.getInbox(playerId);
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to get inbox.' });
    }
  });

  app.get('/inbox/conversation/:partnerId', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { partnerId } = req.params;
      const data = await appModule.databasePlayerService.getConversation(playerId, partnerId);
      
      if (data.partner) {
        data.partner = sanitizePublicPlayer(data.partner);
      }
      
      res.json(data);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to get conversation.' });
    }
  });

  app.post('/inbox/send', requireAuth, async (req, res) => {
    try {
      const playerId = (req as any).playerId;
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        res.status(400).json({ error: 'receiverId and content are required.' });
        return;
      }
      const result = await appModule.databasePlayerService.sendMessage(playerId, receiverId, content);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send message.' });
    }
  });

  // --- Vite Dev Middleware or Static File Serving ---
  const findDistPath = () => {
    const candidates = [
      path.join(process.cwd(), 'dist'),
      path.join(currentDirname, 'dist'),
      path.join(currentDirname, '..', 'dist'),
      path.join(currentDirname),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'index.html'))) {
        return candidate;
      }
    }
    return path.join(process.cwd(), 'dist');
  };

  const distPath = findDistPath();
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'prod' ||
    appModule.config.environment === 'production' ||
    (typeof currentFilename === 'string' && currentFilename.endsWith('.cjs'));

  if (!isProduction && fs.existsSync(path.join(process.cwd(), 'index.html'))) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          watch: {
            ignored: [
              '**/.campus_*.json',
              '**/backend/**',
              '**/dist/**',
              '**/.git/**',
              '**/firebase-applet-config.json',
            ],
          },
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('Vite dev middleware not available, falling back to static serving.');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Application build assets not found.');
        }
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build assets not found.');
      }
    });
  }

  const nginxPort = process.env.NGINX_PORT ? Number(process.env.NGINX_PORT) : null;
  const envPort = process.env.PORT ? Number(process.env.PORT) : null;
  const defaultPort = Number(process.env.DEFAULT_APP_PORT) || 3000;

  // In AI Studio / Cloud Run multi-container setups, Nginx listens on NGINX_PORT (8080) and
  // proxies external traffic to DEFAULT_APP_PORT (3000). The Node process MUST listen on port 3000
  // and MUST NOT attempt to bind to Nginx's port (8080) to avoid EADDRINUSE collisions.
  // In environments without Nginx (e.g. standalone tests), respect PORT if provided.
  let targetPort = defaultPort;
  if (envPort && Number.isInteger(envPort) && envPort > 0 && envPort <= 65535) {
    if (!nginxPort || envPort !== nginxPort) {
      targetPort = envPort;
    }
  }

  const srv = createHttpServer(app);
  srv.on('error', (err: any) => {
    console.error(`HTTP Server listen error on port ${targetPort}:`, err);
    process.exit(1);
  });

  srv.listen(targetPort, '0.0.0.0', () => {
    console.log(`College Geeks server running on http://0.0.0.0:${targetPort}`);
  });

  const shutdown = () => {
    console.log('Shutdown signal received: closing HTTP server');
    srv.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
