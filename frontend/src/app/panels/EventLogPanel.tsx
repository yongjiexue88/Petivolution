
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import type { SimEvent } from '@shared/types';
import { V1 } from '@shared/constants';
import './EventLogPanel.css';

type FilterType = 'ALL' | 'DEATH' | 'HUNT' | 'LIFE';

export function EventLogPanel() {
    const { events, togglePanel, setCameraFlyTo } = useGameStore();
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
        if (filter === 'LIFE') return e.type === 'DRINK' || e.type === 'EAT' || e.type === 'BIRTH';
        return true;
    });

    const formatTime = (tick: number) => {
        const seconds = Math.floor(tick / V1.simTickHz);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getEventIcon = (type: string, importance: string = 'C') => {
        if (importance === 'S') return '‼️';

        switch (type) {
            case 'DEATH': return '💀';
            case 'BIRTH': return '🐣';
            case 'HUNT': return '⚔️';
            case 'DRINK': return '💧';
            case 'EAT': return '🍴';
            default: return '📝';
        }
    };

    const handleJump = (e: SimEvent) => {
        if (e.location) {
            setCameraFlyTo(e.location);
        }
    };

    const renderEventContent = (e: SimEvent) => {
        const subject = e.subjectName || 'Creature';
        const target = e.targetName || 'Target';

        switch (e.type) {
            case 'DEATH':
                return (
                    <span>
                        <span className="log-subject">{subject}</span> died ({e.reason})
                        {e.killedBy && <span> by <span className="log-target">{target}</span></span>}
                    </span>
                );
            case 'BIRTH':
                return (
                    <span>
                        <span className="log-subject">{subject}</span> was born
                    </span>
                );
            case 'HUNT':
                return (
                    <span>
                        <span className="log-subject">{subject}</span> chases <span className="log-target">{target}</span>
                    </span>
                );
            case 'DRINK':
                return (
                    <span>
                        <span className="log-subject">{subject}</span> drinks
                    </span>
                );
            case 'EAT':
                return (
                    <span>
                        <span className="log-subject">{subject}</span> eats <span className="log-target">{e.source === 'prey' ? target : e.source}</span>
                    </span>
                );
            case 'GENERIC':
                return <span>{e.message}</span>;
            default:
                return <span>Unknown event</span>;
        }
    };

    return (
        <div className="panel event-log-panel">
            <div className="panel-header">
                <h3>📜 Live Feed</h3>
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
                            {f === 'LIFE' ? 'BIO' : f}
                        </button>
                    ))}
                </div>

                <div className="log-list" ref={scrollRef}>
                    {filteredEvents.length === 0 ? (
                        <div className="empty-log">No events yet...</div>
                    ) : (
                        filteredEvents.map((e, i) => (
                            <div
                                key={`${e.tick}-${i}`}
                                className={`log-item type-${e.type} imp-${e.importance || 'C'}`}
                                onClick={() => handleJump(e)}
                                title={e.location ? "Click to jump" : ""}
                            >
                                <span className="log-time">{formatTime(e.tick)}</span>
                                <span className="log-icon">{getEventIcon(e.type, e.importance)}</span>
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
