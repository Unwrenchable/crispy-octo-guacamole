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
    <div className="min-h-screen p-4">
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
            style={{background:'none', border:'none', cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', gap:'4px', color:'rgba(245,230,200,0.6)'}}
            onMouseEnter={e => e.target.style.color='rgba(212,160,23,0.9)'}
            onMouseLeave={e => e.target.style.color='rgba(245,230,200,0.6)'}
          >
            ← Back
          </button>
          <button
            onClick={handleLogout}
            style={{background:'none', border:'none', cursor:'pointer', fontSize:'0.875rem', color:'rgba(245,230,200,0.35)'}}
            onMouseEnter={e => e.target.style.color='#f87171'}
            onMouseLeave={e => e.target.style.color='rgba(245,230,200,0.35)'}
          >
            Sign Out
          </button>
        </div>

        {/* Profile card */}
        <div className="pv-card p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{color:'#f5e6c8'}}>{profile.displayName}</h1>
              <p className="text-sm" style={{color:'rgba(245,230,200,0.4)'}}>{storageService.maskedPhone(profile.phone)}</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-black ${tier.color}`}>{tier.icon}</div>
              <div className={`text-sm font-bold ${tier.color}`}>{tier.name}</div>
            </div>
          </div>

          {/* Points balance */}
          <div className="pv-points-box p-4 mb-4 text-center">
            <div className="pv-score" style={{fontSize:'3.5rem'}}>{ profile.points}</div>
            <div className="text-sm mt-1" style={{color:'rgba(245,230,200,0.6)'}}>Putters Points</div>
            <div className="text-xs mt-1" style={{color:'rgba(245,230,200,0.35)'}}>{profile.totalPointsEarned || profile.points} total earned · {profile.gamesPlayed || 0} games played</div>
          </div>

          {/* Tier progress */}
          {nextTier ? (
            <div>
              <div className="flex justify-between text-xs mb-2" style={{color:'rgba(245,230,200,0.5)'}}>
                <span>{tier.icon} {tier.name}</span>
                <span>{nextTier.icon} {nextTier.name} in {pointsToNext} PP</span>
              </div>
              <div className="pv-progress-track">
                <div className="pv-progress-fill" style={{ width: `${Math.min(tierProgress, 100)}%` }} />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="font-bold text-sm pv-glow-anim" style={{color:'rgba(212,160,23,0.9)'}}>👑 Maximum tier reached! You're a Legend!</span>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Games', value: profile.gamesPlayed || 0, icon: '🎮' },
              { label: 'Wins',  value: profile.gamesWon || 0,   icon: '🏆' },
              { label: 'Earned',value: profile.totalPointsEarned || profile.points, icon: '⭐' },
            ].map(s => (
              <div key={s.label} className="pv-felt-section p-3 text-center">
                <div className="text-xl">{s.icon}</div>
                <div className="text-xl font-bold" style={{color:'#f5e6c8'}}>{s.value}</div>
                <div className="text-xs" style={{color:'rgba(245,230,200,0.45)'}}>{s.label}</div>
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
              className={`pv-tab ${activeTab === tab.id ? 'pv-tab-active' : 'pv-tab-inactive'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Rewards catalog */}
        {activeTab === 'rewards' && (
          <div className="space-y-3">
            <p className="text-sm text-center mb-2" style={{color:'rgba(245,230,200,0.45)'}}>
              Show your redemption code to Putters staff to claim your perk 🎉
            </p>
            {REWARDS_CATALOG.map(reward => {
              const canAfford = profile.points >= reward.cost;
              const isRedeeming = redeemingId === reward.id;
              return (
                <div
                  key={reward.id}
                  className={`pv-reward-card ${canAfford ? 'pv-reward-card-available' : 'pv-reward-card-locked'}`}
                >
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                      <span style={{fontSize:'1.875rem'}}>{reward.icon}</span>
                      <div>
                        <div style={{fontWeight:700, fontSize:'0.875rem', color:'#f5e6c8'}}>{reward.name}</div>
                        <div style={{fontSize:'0.75rem', marginTop:'2px', color:'rgba(245,230,200,0.45)'}}>{reward.description}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right', flexShrink:0, marginLeft:'12px'}}>
                      <div className="pv-score" style={{fontSize:'1.125rem'}}>{reward.cost} PP</div>
                      {canAfford ? (
                        <button
                          onClick={() => handleRedeem(reward)}
                          disabled={isRedeeming}
                          className="pv-btn pv-btn-gold"
                          style={{marginTop:'4px', fontSize:'0.75rem', padding:'6px 12px'}}
                        >
                          {isRedeeming ? '...' : 'Redeem'}
                        </button>
                      ) : (
                        <div style={{fontSize:'0.75rem', marginTop:'4px', color:'rgba(245,230,200,0.35)'}}>{reward.cost - profile.points} more PP</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pv-felt-section p-4 mt-4">
              <h3 style={{fontWeight:700, marginBottom:'12px', color:'#f5e6c8'}}>✨ Membership Tiers</h3>
              {REWARDS_TIERS.map(t => (
                <div key={t.id} className={tier.id === t.id ? 'pv-row-gold' : ''} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:'8px', marginBottom:'4px'}}>
                  <span className={`font-semibold text-sm ${t.color}`}>{t.icon} {t.name}</span>
                  <span style={{fontSize:'0.75rem', color:'rgba(245,230,200,0.4)'}}>{t.minPoints}+ PP{tier.id === t.id ? ' · Current' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="pv-card" style={{overflow:'hidden'}}>
            <div style={{padding:'16px', borderBottom:'1px solid rgba(212,160,23,0.15)'}}>
              <h2 style={{fontWeight:700, color:'#f5e6c8'}}>Points History</h2>
            </div>
            {(!profile.pointsHistory || profile.pointsHistory.length === 0) ? (
              <div style={{padding:'32px', textAlign:'center', color:'rgba(245,230,200,0.4)'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'8px'}}>📋</div>
                <p>Play games to earn Putters Points!</p>
              </div>
            ) : (
              <div style={{maxHeight:'384px', overflowY:'auto'}}>
                {profile.pointsHistory.map((entry) => (
                  <div key={entry.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <div>
                      <div style={{fontSize:'0.875rem', fontWeight:500, color:'#f5e6c8'}}>{entry.label}</div>
                      <div style={{fontSize:'0.75rem', color:'rgba(245,230,200,0.35)'}}>{new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div style={{fontSize:'1.125rem', fontWeight:900, color: entry.points > 0 ? '#4ade80' : '#f87171'}}>
                      {entry.points > 0 ? '+' : ''}{entry.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'redemptions' && (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {(!profile.redemptions || profile.redemptions.length === 0) ? (
              <div className="pv-card" style={{padding:'32px', textAlign:'center'}}>
                <div style={{fontSize:'2.5rem', marginBottom:'8px'}}>🎟️</div>
                <p style={{color:'rgba(245,230,200,0.5)'}}>No redemptions yet. Spend your Putters Points on awesome perks!</p>
              </div>
            ) : (
              profile.redemptions.map((r) => (
                <div key={r.id} className="pv-card" style={{padding:'16px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700, color:'#f5e6c8'}}>{r.rewardName}</div>
                      <div style={{fontSize:'0.75rem', marginTop:'4px', color:'rgba(245,230,200,0.4)'}}>{new Date(r.timestamp).toLocaleDateString()}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="pv-score" style={{letterSpacing:'0.25em', fontSize:'1.125rem'}}>{r.redemptionCode}</div>
                      <div style={{fontSize:'0.75rem', color:'rgba(245,230,200,0.35)'}}>{r.cost} PP spent</div>
                    </div>
                  </div>
                  <div className="pv-felt-section" style={{marginTop:'12px', padding:'12px', textAlign:'center'}}>
                    <p style={{fontSize:'0.75rem', color:'rgba(245,230,200,0.5)'}}>Show this code to Putters staff to redeem</p>
                    <p className="pv-code" style={{marginTop:'4px'}}>{r.redemptionCode}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{marginTop:'24px', textAlign:'center'}}>
          <button onClick={() => navigate('/join')} className="pv-btn pv-btn-gold w-full" style={{fontSize:'1.125rem'}}>
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
      <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px'}}>
        <div className="pv-card pv-pop-in" style={{padding:'32px', maxWidth:'384px', width:'100%', textAlign:'center', borderColor:'rgba(239,68,68,0.5)'}}>
          <div style={{fontSize:'2.5rem', marginBottom:'12px'}}>❌</div>
          <h2 style={{fontSize:'1.25rem', fontWeight:700, marginBottom:'8px', color:'#f5e6c8'}}>Oops!</h2>
          <p style={{marginBottom:'16px', color:'#f87171'}}>{msg.message}</p>
          <button onClick={onClose} className="pv-btn pv-btn-green" style={{background:'rgba(100,0,0,0.5)', borderColor:'rgba(239,68,68,0.5)'}}>OK</button>
        </div>
      </div>
    );
  }

  const { reward, redemption } = msg;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px'}}>
      <div className="pv-card pv-pop-in" style={{padding:'32px', maxWidth:'384px', width:'100%', textAlign:'center'}}>
        <div style={{fontSize:'3rem', marginBottom:'12px'}}>{reward.icon}</div>
        <h2 style={{fontSize:'1.5rem', fontWeight:700, marginBottom:'4px', color:'#f5e6c8'}}>Reward Redeemed!</h2>
        <p style={{fontWeight:600, marginBottom:'8px', color:'rgba(212,160,23,0.9)'}}>{reward.name}</p>
        <p style={{fontSize:'0.875rem', marginBottom:'24px', color:'rgba(245,230,200,0.55)'}}>{reward.description}</p>

        <div className="pv-points-box" style={{padding:'16px', marginBottom:'24px'}}>
          <p style={{fontSize:'0.75rem', marginBottom:'8px', color:'rgba(245,230,200,0.5)'}}>Show this code to Putters staff:</p>
          <p className="pv-code">{redemption.redemptionCode}</p>
        </div>

        <button onClick={onClose} className="pv-btn pv-btn-gold w-full" style={{fontSize:'1.125rem'}}>
          Got it! 🎉
        </button>
      </div>
    </div>
  );
}

export default RewardsProfile;
