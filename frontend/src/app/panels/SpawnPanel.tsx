// ============================================
// V1 Animal Spawn Panel
// ============================================

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import type { SpeciesId } from '@shared/types';
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

// All tips pool - rotates randomly each time panel opens
const ALL_TIPS = [
    // Gameplay tips
    "🐭 Rats forage from trash piles and flee from cats",
    "🐱 Cats hunt rats and small birds, need water to drink",
    "🦝 Raccoons are nocturnal scavengers, raid trash at night",
    "🐔 Chickens forage from bushes and are hunted by foxes",
    "🐍 Snakes ambush small prey like rats and birds",
    "🦅 Hawks dive-bomb from above, hunt rats and small birds",
    "🐺 Wolves hunt in packs and target larger prey",
    "🦊 Foxes are opportunistic hunters of chickens and rats",
    "🐕 Dogs patrol territory and bark at intruders",
    "🐦 Small birds forage from bushes and perch on trees",
    // Personality explanations
    "🔍 Curious pets explore more and find resources faster",
    "🛡️ Cautious pets flee earlier and stay near shelter",
    "⚔️ Brave pets are bolder and less likely to run",
    // Game mechanics
    "💡 Each species has a population cap to balance ecosystem",
    "💡 Animals reproduce naturally when well-fed and rested",
    "💡 Predators keep prey populations in check",
    "💡 Water and food sources regenerate over time",
    "💡 Animals get random personalities when spawned",
];

export function SpawnPanel() {
    const {
        spawnSpecies,
        setSpawnSpecies,
        spawnName,
        setSpawnName,
        currentTool,
        setCurrentTool,
        stats,
        togglePanel,
    } = useGameStore();

    // Select 2 random tips each time the component mounts
    const randomTips = useMemo(() => {
        const shuffled = [...ALL_TIPS].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 2);
    }, []);

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

    const handleTogglePlacement = () => {
        // Toggle: if already in spawn mode, go back to select; otherwise enter spawn mode
        setCurrentTool(currentTool === 'spawn' ? 'select' : 'spawn');
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
                <button className="panel-close-btn" onClick={() => togglePanel('spawn')}>×</button>
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
                        value={spawnName}
                        onChange={(e) => setSpawnName(e.target.value)}
                        placeholder={getRandomName(spawnSpecies)}
                        maxLength={12}
                    />
                </div>

                {/* Action Buttons - Simplified UX */}
                <div className="action-buttons">
                    <button
                        className={`btn-placement ${currentTool === 'spawn' ? 'active' : ''}`}
                        onClick={handleTogglePlacement}
                    >
                        {currentTool === 'spawn' ? (
                            <>🎯 Placing Mode ON - Click map to spawn</>
                        ) : (
                            <>📍 Enable Place Mode</>
                        )}
                    </button>
                    {currentTool === 'spawn' && (
                        <p className="placement-hint">Click anywhere on the map to spawn. Press ESC or click again to exit.</p>
                    )}
                </div>

                {/* Rotating Tips */}
                <div className="panel-tips">
                    <p>💡 Did you know?</p>
                    <ul>
                        {randomTips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
