import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import storageService from '../services/storage';

function PlayerStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activeTab, setActiveTab] = useState('stats'); // stats, history, achievements, leaderboard

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setStats(storageService.getPlayerStats());
    setHistory(storageService.getPlayerHistory());
    setAchievements(storageService.getAchievements());
    setLeaderboard(storageService.getPersistentLeaderboard());
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your game history? This cannot be undone.')) {
      storageService.clearPlayerHistory();
      loadData();
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800">📊 Player Stats</h1>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              ← Back to Home
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[
              { id: 'stats', label: 'Statistics', icon: '📈' },
              { id: 'history', label: 'History', icon: '📜' },
              { id: 'achievements', label: 'Achievements', icon: '🏆' },
              { id: 'leaderboard', label: 'Leaderboard', icon: '👑' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-6 rounded-xl text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.totalGames}</div>
                  <div className="text-gray-600 mt-2">Total Games</div>
                </div>
                <div className="bg-green-50 p-6 rounded-xl text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.totalWins}</div>
                  <div className="text-gray-600 mt-2">Wins</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.averageScore}</div>
                  <div className="text-gray-600 mt-2">Avg Score</div>
                </div>
                <div className="bg-pink-50 p-6 rounded-xl text-center">
                  <div className="text-3xl font-bold text-pink-600">{stats.winRate}%</div>
                  <div className="text-gray-600 mt-2">Win Rate</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-xl">
                  <div className="text-xl font-semibold text-gray-800 mb-4">Preferences</div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Favorite Mode:</span>
                      <span className="font-semibold text-gray-800">{stats.favoriteMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Favorite Genre:</span>
                      <span className="font-semibold text-gray-800">{stats.favoriteGenre}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Rank:</span>
                      <span className="font-semibold text-gray-800">#{stats.averageRank}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <div className="text-xl font-semibold text-gray-800 mb-4">Totals</div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Score:</span>
                      <span className="font-semibold text-gray-800">{stats.totalScore}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Games Played:</span>
                      <span className="font-semibold text-gray-800">{stats.totalGames}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Wins:</span>
                      <span className="font-semibold text-gray-800">{stats.totalWins}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Game History</h2>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🎮</div>
                  <div className="text-xl">No games played yet!</div>
                  <div className="mt-2">Start playing to see your history here.</div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {history.map((game) => (
                    <div key={game.id} className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {game.rank === 1 && '🏆 '}
                            {game.teamName}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Score: {game.score} | Rank: #{game.rank}/{game.totalTeams}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {game.gameMode} • {game.genre} • {formatDate(game.timestamp)}
                          </div>
                        </div>
                        <div className={`text-2xl ${game.rank === 1 ? 'text-yellow-500' : game.rank === 2 ? 'text-gray-400' : game.rank === 3 ? 'text-orange-600' : 'text-gray-300'}`}>
                          {game.rank === 1 ? '🥇' : game.rank === 2 ? '🥈' : game.rank === 3 ? '🥉' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && achievements && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Achievements</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(achievements).map(([key, achievement]) => (
                  <div
                    key={key}
                    className={`p-6 rounded-xl transition ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-400'
                        : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-800">{achievement.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{achievement.description}</div>
                        {achievement.unlocked && (
                          <div className="text-xs text-green-600 mt-2 font-semibold">✓ Unlocked</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">All-Time Leaderboard</h2>
              {leaderboard.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">👑</div>
                  <div className="text-xl">No scores yet!</div>
                  <div className="mt-2">Complete some games to see the leaderboard.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 20).map((entry, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg flex justify-between items-center ${
                        index === 0
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200'
                          : index === 1
                          ? 'bg-gradient-to-r from-gray-100 to-gray-200'
                          : index === 2
                          ? 'bg-gradient-to-r from-orange-100 to-orange-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-bold text-gray-700 w-8">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{entry.teamName}</div>
                          <div className="text-xs text-gray-600">
                            {entry.gameMode} • {entry.genre} • {entry.gamesPlayed} games
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">{entry.highScore}</div>
                        <div className="text-xs text-gray-500">High Score</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlayerStats;
