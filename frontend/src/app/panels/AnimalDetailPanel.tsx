// ============================================
// V1 动物详情面板 (可解释性 UI)
// ============================================

import type { EntityRuntime, Goal, Stimulus } from '@shared/types';
import { V1 } from '@shared/constants';
import './AnimalDetailPanel.css';

interface Props {
    entity: EntityRuntime;
}

export function AnimalDetailPanel({ entity }: Props) {
    const { vitals, ai, personality, species, name, ageTicks, state, generation, children } = entity;

    const formatAge = (ticks: number): string => {
        const seconds = Math.floor(ticks / V1.simTickHz);
        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分${seconds % 60}秒`;
        return `${Math.floor(minutes / 60)}时${minutes % 60}分`;
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
            drink: '喝水',
            eat: '觅食',
            hunt: '狩猎',
            rest: '休息',
            flee: '逃跑',
            wander: '闲逛',
        };
        return map[goal];
    };

    const getStimulusLabel = (s: Stimulus): string => {
        switch (s.type) {
            case 'prey': return `🎯 猎物 (${s.dist.toFixed(0)}px)`;
            case 'predator': return `⚠️ 捕食者 (${s.dist.toFixed(0)}px)`;
            case 'water': return `💧 水源 (${s.dist.toFixed(0)}px)`;
            case 'bush': return `🌿 灌木 (${s.dist.toFixed(0)}px)`;
            case 'trash': return `🗑️ 垃圾堆 (${s.dist.toFixed(0)}px)`;
            default: return '未知';
        }
    };

    const getPersonalityLabel = (p: string): string => {
        const map: Record<string, string> = {
            curious: '🔍 好奇',
            cautious: '🛡️ 谨慎',
            brave: '⚔️ 勇敢',
        };
        return map[p] || p;
    };

    // 获取 Top 3 评分
    const topScores = Object.entries(ai.lastUtilityScores)
        .filter(([_, score]) => score !== undefined && score > -100)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 3);

    return (
        <div className="panel detail-panel">
            <div className="panel-header">
                <span className="panel-icon">{species === 'cat' ? '🐱' : '🐭'}</span>
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
                {/* 基本信息 */}
                <div className="info-row">
                    <span className="info-label">年龄</span>
                    <span className="info-value">{formatAge(ageTicks)}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">性格</span>
                    <span className="info-value">{getPersonalityLabel(personality)}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">代数</span>
                    <span className="info-value">Gen {generation || 1}</span>
                </div>
                <div className="info-row">
                    <span className="info-label">后代</span>
                    <span className="info-value">{children?.length || 0}</span>
                </div>

                {/* Vitals 条 */}
                <div className="vitals-section">
                    <h4>生命体征</h4>
                    <VitalBar label="🍖 饥饿" value={vitals.hunger01} color="#f97316" />
                    <VitalBar label="💧 口渴" value={vitals.thirst01} color="#3b82f6" />
                    <VitalBar label="😴 疲劳" value={vitals.fatigue01} color="#a855f7" />
                    <VitalBar label="❤️ 健康" value={vitals.health01} color="#ef4444" />
                </div>

                {/* AI 决策 (可解释性核心) */}
                <div className="ai-section">
                    <h4>🧠 AI 决策</h4>

                    <div className="info-row">
                        <span className="info-label">当前目标</span>
                        <span className="info-value goal-badge">{getGoalLabel(ai.currentGoal)}</span>
                    </div>

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

                    {/* 评分表 */}
                    {topScores.length > 0 && (
                        <div className="scores-section">
                            <span className="subsection-label">决策评分 (Top 3)</span>
                            <div className="scores-list">
                                {topScores.map(([goal, score], i) => (
                                    <div key={goal} className={`score-item ${i === 0 ? 'top' : ''}`}>
                                        <span className="score-label">{getGoalLabel(goal as Goal)}</span>
                                        <span className="score-value">{score?.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 最近刺激 */}
                    {ai.recentStimuli.length > 0 && (
                        <div className="stimuli-section">
                            <span className="subsection-label">感知刺激</span>
                            <div className="stimuli-list">
                                {ai.recentStimuli.slice(0, 4).map((s, i) => (
                                    <div key={i} className="stimulus-item">
                                        {getStimulusLabel(s)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 失败原因 */}
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

// Vital Bar 组件
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
