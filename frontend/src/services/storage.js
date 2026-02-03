// Local Storage Service for Player History and Leaderboards

class StorageService {
  constructor() {
    this.PLAYER_HISTORY_KEY = 'trivia_player_history';
    this.PERSISTENT_LEADERBOARD_KEY = 'trivia_persistent_leaderboard';
    this.ACHIEVEMENTS_KEY = 'trivia_achievements';
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

      // Speed Demon
      if (gameData.gameMode === 'speed-round' && !achievements.speedDemon.unlocked) {
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
