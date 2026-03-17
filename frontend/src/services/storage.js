// Local Storage Service for Player History, Leaderboards, and Rewards

// ==================== REWARDS SYSTEM CONSTANTS ====================
export const REWARDS_TIERS = [
  { id: 'player',  name: 'Player',   minPoints: 0,   icon: '🎯', color: 'text-gray-400',   bg: 'bg-gray-100' },
  { id: 'regular', name: 'Regular',  minPoints: 100, icon: '🌟', color: 'text-blue-500',   bg: 'bg-blue-50' },
  { id: 'vip',     name: 'VIP',      minPoints: 300, icon: '💎', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'legend',  name: 'Legend',   minPoints: 700, icon: '👑', color: 'text-yellow-500', bg: 'bg-yellow-50' },
];

export const REWARDS_CATALOG = [
  { id: 'free_pool',    name: 'Free Pool Game',          cost: 75,  icon: '🎱', description: 'One free game of pool at Putters — any table, any time', category: 'activity' },
  { id: 'free_beer',    name: 'Free Draft Beer',         cost: 100, icon: '🍺', description: 'One complimentary draft beer (21+ only)', category: 'drink' },
  { id: 'discount_15',  name: '15% Off Food Order',      cost: 150, icon: '🏷️', description: '15% off your food order at Putters', category: 'discount' },
  { id: 'free_cocktail',name: 'Free Cocktail',           cost: 250, icon: '🍹', description: 'One complimentary cocktail (21+ only)', category: 'drink' },
  { id: 'vip_table',    name: 'VIP Pool Table 2 Hours',  cost: 400, icon: '🎱', description: 'Reserved pool table for 2 hours — bring your crew', category: 'experience' },
  { id: 'vip_night',    name: 'VIP Night Package',       cost: 600, icon: '🎉', description: 'VIP experience for up to 4 people — drinks & pool included', category: 'experience' },
];

export const POINTS_EVENTS = {
  WELCOME:        { points: 20,  label: 'Welcome bonus! 🎉' },
  GAME_PLAYED:    { points: 10,  label: 'Played a game' },
  TOP_THREE:      { points: 25,  label: 'Finished top 3! 🥉' },
  GAME_WIN:       { points: 50,  label: 'Won a game! 🏆' },
  PERFECT_NIGHT:  { points: 30,  label: 'Played 5+ games tonight 🔥' },
  PICTIONARY_WIN: { points: 60,  label: 'Won Pictionary! 🎨' },
  APPLES_WIN:     { points: 60,  label: 'Won Apples to Apples! 🍎' },
  VEGAS_TRIVIA:   { points: 15,  label: 'Vegas trivia bonus 🎰' },
};

export function getTier(points) {
  return [...REWARDS_TIERS].reverse().find(t => points >= t.minPoints) || REWARDS_TIERS[0];
}

export function getNextTier(points) {
  return REWARDS_TIERS.find(t => t.minPoints > points) || null;
}

class StorageService {
  constructor() {
    this.PLAYER_HISTORY_KEY = 'trivia_player_history';
    this.PERSISTENT_LEADERBOARD_KEY = 'trivia_persistent_leaderboard';
    this.ACHIEVEMENTS_KEY = 'trivia_achievements';
    this.ACTIVE_PROFILE_KEY = 'putters_active_phone';
    this.PROFILE_PREFIX = 'putters_profile_';
  }

  // ==================== PHONE PROFILE MANAGEMENT ====================

  // Normalize phone: keep digits only, store as E.164-ish without leading 1 for US
  normalizePhone(raw) {
    const digits = raw.replace(/\D/g, '');
    // Accept 10-digit US numbers (strip leading 1 from 11-digit)
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
  }

  formatPhoneDisplay(phone) {
    const d = phone.replace(/\D/g, '');
    if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
    return phone;
  }

  maskedPhone(phone) {
    const d = phone.replace(/\D/g, '');
    if (d.length === 10) return `(***) ***-${d.slice(6)}`;
    return '***-' + d.slice(-4);
  }

  getProfileKey(phone) {
    return this.PROFILE_PREFIX + this.normalizePhone(phone);
  }

  getActivePhone() {
    return localStorage.getItem(this.ACTIVE_PROFILE_KEY) || null;
  }

  getActiveProfile() {
    const phone = this.getActivePhone();
    if (!phone) return null;
    return this.getProfile(phone);
  }

  getProfile(phone) {
    try {
      const normalized = this.normalizePhone(phone);
      const raw = localStorage.getItem(this.PROFILE_PREFIX + normalized);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  createProfile(phone, displayName) {
    const normalized = this.normalizePhone(phone);
    const existing = this.getProfile(normalized);
    if (existing) {
      // Update display name if changed
      if (displayName && displayName.trim() && displayName !== existing.displayName) {
        existing.displayName = displayName.trim();
        this._saveProfile(normalized, existing);
      }
      localStorage.setItem(this.ACTIVE_PROFILE_KEY, normalized);
      return existing;
    }

    const profile = {
      phone: normalized,
      displayName: displayName.trim() || `Player ${normalized.slice(-4)}`,
      points: 0,
      totalPointsEarned: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      pointsHistory: [],
      redemptions: [],
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    this._saveProfile(normalized, profile);
    localStorage.setItem(this.ACTIVE_PROFILE_KEY, normalized);

    // Award welcome bonus
    this.awardPoints(normalized, 'WELCOME');

    return this.getProfile(normalized);
  }

  _saveProfile(normalizedPhone, profile) {
    try {
      profile.lastSeen = new Date().toISOString();
      localStorage.setItem(this.PROFILE_PREFIX + normalizedPhone, JSON.stringify(profile));
    } catch (e) {
      console.error('Error saving profile:', e);
    }
  }

  logout() {
    localStorage.removeItem(this.ACTIVE_PROFILE_KEY);
  }

  // ==================== REWARDS / POINTS ====================

  awardPoints(phone, eventKey, override = null) {
    const normalized = this.normalizePhone(phone);
    const profile = this.getProfile(normalized);
    if (!profile) return null;

    const event = POINTS_EVENTS[eventKey];
    if (!event) return null;

    const pts = override?.points ?? event.points;
    const label = override?.label ?? event.label;

    profile.points += pts;
    profile.totalPointsEarned += pts;
    profile.pointsHistory.unshift({
      id: Date.now(),
      points: pts,
      label,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 history entries
    profile.pointsHistory = profile.pointsHistory.slice(0, 100);

    this._saveProfile(normalized, profile);
    return { points: pts, newTotal: profile.points, label };
  }

  redeemReward(phone, rewardId) {
    const normalized = this.normalizePhone(phone);
    const profile = this.getProfile(normalized);
    if (!profile) return { success: false, error: 'Profile not found' };

    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) return { success: false, error: 'Reward not found' };
    if (profile.points < reward.cost) return { success: false, error: 'Not enough points' };

    profile.points -= reward.cost;

    const redemption = {
      id: Date.now(),
      rewardId: reward.id,
      rewardName: reward.name,
      cost: reward.cost,
      redemptionCode: this._generateCode(),
      timestamp: new Date().toISOString(),
      used: false,
    };

    profile.redemptions.unshift(redemption);
    profile.redemptions = profile.redemptions.slice(0, 50);

    // Log in points history as negative
    profile.pointsHistory.unshift({
      id: Date.now() + 1,
      points: -reward.cost,
      label: `Redeemed: ${reward.name} ${reward.icon}`,
      timestamp: new Date().toISOString(),
    });
    profile.pointsHistory = profile.pointsHistory.slice(0, 100);

    this._saveProfile(normalized, profile);
    return { success: true, redemption, newTotal: profile.points };
  }

  _generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PUT-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  // Award points for a completed game - call after game ends
  awardGamePoints(phone, { rank, totalTeams, score, gameMode, genre }) {
    if (!phone) return;
    const normalized = this.normalizePhone(phone);
    const profile = this.getProfile(normalized);
    if (!profile) return;

    profile.gamesPlayed = (profile.gamesPlayed || 0) + 1;
    if (rank === 1) profile.gamesWon = (profile.gamesWon || 0) + 1;
    this._saveProfile(normalized, profile);

    const awarded = [];

    // Always: played a game
    awarded.push(this.awardPoints(normalized, 'GAME_PLAYED'));

    // Rank bonuses
    if (rank === 1) {
      if (gameMode === 'pictionary') {
        awarded.push(this.awardPoints(normalized, 'PICTIONARY_WIN'));
      } else if (gameMode === 'apples-to-apples') {
        awarded.push(this.awardPoints(normalized, 'APPLES_WIN'));
      } else {
        awarded.push(this.awardPoints(normalized, 'GAME_WIN'));
      }
    } else if (rank <= 3 && totalTeams >= 3) {
      awarded.push(this.awardPoints(normalized, 'TOP_THREE'));
    }

    // Vegas trivia bonus
    if (genre === 'las-vegas') {
      awarded.push(this.awardPoints(normalized, 'VEGAS_TRIVIA'));
    }

    // Check "5 games tonight" bonus
    const today = new Date().toDateString();
    const history = this.getPlayerHistory();
    const todayGames = history.filter(g => new Date(g.timestamp).toDateString() === today);
    if (todayGames.length === 5) {
      awarded.push(this.awardPoints(normalized, 'PERFECT_NIGHT'));
    }

    return awarded.filter(Boolean);
  }

  // Player History Management
  getPlayerHistory() {
    try {
      const history = localStorage.getItem(this.PLAYER_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error reading player history:', error);
      return [];
    }
  }

  addGameToHistory(gameData) {
    try {
      const history = this.getPlayerHistory();
      const newGame = {
        id: Date.now(),
        teamName: gameData.teamName,
        score: gameData.score,
        rank: gameData.rank,
        totalTeams: gameData.totalTeams,
        questionsAnswered: gameData.questionsAnswered,
        gameMode: gameData.gameMode,
        genre: gameData.genre,
        timestamp: new Date().toISOString()
      };
      
      history.unshift(newGame); // Add to beginning
      
      // Keep only last 50 games
      const trimmedHistory = history.slice(0, 50);
      
      localStorage.setItem(this.PLAYER_HISTORY_KEY, JSON.stringify(trimmedHistory));
      
      // Update achievements
      this.updateAchievements(newGame);
      
      return newGame;
    } catch (error) {
      console.error('Error adding game to history:', error);
      return null;
    }
  }

  clearPlayerHistory() {
    try {
      localStorage.removeItem(this.PLAYER_HISTORY_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing player history:', error);
      return false;
    }
  }

  // Persistent Leaderboard Management
  getPersistentLeaderboard() {
    try {
      const leaderboard = localStorage.getItem(this.PERSISTENT_LEADERBOARD_KEY);
      return leaderboard ? JSON.parse(leaderboard) : [];
    } catch (error) {
      console.error('Error reading persistent leaderboard:', error);
      return [];
    }
  }

  updatePersistentLeaderboard(teamName, score, gameMode, genre) {
    try {
      const leaderboard = this.getPersistentLeaderboard();
      
      // Find existing entry for this team
      const existingIndex = leaderboard.findIndex(
        entry => entry.teamName === teamName && entry.gameMode === gameMode && entry.genre === genre
      );
      
      if (existingIndex >= 0) {
        // Update if score is higher
        if (score > leaderboard[existingIndex].highScore) {
          leaderboard[existingIndex].highScore = score;
          leaderboard[existingIndex].gamesPlayed += 1;
          leaderboard[existingIndex].lastPlayed = new Date().toISOString();
        } else {
          leaderboard[existingIndex].gamesPlayed += 1;
        }
      } else {
        // Add new entry
        leaderboard.push({
          teamName,
          highScore: score,
          gameMode,
          genre,
          gamesPlayed: 1,
          lastPlayed: new Date().toISOString()
        });
      }
      
      // Sort by high score
      leaderboard.sort((a, b) => b.highScore - a.highScore);
      
      // Keep top 100
      const trimmedLeaderboard = leaderboard.slice(0, 100);
      
      localStorage.setItem(this.PERSISTENT_LEADERBOARD_KEY, JSON.stringify(trimmedLeaderboard));
      
      return trimmedLeaderboard;
    } catch (error) {
      console.error('Error updating persistent leaderboard:', error);
      return null;
    }
  }

  // Achievements Management
  getAchievements() {
    try {
      const achievements = localStorage.getItem(this.ACHIEVEMENTS_KEY);
      return achievements ? JSON.parse(achievements) : this.getDefaultAchievements();
    } catch (error) {
      console.error('Error reading achievements:', error);
      return this.getDefaultAchievements();
    }
  }

  getDefaultAchievements() {
    return {
      firstWin: { unlocked: false, name: 'First Victory', description: 'Win your first game', icon: '🏆' },
      speedDemon: { unlocked: false, name: 'Speed Demon', description: 'Complete a speed round', icon: '⚡' },
      triviaMaster: { unlocked: false, name: 'Trivia Master', description: 'Play 10 games', icon: '🎓' },
      perfectScore: { unlocked: false, name: 'Perfect Score', description: 'Get all questions correct', icon: '💯' },
      socialButterfly: { unlocked: false, name: 'Social Butterfly', description: 'Play with 5+ teams', icon: '🦋' },
      nightOwl: { unlocked: false, name: 'Night Owl', description: 'Play after midnight', icon: '🦉' },
      categoryExpert: { unlocked: false, name: 'Category Expert', description: 'Win in every category', icon: '🌟' }
    };
  }

  updateAchievements(gameData) {
    try {
      const achievements = this.getAchievements();
      let updated = false;

      // First Win
      if (gameData.rank === 1 && !achievements.firstWin.unlocked) {
        achievements.firstWin.unlocked = true;
        updated = true;
      }

      // Speed Demon - unlock for speed-round or lightning mode
      if ((gameData.gameMode === 'speed-round' || gameData.gameMode === 'lightning') && !achievements.speedDemon.unlocked) {
        achievements.speedDemon.unlocked = true;
        updated = true;
      }

      // Trivia Master
      const history = this.getPlayerHistory();
      if (history.length >= 10 && !achievements.triviaMaster.unlocked) {
        achievements.triviaMaster.unlocked = true;
        updated = true;
      }

      // Social Butterfly
      if (gameData.totalTeams >= 5 && !achievements.socialButterfly.unlocked) {
        achievements.socialButterfly.unlocked = true;
        updated = true;
      }

      // Night Owl
      const hour = new Date().getHours();
      if (hour >= 0 && hour < 6 && !achievements.nightOwl.unlocked) {
        achievements.nightOwl.unlocked = true;
        updated = true;
      }

      if (updated) {
        localStorage.setItem(this.ACHIEVEMENTS_KEY, JSON.stringify(achievements));
      }

      return achievements;
    } catch (error) {
      console.error('Error updating achievements:', error);
      return null;
    }
  }

  // Statistics
  getPlayerStats() {
    try {
      const history = this.getPlayerHistory();
      
      if (history.length === 0) {
        return {
          totalGames: 0,
          totalWins: 0,
          totalScore: 0,
          averageScore: 0,
          averageRank: 0,
          favoriteMode: 'N/A',
          favoriteGenre: 'N/A'
        };
      }

      const totalGames = history.length;
      const totalWins = history.filter(game => game.rank === 1).length;
      const totalScore = history.reduce((sum, game) => sum + game.score, 0);
      const averageScore = Math.round(totalScore / totalGames);
      const averageRank = (history.reduce((sum, game) => sum + game.rank, 0) / totalGames).toFixed(1);

      // Find favorite mode and genre
      const modes = history.map(g => g.gameMode).filter(Boolean);
      const genres = history.map(g => g.genre).filter(Boolean);
      
      const favoriteMode = this.getMostFrequent(modes) || 'N/A';
      const favoriteGenre = this.getMostFrequent(genres) || 'N/A';

      return {
        totalGames,
        totalWins,
        totalScore,
        averageScore,
        averageRank,
        favoriteMode,
        favoriteGenre,
        winRate: ((totalWins / totalGames) * 100).toFixed(1)
      };
    } catch (error) {
      console.error('Error calculating player stats:', error);
      return null;
    }
  }

  getMostFrequent(arr) {
    if (arr.length === 0) return null;
    
    const counts = {};
    arr.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }
}

export default new StorageService();

