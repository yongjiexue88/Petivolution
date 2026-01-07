
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { SimEvent } from '@shared/types';
import { V1 } from '@shared/constants';
import './EventLogPanel.css';

type FilterType = 'ALL' | 'DEATH' | 'HUNT' | 'LIFE';

export function EventLogPanel() {
    const { events, togglePanel } = useGameStore();
    const [filter, setFilter] = useState<FilterType>('ALL');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new events
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [events, filter]);

    const filteredEvents = events.filter(e => {
        if (filter === 'ALL') return true;
        if (filter === 'DEATH') return e.type === 'DEATH';
        if (filter === 'HUNT') return e.type === 'HUNT';
        if (filter === 'LIFE') return e.type === 'DRINK' || e.type === 'EAT';
        return true;
    });

    const formatTime = (tick: number) => {
        const seconds = Math.floor(tick / V1.simTickHz);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'DEATH': return '💀';
            case 'HUNT': return '⚔️';
            case 'DRINK': return '💧';
            case 'EAT': return '🍽️';
            default: return '📝';
        }
    };

    const renderEventContent = (e: SimEvent) => {
        // We need names eventually, but SimEvent currently only has IDs mainly.
        // Wait, SimEvent in types.ts:
        // DEATH: has reason, killedBy (ID)
        // HUNT: predatorId, preyId
        // DRINK: entityId, waterId
        // EAT: entityId, source

        // We should update SimEvent to include names at generation time to avoid looking up dead entities?
        // Or we just show IDs/Species for now?
        // Let's use generic descriptions for V1.1 if names are missing.
        // Actually, for better UX, we should look up names in the store entities list?
        // But dead entities might be gone from entities list.
        // Best approach: Add names to SimEvent payload in Worker.
        // For now, let's implement MVP with just types/reasons.

        switch (e.type) {
            case 'DEATH':
                return (
                    <span>
                        <span className="log-highlight">Creature</span> died from {e.reason}
                    </span>
                );
            case 'HUNT':
                return (
                    <span>
                        <span className="log-highlight">Cat</span> is chasing <span className="log-highlight">Rat</span>
                    </span>
                );
            case 'DRINK':
                return <span>Drinking water</span>;
            case 'EAT':
                return <span>Eating {e.source}</span>;
            default:
                return <span>Unknown event</span>;
        }
    };

    return (
        <div className="panel event-log-panel">
            <div className="panel-header">
                <h3>📜 Event Log</h3>
                <button className="close-btn" onClick={() => togglePanel('eventLog')}>×</button>
            </div>

            <div className="panel-body">
                <div className="log-filters">
                    {(['ALL', 'DEATH', 'HUNT', 'LIFE'] as FilterType[]).map(f => (
                        <button
                            key={f}
                            className={`filter-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'LIFE' ? 'EAT/DRINK' : f}
                        </button>
                    ))}
                </div>

                <div className="log-list" ref={scrollRef}>
                    {filteredEvents.length === 0 ? (
                        <div className="empty-log">No events yet...</div>
                    ) : (
                        filteredEvents.map((e, i) => (
                            <div key={`${e.tick}-${i}`} className={`log-item type-${e.type}`}>
                                <span className="log-time">{formatTime(e.tick)}</span>
                                <span className="log-icon">{getEventIcon(e.type)}</span>
                                <div className="log-content">
                                    {renderEventContent(e)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
