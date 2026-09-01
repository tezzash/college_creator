import { Player, Job, ActiveJob, TowerRoom, Ally, RivalPlayer, BattleResult, BattleLogItem } from './types';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('college_geeks_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('college_geeks_token', token);
    } else {
      localStorage.removeItem('college_geeks_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(path, {
      ...options,
      headers,
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText };
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  async register(username: string, email: string, password: string): Promise<{ player: Player; accessToken: string }> {
    const res = await this.request<{ player: Player; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async login(login: string, password: string): Promise<{ player: Player; accessToken: string }> {
    const res = await this.request<{ player: Player; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    this.setToken(res.accessToken);
    return res;
  }

  async me(): Promise<{ player: Player }> {
    return this.request<{ player: Player }>('/me');
  }

  async players(query = ''): Promise<{ players: RivalPlayer[] }> {
    return this.request<{ players: RivalPlayer[] }>(`/players?includeBots=true&q=${encodeURIComponent(query)}`);
  }

  async jobs(): Promise<{ jobs: Job[] }> {
    return this.request<{ jobs: Job[] }>('/jobs');
  }

  async activeJob(): Promise<{ activeJob: ActiveJob | null }> {
    return this.request<{ activeJob: ActiveJob | null }>('/jobs/active');
  }

  async startJob(jobId: string): Promise<{ activeJob: ActiveJob }> {
    return this.request<{ activeJob: ActiveJob }>(`/jobs/${encodeURIComponent(jobId)}/start`, {
      method: 'POST',
    });
  }

  async collectJob(activeJobId: string): Promise<{ activeJob: ActiveJob; rewardCash: number; player: Player }> {
    return this.request<{ activeJob: ActiveJob; rewardCash: number; player: Player }>(
      `/jobs/active/${encodeURIComponent(activeJobId)}/collect`,
      { method: 'POST' }
    );
  }

  async cancelJob(activeJobId?: string): Promise<{ success: boolean; message: string }> {
    if (activeJobId) {
      return this.request<{ success: boolean; message: string }>(
        `/jobs/active/${encodeURIComponent(activeJobId)}/cancel`,
        { method: 'POST' }
      );
    }
    return this.request<{ success: boolean; message: string }>('/jobs/reset', {
      method: 'POST',
    });
  }

  async resetJob(): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/jobs/reset', {
      method: 'POST',
    });
  }

  async tower(): Promise<{ rooms: TowerRoom[] }> {
    return this.request<{ rooms: TowerRoom[] }>('/tower');
  }

  async unlockTowerRoom(roomNumber: number): Promise<{ room: TowerRoom }> {
    return this.request<{ room: TowerRoom }>('/tower/unlock', {
      method: 'POST',
      body: JSON.stringify({ roomNumber }),
    });
  }

  async allies(): Promise<{ allies: Ally[] }> {
    return this.request<{ allies: Ally[] }>('/allies');
  }

  async hireAlly(allyId: string, towerRoomId: string): Promise<{ occupant: any; player: Player; ally: Ally }> {
    return this.request<{ occupant: any; player: Player; ally: Ally }>('/allies/hire', {
      method: 'POST',
      body: JSON.stringify({ allyId, towerRoomId }),
    });
  }

  async upgradeAlly(towerRoomId: string): Promise<{ occupant: any; player: Player; ally: Ally; previousLevel: number; newLevel: number; costPaid: number }> {
    return this.request<{ occupant: any; player: Player; ally: Ally; previousLevel: number; newLevel: number; costPaid: number }>('/allies/upgrade', {
      method: 'POST',
      body: JSON.stringify({ towerRoomId }),
    });
  }

  async evictAlly(towerRoomId: string): Promise<{ refundAmount: number; player: Player; roomNumber: number; allyName: string }> {
    return this.request<{ refundAmount: number; player: Player; roomNumber: number; allyName: string }>('/allies/evict', {
      method: 'POST',
      body: JSON.stringify({ towerRoomId }),
    });
  }

  async battle(defenderId: string, action: 'fight' | 'prank' | 'spy' | 'punch' | 'face_off' | 'face-off'): Promise<BattleResult> {
    return this.request<BattleResult>('/battles', {
      method: 'POST',
      body: JSON.stringify({ defenderId, action }),
    });
  }

  async battleFeed(): Promise<{ feed: BattleLogItem[] }> {
    return this.request<{ feed: BattleLogItem[] }>('/battles/feed');
  }

  // --- Campus ATM & Bank Vault ---
  async depositBank(amount: number): Promise<{ player: Player; depositedNet: number; fee: number }> {
    return this.request<{ player: Player; depositedNet: number; fee: number }>('/bank/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdrawBank(amount: number): Promise<{ player: Player; withdrawn: number }> {
    return this.request<{ player: Player; withdrawn: number }>('/bank/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // --- Scouting & Threat Intelligence ---
  async scoutPlayer(defenderId: string): Promise<{ report: import('./types').ScoutReport }> {
    return this.request<{ report: import('./types').ScoutReport }>(`/pvp/scout/${encodeURIComponent(defenderId)}`);
  }

  // --- Campus Leaderboards ---
  async leaderboards(): Promise<import('./types').LeaderboardsData> {
    return this.request<import('./types').LeaderboardsData>('/leaderboards');
  }

  // --- Dorm Room Customization & Furniture ---
  async dormFurniture(): Promise<{ catalog: import('./types').DormFurnitureItem[] }> {
    return this.request<{ catalog: import('./types').DormFurnitureItem[] }>('/dorm/furniture');
  }

  async buyDormFurniture(furnitureId: string): Promise<{ furniture: import('./types').DormFurnitureItem; player: Player }> {
    return this.request<{ furniture: import('./types').DormFurnitureItem; player: Player }>('/dorm/furniture/buy', {
      method: 'POST',
      body: JSON.stringify({ furnitureId }),
    });
  }

  // --- Student Profile & Campus Wardrobe Studio ---
  async getProfile(): Promise<{ player: Player; availableTitles: Array<{ id: string; title: string; unlocked: boolean; requirement: string }>; unlockedTitles: string[] }> {
    return this.request<{ player: Player; availableTitles: Array<{ id: string; title: string; unlocked: boolean; requirement: string }>; unlockedTitles: string[] }>('/player/profile');
  }

  async updateProfile(updates: {
    equippedTitle?: string;
    avatarId?: string;
    avatarAura?: string;
    avatarFrame?: string;
    avatarOutfit?: string;
    avatarHeadwear?: string;
    avatarAccessory?: string;
    customBio?: string;
  }): Promise<{ player: Player }> {
    return this.request<{ player: Player }>('/player/profile', {
      method: 'POST',
      body: JSON.stringify(updates),
    });
  }

  async buyCosmetic(cosmeticId: string, cost: number): Promise<{ player: Player; cosmeticId: string }> {
    return this.request<{ player: Player; cosmeticId: string }>('/player/profile/buy-cosmetic', {
      method: 'POST',
      body: JSON.stringify({ cosmeticId, cost }),
    });
  }

  async claimCosmeticFeat(cosmeticId: string): Promise<{ player: Player; cosmeticId: string }> {
    return this.request<{ player: Player; cosmeticId: string }>('/player/profile/claim-cosmetic', {
      method: 'POST',
      body: JSON.stringify({ cosmeticId }),
    });
  }

  async inspectPlayer(playerId: string): Promise<{ player: Player }> {
    return this.request<{ player: Player }>(`/player/inspect/${playerId}`);
  }

  // --- Daily Quests & Streaks ---
  async getDailyQuests(): Promise<import('./types').DailyPlannerData> {
    return this.request<import('./types').DailyPlannerData>('/player/quests');
  }

  async claimDailyQuest(questId: string): Promise<{ quest: import('./types').DailyQuest; player: Player; dailyData: import('./types').DailyPlannerData }> {
    return this.request<{ quest: import('./types').DailyQuest; player: Player; dailyData: import('./types').DailyPlannerData }>('/player/quests/claim', {
      method: 'POST',
      body: JSON.stringify({ questId }),
    });
  }

  async claimDailyBonus(): Promise<{ player: Player; dailyData: import('./types').DailyPlannerData }> {
    return this.request<{ player: Player; dailyData: import('./types').DailyPlannerData }>('/player/quests/bonus', {
      method: 'POST',
    });
  }

  // --- Trophies & Achievement Milestones ---
  async getTrophies(): Promise<import('./types').TrophiesData> {
    return this.request<import('./types').TrophiesData>('/player/trophies');
  }

  async claimMilestone(milestoneId: string): Promise<{ milestone: import('./types').AchievementMilestone; player: Player; trophiesData: import('./types').TrophiesData }> {
    return this.request<{ milestone: import('./types').AchievementMilestone; player: Player; trophiesData: import('./types').TrophiesData }>('/player/trophies/claim', {
      method: 'POST',
      body: JSON.stringify({ milestoneId }),
    });
  }

  // --- Campus Buddies & Friends ---
  async getFriends(): Promise<import('./types').FriendsResponse> {
    return this.request<import('./types').FriendsResponse>('/friends');
  }

  async sendFriendRequest(username: string): Promise<{ message: string; friendshipId: string }> {
    return this.request<{ message: string; friendshipId: string }>('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  async respondFriendRequest(friendshipId: string, accept: boolean): Promise<{ message: string }> {
    return this.request<{ message: string }>('/friends/respond', {
      method: 'POST',
      body: JSON.stringify({ friendshipId, accept }),
    });
  }

  async sendCarePackage(friendshipId: string): Promise<{ message: string; player: Player }> {
    return this.request<{ message: string; player: Player }>('/friends/gift', {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    });
  }

  async removeFriend(friendshipId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/friends/remove', {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    });
  }

  // --- Direct Messaging & Inbox ---
  async getInbox(): Promise<{ conversations: import('./types').ConversationSummary[]; unreadTotal: number }> {
    return this.request<{ conversations: import('./types').ConversationSummary[]; unreadTotal: number }>('/inbox');
  }

  async getConversation(partnerId: string): Promise<{ partner: Player; messages: import('./types').ChatMessage[] }> {
    return this.request<{ partner: Player; messages: import('./types').ChatMessage[] }>(
      `/inbox/conversation/${encodeURIComponent(partnerId)}`
    );
  }

  async sendMessage(receiverId: string, content: string): Promise<{ data: import('./types').ChatMessage; message: string }> {
    return this.request<{ data: import('./types').ChatMessage; message: string }>('/inbox/send', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  }

  async getRealPlayers(): Promise<{ players: Player[] }> {
    return this.request<{ players: Player[] }>('/players/real');
  }

  async battlePlayers(): Promise<{ players: Player[] }> {
    return this.request<{ players: Player[] }>('/players');
  }
}

export const api = new ApiClient();

