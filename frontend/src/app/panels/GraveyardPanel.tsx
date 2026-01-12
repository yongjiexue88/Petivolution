// ============================================
// V1 Graveyard Panel
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

        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    };

    const getReasonLabel = (reason: string): string => {
        const map: Record<string, string> = {
            starvation: '🍖 Starved',
            dehydration: '💧 Dehydrated',
            killed: '☠️ Killed',
            unknown: '❓ Unknown',
        };
        return map[reason] || reason;
    };

    const getSpeciesEmoji = (species: string): string => {
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
        return map[species] || '❓';
    };

    // Sort by death time (newest first)
    const sortedGraveyard = [...graveyard].reverse();

    return (
        <div className="panel graveyard-panel">
            <div className="panel-header">
                <span className="panel-icon">⚰️</span>
                <h3>Graveyard</h3>
                <span className="death-count">{graveyard.length}</span>
            </div>

            <div className="panel-body">
                {sortedGraveyard.length === 0 ? (
                    <div className="empty-message">
                        <span className="empty-icon">🌿</span>
                        <p>No deaths recorded</p>
                        <p className="empty-hint">Deaths will appear here</p>
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
                                        Lived: {formatLifespan(entry.bornTick, entry.deadTick)}
                                    </span>
                                </div>
                                {entry.killedByName && (
                                    <div className="grave-killer">
                                        Killed by {entry.killedByName}
                                    </div>
                                )}

                                {/* History (V1.1) */}
                                {entry.history && entry.history.length > 0 && (
                                    <div className="grave-history">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div className="history-title" style={{ marginBottom: 0 }}>Life History</div>
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
                                                {evt.type === 'HUNT' && <span className="desc">Hunt</span>}
                                                {evt.type === 'DRINK' && <span className="desc">Drink</span>}
                                                {evt.type === 'EAT' && <span className="desc">Eat</span>}
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
