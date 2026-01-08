
import { useGameStore, getSimWorker } from '../store/gameStore';
import { CHALLENGES } from '@shared/challenges.config';

import './WorldRulesPanel.css'; // Re-use panel styles
import { useEffect, useState } from 'react';

export function ChallengePanel() {
    const {
        activeChallengeId,
        challengeStartTime,
        challengeState,
        startChallenge,
        stopChallenge,
        setChallengeState,
        stats,
        togglePanel
    } = useGameStore();

    const [elapsed, setElapsed] = useState(0);

    // Update timer
    useEffect(() => {
        if (activeChallengeId && challengeStartTime && challengeState === 'active') {
            const interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - challengeStartTime) / 1000));
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setElapsed(0);
        }
    }, [activeChallengeId, challengeStartTime, challengeState]);

    // Check conditions
    useEffect(() => {
        if (!activeChallengeId || challengeState !== 'active' || !stats) return;

        const challenge = CHALLENGES.find(c => c.id === activeChallengeId);
        if (!challenge) return;

        // Check fail
        if (challenge.failCondition && challenge.failCondition(stats, 0)) {
            setChallengeState('lost');
            return;
        }

        // Check win
        // Some challenges require holding a condition for duration, others purely win condition
        // Assume duration is a requirement unless winCondition is met early? 
        // Logic: if duration is set, must survive until then AND met winCondition?
        // Or: winCondition is checked at end?

        // Let's implement: Win check every tick. If duration passed, check winCondition.
        const durationPassed = elapsed >= challenge.durationSec;
        const conditionMet = challenge.winCondition(stats, 0);

        if (durationPassed) {
            if (conditionMet) {
                setChallengeState('won');
            } else {
                setChallengeState('lost');
            }
        } else {
            // Early failure check if needed, but here we just wait
        }

    }, [stats, elapsed, activeChallengeId, challengeState]);

    const handleStart = (id: string) => {
        const challenge = CHALLENGES.find(c => c.id === id);
        if (!challenge) return;

        // Reset world (Hard reset or Soft?)
        // Ideally should reset entities. For now, let's just spawn the setup.
        const worker = getSimWorker();
        if (worker) {
            // We should ideally CLEAR the world first.
            // But we don't have CLEAR_WORLD yet.
            // Let's just spend GP to spawn specific setup or assume player cleans up?
            // "Scenario" usually implies clean slate.
            // TODO: Implement RESET_WORLD in worker.
            console.log("Starting challenge setup...");

            // For V1.1, let's just start tracking. User manually sets up or we just add.
        }

        startChallenge(id);
    };

    const activeDef = CHALLENGES.find(c => c.id === activeChallengeId);

    return (
        <div className="panel challenge-panel" style={{ width: '320px', left: '20px', top: '80px' }}>
            <div className="panel-header">
                <span className="panel-icon">🏆</span>
                <h3>Challenges</h3>
                <button className="close-btn" onClick={() => togglePanel('challenge')}>×</button>
            </div>

            <div className="panel-body">
                {activeChallengeId && activeDef ? (
                    <div className="active-challenge">
                        <h4>{activeDef.title}</h4>
                        <p className="challenge-desc">{activeDef.description}</p>

                        <div className="challenge-status">
                            <div className="timer">
                                ⏳ {elapsed}s / {activeDef.durationSec}s
                            </div>
                            <div className={`status-badge ${challengeState}`}>
                                {challengeState?.toUpperCase()}
                            </div>
                        </div>

                        {challengeState === 'active' ? (
                            <button className="btn-danger" onClick={stopChallenge}>Abort</button>
                        ) : (
                            <div className="result-actions">
                                {challengeState === 'won' && <div className="win-msg">🎉 Victory!</div>}
                                {challengeState === 'lost' && <div className="lose-msg">💀 Defeat</div>}
                                <button onClick={stopChallenge}>Back to Menu</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="challenge-list">
                        {CHALLENGES.map(c => (
                            <div key={c.id} className="challenge-card">
                                <div className="challenge-header">
                                    <strong>{c.title}</strong>
                                    <span className="duration">{c.durationSec}s</span>
                                </div>
                                <p>{c.description}</p>
                                <button className="start-btn" onClick={() => handleStart(c.id)}>
                                    Start
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
