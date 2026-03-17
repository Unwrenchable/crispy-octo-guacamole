import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import storageService, { REWARDS_CATALOG, REWARDS_TIERS, getTier, getNextTier } from '../services/storage';

function RewardsProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('rewards'); // rewards | history | redemptions
  const [redeemMsg, setRedeemMsg] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);

  useEffect(() => {
    const p = storageService.getActiveProfile();
    if (!p) {
      navigate('/login', { state: { returnTo: '/rewards' } });
      return;
    }
    setProfile(p);
  }, [navigate]);

  const refresh = () => {
    const p = storageService.getActiveProfile();
    if (p) setProfile(p);
  };

  const handleRedeem = (reward) => {
    if (!profile || profile.points < reward.cost) return;
    setRedeemingId(reward.id);

    setTimeout(() => {
      const result = storageService.redeemReward(profile.phone, reward.id);
      setRedeemingId(null);
      if (result.success) {
        setRedeemMsg({ type: 'success', reward, redemption: result.redemption });
        refresh();
      } else {
        setRedeemMsg({ type: 'error', message: result.error });
      }
    }, 600);
  };

  const handleLogout = () => {
    storageService.logout();
    navigate('/');
  };

  if (!profile) return null;

  const tier = getTier(profile.points);
  const nextTier = getNextTier(profile.points);
  const pointsToNext = nextTier ? nextTier.minPoints - profile.points : 0;
  const tierProgress = nextTier
    ? Math.round(((profile.points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-green-950 to-black p-4">
      {/* Redemption modal */}
      {redeemMsg && (
        <RedemptionModal
          msg={redeemMsg}
          onClose={() => setRedeemMsg(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => navigate('/')}
            className="text-white/70 hover:text-amber-400 font-semibold flex items-center gap-1 transition"
          >
            ← Back
          </button>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-red-400 text-sm transition"
          >
            Sign Out
          </button>
        </div>

        {/* Profile card */}
        <div className="bg-black/60 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-amber-500/20 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{profile.displayName}</h1>
              <p className="text-white/50 text-sm">{storageService.maskedPhone(profile.phone)}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-black ${tier.color}`}>{tier.icon}</div>
              <div className={`text-sm font-bold ${tier.color}`}>{tier.name}</div>
            </div>
          </div>

          {/* Points balance */}
          <div className="bg-gradient-to-r from-amber-500/20 to-green-800/20 border border-amber-500/40 rounded-2xl p-4 mb-4 text-center">
            <div className="text-5xl font-black text-amber-400">{profile.points}</div>
            <div className="text-white/70 text-sm mt-1">Putters Points</div>
            <div className="text-white/50 text-xs mt-1">{profile.totalPointsEarned || profile.points} total earned · {profile.gamesPlayed || 0} games played</div>
          </div>

          {/* Tier progress */}
          {nextTier ? (
            <div>
              <div className="flex justify-between text-xs text-white/60 mb-1">
                <span>{tier.icon} {tier.name}</span>
                <span>{nextTier.icon} {nextTier.name} in {pointsToNext} PP</span>
              </div>
              <div className="bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-amber-400 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(tierProgress, 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-amber-400 font-bold text-sm">👑 Maximum tier reached! You're a Legend!</span>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Games', value: profile.gamesPlayed || 0, icon: '🎮' },
              { label: 'Wins',  value: profile.gamesWon || 0,   icon: '🏆' },
              { label: 'Earned',value: profile.totalPointsEarned || profile.points, icon: '⭐' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                <div className="text-xl">{s.icon}</div>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'rewards',     label: 'Rewards',     icon: '🎁' },
            { id: 'history',     label: 'Points Log',  icon: '📋' },
            { id: 'redemptions', label: 'My Codes',    icon: '🎟️' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Rewards catalog */}
        {activeTab === 'rewards' && (
          <div className="space-y-3">
            <p className="text-white/50 text-sm text-center mb-2">
              Show your redemption code to Putters staff to claim your perk 🎉
            </p>
            {REWARDS_CATALOG.map(reward => {
              const canAfford = profile.points >= reward.cost;
              const isRedeeming = redeemingId === reward.id;
              return (
                <div
                  key={reward.id}
                  className={`rounded-2xl p-4 border-2 transition-all ${
                    canAfford
                      ? 'bg-white/5 border-amber-500/50 hover:border-amber-500'
                      : 'bg-white/5 border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{reward.icon}</span>
                      <div>
                        <div className="font-bold text-white text-sm">{reward.name}</div>
                        <div className="text-white/50 text-xs mt-0.5">{reward.description}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <div className="text-amber-400 font-black text-lg">{reward.cost} PP</div>
                      {canAfford ? (
                        <button
                          onClick={() => handleRedeem(reward)}
                          disabled={isRedeeming}
                          className="mt-1 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold text-xs py-1.5 px-3 rounded-lg hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 transition"
                        >
                          {isRedeeming ? '...' : 'Redeem'}
                        </button>
                      ) : (
                        <div className="text-white/40 text-xs mt-1">{reward.cost - profile.points} more PP</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tier benefits info */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-4">
              <h3 className="text-white font-bold mb-3">✨ Membership Tiers</h3>
              {REWARDS_TIERS.map(t => (
                <div key={t.id} className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1 ${tier.id === t.id ? 'bg-amber-500/20 border border-amber-500/40' : ''}`}>
                  <span className={`font-semibold text-sm ${t.color}`}>{t.icon} {t.name}</span>
                  <span className="text-white/50 text-xs">{t.minPoints}+ PP{tier.id === t.id ? ' · Current' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points history */}
        {activeTab === 'history' && (
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-white font-bold">Points History</h2>
            </div>
            {(!profile.pointsHistory || profile.pointsHistory.length === 0) ? (
              <div className="p-8 text-center text-white/50">
                <div className="text-4xl mb-2">📋</div>
                <p>Play games to earn Putters Points!</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                {profile.pointsHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-white text-sm font-medium">{entry.label}</div>
                      <div className="text-white/40 text-xs">{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className={`text-lg font-black ${entry.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.points > 0 ? '+' : ''}{entry.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Redemptions */}
        {activeTab === 'redemptions' && (
          <div className="space-y-3">
            {(!profile.redemptions || profile.redemptions.length === 0) ? (
              <div className="bg-black/40 rounded-2xl p-8 text-center border border-white/10">
                <div className="text-4xl mb-2">🎟️</div>
                <p className="text-white/60">No redemptions yet. Spend your Putters Points on awesome perks!</p>
              </div>
            ) : (
              profile.redemptions.map((r) => (
                <div key={r.id} className="bg-black/40 rounded-2xl p-4 border border-white/10">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-bold">{r.rewardName}</div>
                      <div className="text-white/50 text-xs mt-1">{new Date(r.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-black tracking-widest text-lg">{r.redemptionCode}</div>
                      <div className="text-white/40 text-xs">{r.cost} PP spent</div>
                    </div>
                  </div>
                  <div className="mt-3 bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-white/60 text-xs">Show this code to Putters staff to redeem</p>
                    <p className="text-amber-400 font-mono text-xl font-bold tracking-[0.3em] mt-1">{r.redemptionCode}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => navigate('/join')}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 px-6 rounded-xl text-lg uppercase tracking-wide hover:from-amber-400 hover:to-amber-500 transition shadow-lg"
          >
            Play a Game &amp; Earn More Points 🎱
          </button>
        </div>
      </div>
    </div>
  );
}

function RedemptionModal({ msg, onClose }) {
  if (msg.type === 'error') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center border border-red-500">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="text-xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-red-400 mb-4">{msg.message}</p>
          <button onClick={onClose} className="bg-red-700 text-white font-bold py-2 px-6 rounded-xl">OK</button>
        </div>
      </div>
    );
  }

  const { reward, redemption } = msg;
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center border-2 border-amber-500">
        <div className="text-5xl mb-3">{reward.icon}</div>
        <h2 className="text-2xl font-bold text-white mb-1">Reward Redeemed!</h2>
        <p className="text-amber-400 font-semibold mb-2">{reward.name}</p>
        <p className="text-white/60 text-sm mb-6">{reward.description}</p>

        <div className="bg-amber-500/10 border-2 border-amber-500 rounded-2xl p-4 mb-6">
          <p className="text-white/60 text-xs mb-2">Show this code to Putters staff:</p>
          <p className="text-amber-400 font-mono text-3xl font-black tracking-[0.3em]">{redemption.redemptionCode}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-3 px-6 rounded-xl text-lg"
        >
          Got it! 🎉
        </button>
      </div>
    </div>
  );
}

export default RewardsProfile;
