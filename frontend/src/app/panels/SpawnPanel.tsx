// ============================================
// V1 Animal Spawn Panel
// ============================================

import { useState } from 'react';
import { useGameStore, getSimWorker } from '../store/gameStore';
import { ServerClient } from '../api/ServerClient';
import type { SpeciesId, TilePos } from '@shared/types';
import { V1 } from '@shared/constants';
import './SpawnPanel.css';

// Random name pools
const RAT_NAMES = ['Whiskers', 'Squeaky', 'Nibbles', 'Pepper', 'Dusty', 'Cookie', 'Pip', 'Ash', 'Peanut', 'Scout'];
const CAT_NAMES = ['Mittens', 'Lucky', 'Ginger', 'Snowball', 'Tom', 'Tiger', 'Mochi', 'Biscuit', 'Cookie', 'Fluffy'];
const CHICKEN_NAMES = ['Clucky', 'Goldie', 'Snowflake', 'Daisy', 'Gogo'];
const BIRD_NAMES = ['Chirpy', 'Sky', 'Flyer', 'Cloud'];
const RACCOON_NAMES = ['Bandit', 'Rocky', 'Mask', 'Rascal', 'Shadow'];
const CROW_NAMES = ['Raven', 'Midnight', 'Caw', 'Onyx'];
const DOG_NAMES = ['Buddy', 'Lucky', 'Max', 'Bella', 'Scout'];
const FOX_NAMES = ['Firefox', 'Rusty', 'Scarlet', 'Swift'];
const HAWK_NAMES = ['Eagle-Eye', 'Hunter', 'Falcon', 'Flash'];
const WOLF_NAMES = ['Ghost', 'Ashen', 'Alpha', 'Lone'];
const SNAKE_NAMES = ['Slither', 'Jade', 'Fang', 'Viper'];

export function SpawnPanel() {
    const {
        spawnSpecies,
        setSpawnSpecies,
        spawnPersonality,
        setSpawnPersonality,
        currentTool,
        setCurrentTool,
        stats,
    } = useGameStore();

    const [customName, setCustomName] = useState('');

    const getRandomName = (species: SpeciesId): string => {
        let names = RAT_NAMES;
        switch (species) {
            case 'cat': names = CAT_NAMES; break;
            case 'chicken': names = CHICKEN_NAMES; break;
            case 'smallBird': names = BIRD_NAMES; break;
            case 'raccoon': names = RACCOON_NAMES; break;
            case 'crow': names = CROW_NAMES; break;
            case 'dog': names = DOG_NAMES; break;
            case 'fox': names = FOX_NAMES; break;
            case 'hawk': names = HAWK_NAMES; break;
            case 'wolf': names = WOLF_NAMES; break;
            case 'snake': names = SNAKE_NAMES; break;
        }
        const baseName = names[Math.floor(Math.random() * names.length)];
        return `${baseName}${Math.floor(Math.random() * 100)}`;
    };

    const handleQuickSpawn = async () => {
        const { godPower, spendGodPower, useServer } = useGameStore.getState();

        const name = customName || getRandomName(spawnSpecies);
        const pos: TilePos = {
            tx: Math.floor(50 + Math.random() * 100),
            ty: Math.floor(50 + Math.random() * 100),
        };

        const cost = COSTS[spawnSpecies];

        if (godPower < cost) {
            return;
        }

        spendGodPower(cost);

        if (useServer) {
            // Convert tile pos back to pixels or just send tile pos?
            // The server API expects x, y in pixels (based on WorldServer.ts: Math.floor(x / V1.tileSizePx))
            const res = await ServerClient.getInstance().spawnAnimal(
                spawnSpecies,
                pos.tx * V1.tileSizePx,
                pos.ty * V1.tileSizePx
            );
            if (!res.ok) {
                console.warn('Server Quick Spawn Failed:', res.error);
            }
        } else {
            const worker = getSimWorker();
            if (!worker) return;

            worker.postMessage({
                type: 'SPAWN_ENTITY',
                payload: { species: spawnSpecies, name, personality: spawnPersonality, pos },
            });
        }

        setCustomName('');
    };

    const handleStartPlacement = () => {
        setCurrentTool('spawn');
    };

    // V1.1 Costs
    const COSTS: Record<SpeciesId, number> = {
        rat: 10,
        cat: 50,
        chicken: 20,
        smallBird: 15,
        raccoon: 35,
        crow: 15,
        dog: 60,
        fox: 40,
        hawk: 45,
        wolf: 70,
        snake: 30,
    };

    const canAfford = (species: SpeciesId) => useGameStore.getState().godPower >= COSTS[species];


    // V1 Fishbowl: Show density target max as "cap" for UI
    const getCap = (species: SpeciesId) => V1.densityTargets[species]?.max || 0; // Added fallback for safety

    return (
        <div className="panel spawn-panel">
            <div className="panel-header">
                <span className="panel-icon">🐾</span>
                <h3>Spawn Animals</h3>
            </div>

            <div className="panel-body">
                {/* Species Selection */}
                <div className="form-group">
                    <label>Select Species</label>
                    <div className="species-buttons">
                        <button
                            className={`species-btn ${spawnSpecies === 'rat' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('rat')}
                            disabled={!canAfford('rat')}
                            style={{ opacity: canAfford('rat') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐭</span>
                            <span>Rat (10GP)</span>
                            <span className="count">{stats.rat}/{getCap('rat')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'cat' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('cat')}
                            disabled={!canAfford('cat')}
                            style={{ opacity: canAfford('cat') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐱</span>
                            <span>Cat (50GP)</span>
                            <span className="count">{stats.cat}/{getCap('cat')}</span>
                        </button>

                        <button
                            className={`species-btn ${spawnSpecies === 'chicken' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('chicken')}
                            disabled={!canAfford('chicken')}
                            style={{ opacity: canAfford('chicken') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐔</span>
                            <span>Chicken (20GP)</span>
                            <span className="count">{stats.chicken}/{getCap('chicken')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'smallBird' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('smallBird')}
                            disabled={!canAfford('smallBird')}
                            style={{ opacity: canAfford('smallBird') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐦</span>
                            <span>Bird (15GP)</span>
                            <span className="count">{stats.smallBird}/{getCap('smallBird')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'raccoon' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('raccoon')}
                            disabled={!canAfford('raccoon')}
                            style={{ opacity: canAfford('raccoon') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🦝</span>
                            <span>Raccoon (35GP)</span>
                            <span className="count">{stats.raccoon}/{getCap('raccoon')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'crow' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('crow')}
                            disabled={!canAfford('crow')}
                            style={{ opacity: canAfford('crow') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐦‍⬛</span>
                            <span>Crow (15GP)</span>
                            <span className="count">{stats.crow}/{getCap('crow')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'dog' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('dog')}
                            disabled={!canAfford('dog')}
                            style={{ opacity: canAfford('dog') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐕</span>
                            <span>Dog (60GP)</span>
                            <span className="count">{stats.dog}/{getCap('dog')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'fox' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('fox')}
                            disabled={!canAfford('fox')}
                            style={{ opacity: canAfford('fox') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🦊</span>
                            <span>Fox (40GP)</span>
                            <span className="count">{stats.fox || 0}/{getCap('fox')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'hawk' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('hawk')}
                            disabled={!canAfford('hawk')}
                            style={{ opacity: canAfford('hawk') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🦅</span>
                            <span>Hawk (45GP)</span>
                            <span className="count">{stats.hawk || 0}/{getCap('hawk')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'wolf' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('wolf')}
                            disabled={!canAfford('wolf')}
                            style={{ opacity: canAfford('wolf') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐺</span>
                            <span>Wolf (70GP)</span>
                            <span className="count">{stats.wolf || 0}/{getCap('wolf')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'snake' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('snake')}
                            disabled={!canAfford('snake')}
                            style={{ opacity: canAfford('snake') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐍</span>
                            <span>Snake (30GP)</span>
                            <span className="count">{stats.snake || 0}/{getCap('snake')}</span>
                        </button>
                    </div>
                </div>

                {/* Name Input */}
                <div className="form-group">
                    <label>Name (Optional)</label>
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={getRandomName(spawnSpecies)}
                        maxLength={12}
                    />
                </div>

                {/* Personality Selection */}
                <div className="form-group">
                    <label>Personality</label>
                    <div className="personality-buttons">
                        <button
                            className={`personality-btn ${spawnPersonality === 'curious' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('curious')}
                            title="Loves exploring new areas, more proactive at finding resources"
                        >
                            🔍 Curious
                        </button>
                        <button
                            className={`personality-btn ${spawnPersonality === 'cautious' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('cautious')}
                            title="More likely to flee, prefers staying near shelter"
                        >
                            🛡️ Cautious
                        </button>
                        <button
                            className={`personality-btn ${spawnPersonality === 'brave' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('brave')}
                            title="Less likely to flee, bolder when foraging"
                        >
                            ⚔️ Brave
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button className="btn-primary" onClick={handleQuickSpawn}>
                        ✨ Quick Spawn
                    </button>
                    <button
                        className={`btn-secondary ${currentTool === 'spawn' ? 'active' : ''}`}
                        onClick={handleStartPlacement}
                    >
                        📍 Click Map to Place
                    </button>
                </div>

                {/* Tips */}
                <div className="panel-tips">
                    <p>💡 Tips:</p>
                    <ul>
                        <li>Rats forage from trash piles, flee from cats</li>
                        <li>Cats hunt rats, need water to drink</li>
                        <li>Each species has a population cap</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
