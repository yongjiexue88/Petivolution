// ============================================
// V1 墓地面板
// ============================================

import { useGameStore } from '../store/gameStore';
import { V1 } from '@shared/constants';
import { SimEvent } from '@shared/types';
import './GraveyardPanel.css';

export function GraveyardPanel() {
    const { graveyard, viewingGravePathId, setViewGravePath } = useGameStore();

    const formatLifespan = (bornTick: number, deadTick: number): string => {
        const ticks = deadTick - bornTick;
        const seconds = Math.floor(ticks / V1.simTickHz);

        if (seconds < 60) return `${seconds}秒`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}分${seconds % 60}秒`;
        return `${Math.floor(minutes / 60)}时${minutes % 60}分`;
    };

    const getReasonLabel = (reason: string): string => {
        const map: Record<string, string> = {
            starvation: '🍖 饿死',
            dehydration: '💧 渴死',
            killed: '☠️ 被捕杀',
            unknown: '❓ 未知',
        };
        return map[reason] || reason;
    };

    const getSpeciesEmoji = (species: string): string => {
        return species === 'cat' ? '🐱' : '🐭';
    };

    // 按死亡时间倒序
    const sortedGraveyard = [...graveyard].reverse();

    return (
        <div className="panel graveyard-panel">
            <div className="panel-header">
                <span className="panel-icon">⚰️</span>
                <h3>墓碑</h3>
                <span className="death-count">{graveyard.length}</span>
            </div>

            <div className="panel-body">
                {sortedGraveyard.length === 0 ? (
                    <div className="empty-message">
                        <span className="empty-icon">🌿</span>
                        <p>暂无死亡记录</p>
                        <p className="empty-hint">当动物死亡时会在此显示</p>
                    </div>
                ) : (
                    <div className="graveyard-list">
                        {sortedGraveyard.map((entry, i) => (
                            <div key={`${entry.entityId}-${i}`} className="grave-item">
                                <div className="grave-header">
                                    <span className="grave-icon">{getSpeciesEmoji(entry.species)}</span>
                                    <span className="grave-name">{entry.name}</span>
                                    <span className="grave-personality">{entry.personality}</span>
                                </div>
                                <div className="grave-details">
                                    <span className="grave-reason">{getReasonLabel(entry.reason)}</span>
                                    <span className="grave-lifespan">
                                        存活：{formatLifespan(entry.bornTick, entry.deadTick)}
                                    </span>
                                </div>
                                {entry.killedByName && (
                                    <div className="grave-killer">
                                        被 {entry.killedByName} 捕杀
                                    </div>
                                )}

                                {/* History (V1.1) */}
                                {entry.history && entry.history.length > 0 && (
                                    <div className="grave-history">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div className="history-title" style={{ marginBottom: 0 }}>生平回放</div>
                                            {entry.path && entry.path.length > 0 && (
                                                <button
                                                    className={`path-btn ${viewingGravePathId === entry.entityId ? 'active' : ''}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (viewingGravePathId === entry.entityId) {
                                                            setViewGravePath(null);
                                                        } else {
                                                            setViewGravePath(entry.entityId);
                                                        }
                                                    }}
                                                >
                                                    {viewingGravePathId === entry.entityId ? 'Hide Path' : 'Show Path'}
                                                </button>
                                            )}
                                        </div>
                                        {entry.history.slice().reverse().slice(0, 5).map((evt: SimEvent, j: number) => (
                                            <div key={j} className="history-row">
                                                <span className="tick">T{evt.tick}</span>
                                                <span className="type">{evt.type}</span>
                                                {evt.type === 'HUNT' && <span className="desc">捕猎</span>}
                                                {evt.type === 'DRINK' && <span className="desc">饮水</span>}
                                                {evt.type === 'EAT' && <span className="desc">进食</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
