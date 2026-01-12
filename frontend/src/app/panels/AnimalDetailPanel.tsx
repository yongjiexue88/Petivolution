// ============================================
// V1 Animal Detail Panel (Explainability UI)
// ============================================

import type { EntityRuntime, Goal, Stimulus } from '@shared/types';
import { V1 } from '@shared/constants';
import { useGameStore } from '../store/gameStore';
import './AnimalDetailPanel.css';

interface Props {
    entity: EntityRuntime;
}

export function AnimalDetailPanel({ entity }: Props) {
    const { ai, personality, species, name, ageTicks, state, generation, children } = entity;

    // Defensive check for vitals (may be undefined during snapshot sync)
    const vitals = entity.vitals || { hunger01: 0, thirst01: 0, fatigue01: 0, health01: 0 };

    const formatAge = (ticks: number): string => {
        const seconds = Math.floor(ticks / V1.simTickHz);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    const getStateEmoji = (s: string): string => {
        const map: Record<string, string> = {
            idle: '😐',
            wander: '🚶',
            moveTo: '🏃',
            drink: '💧',
            eat: '🍽️',
            chase: '🏹',
            attack: '⚔️',
            flee: '🏃‍♂️💨',
            sleep: '😴',
            dead: '💀',
        };
        return map[s] || '❓';
    };

    const getGoalLabel = (goal: Goal): string => {
        const map: Record<Goal, string> = {
            drink: 'Find Water',
            eat: 'Find Food',
            hunt: 'Hunt',
            rest: 'Rest',
            flee: 'Flee',
            wander: 'Wander',
            forage: 'Forage',
            rummage: 'Rummage',
            bark: 'Bark',
            patrol: 'Patrol',
            reproduce: 'Reproduce'
        };
        return map[goal];
    };

    const getStimulusLabel = (s: Stimulus): string => {
        switch (s.type) {
            case 'prey': return `🎯 Prey (${s.dist.toFixed(0)}px)`;
            case 'predator': return `⚠️ Predator (${s.dist.toFixed(0)}px)`;
            case 'water': return `💧 Water (${s.dist.toFixed(0)}px)`;
            case 'bush': return `🌿 Bush (${s.dist.toFixed(0)}px)`;
            case 'trash': return `🗑️ Trash (${s.dist.toFixed(0)}px)`;
            case 'friend': return `👋 Friend (${s.dist.toFixed(0)}px)`;
            case 'intruder': return `🚫 Intruder (${s.dist.toFixed(0)}px)`;
            case 'perch': return `🪵 Perch (${s.dist.toFixed(0)}px)`;
            default: return 'Unknown';
        }
    };

    const getPersonalityLabel = (p: string): string => {
        const map: Record<string, string> = {
            curious: '🔍 Curious',
            cautious: '🛡️ Cautious',
            brave: '⚔️ Brave',
        };
        return map[p] || p;
    };

    const getSpeciesIcon = (s: string): string => {
        const map: Record<string, string> = {
            rat: '🐭',
            cat: '🐱',
            chicken: '🐔',
            smallBird: '🐦',
            raccoon: '🦝',
            crow: '🐦‍⬛',
            dog: '🐶',
            fox: '🦊',
            hawk: '🦅',
            wolf: '🐺',
            snake: '🐍',
        };
        return map[s] || '❓';
    };

    // Get Top 3 scores
    const topScores = Object.entries(ai.lastUtilityScores)
        .filter(([_, score]) => score !== undefined && score > -100)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 3);

    return (
        <div className="panel detail-panel">
            <div className="panel-header">
                <span className="panel-icon">{getSpeciesIcon(species)}</span>
                <h3>{name}</h3>
                <span className="entity-state">{getStateEmoji(state)} {state}</span>
                <button
                    className={`follow-btn ${useGameStore.getState().followingEntityId === entity.id ? 'active' : ''}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Stop following if clicking active, otherwise follow this
                        const current = useGameStore.getState().followingEntityId;
                        if (current === entity.id) {
                            useGameStore.getState().setFollowingEntityId(null);
                        } else {
                            useGameStore.getState().setFollowingEntityId(entity.id);
                        }
                    }}
                    title="Camera Follow"
                >
                    {useGameStore.getState().followingEntityId === entity.id ? '📹 Following' : '📹 Follow'}
                </button>
            </div>

            <div className="panel-body">
                {/* Basic Info */}
                <div className="info-row">
                    <span className="info-label">Age</span>
                    <span className="info-value">{formatAge(ageTicks)}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Personality</span>
                    <span className="info-value">{getPersonalityLabel(personality)}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Generation</span>
                    <span className="info-value">Gen {generation || 1}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">Offspring</span>
                    <span className="info-value">{children?.length || 0}</span>
                </div>

                {/* Vitals Bars */}
                <div className="vitals-section">
                    <h4>Vitals</h4>
                    <VitalBar label="🍖 Hunger" value={vitals.hunger01} color="#f97316" />
                    <VitalBar label="💧 Thirst" value={vitals.thirst01} color="#3b82f6" />
                    <VitalBar label="😴 Fatigue" value={vitals.fatigue01} color="#a855f7" />
                    <VitalBar label="❤️ Health" value={vitals.health01} color="#ef4444" />
                </div>

                {/* AI Decision (Explainability Core) */}
                <div className="ai-section">


                    {/* Decision Reasoning */}
                    {ai.decisionContext && (
                        <div className="info-row">
                            <span className="info-label">Action Details</span>
                            <span className="info-value context-value">
                                {ai.decisionContext.reason
                                    ? ai.decisionContext.reason
                                    : ai.decisionContext.targetId
                                        ? `${ai.decisionContext.goal} #${ai.decisionContext.targetId.slice(0, 4)} (${ai.decisionContext.distance?.toFixed(1)}t)`
                                        : ai.decisionContext.goal}
                            </span>
                        </div>
                    )}

                    {/* Scores Table */}
                    <div className="scores-section">
                        <h4>Decision Scores (Top 3)</h4>
                        <div className="scores-list">
                            {topScores.length > 0 ? (
                                topScores.map(([goal, score], i) => (
                                    <div key={goal} className={`score-item ${i === 0 ? 'top' : ''}`}>
                                        <span className="score-label">{getGoalLabel(goal as Goal)}</span>
                                        <span className="score-value">{score?.toFixed(2)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="score-item" style={{ fontStyle: 'italic', opacity: 0.7 }}>
                                    <span className="score-label">None</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Stimuli */}
                    <div className="stimuli-section">
                        <span className="subsection-label">Perception Stimuli</span>
                        <div className="stimuli-list">
                            {ai.recentStimuli.length > 0 ? (
                                ai.recentStimuli.slice(0, 4).map((s, i) => (
                                    <div key={i} className="stimulus-item">
                                        {getStimulusLabel(s)}
                                    </div>
                                ))
                            ) : (
                                <div className="stimulus-item" style={{ fontStyle: 'italic', opacity: 0.7 }}>None</div>
                            )}
                        </div>
                    </div>

                    {/* Failure Reason */}
                    {ai.lastFailReason && (
                        <div className="fail-reason">
                            ⚠️ {ai.lastFailReason}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Vital Bar Component
function VitalBar({ label, value, color }: { label: string; value: number; color: string }) {
    const percentage = Math.round(value * 100);
    const isLow = value < 0.3;

    return (
        <div className="vital-bar">
            <div className="vital-label">
                <span>{label}</span>
                <span className={`vital-value ${isLow ? 'low' : ''}`}>{percentage}%</span>
            </div>
            <div className="vital-track">
                <div
                    className={`vital-fill ${isLow ? 'low' : ''}`}
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
        </div>
    );
}
