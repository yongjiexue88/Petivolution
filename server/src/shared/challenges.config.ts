import { SimStats, ChallengeDef } from './types';

export const CHALLENGES: ChallengeDef[] = [
    {
        id: 'survival_basics',
        title: 'Survival Basics',
        description: 'Maintain a population of at least 5 rats for 60 seconds.',
        durationSec: 60,
        initialSetup: {
            rats: 5,
            cats: 0,
            resources: ['water', 'bush', 'trash']
        },
        winCondition: (stats: SimStats) => stats.rat >= 5
    },
    {
        id: 'predator_balance',
        title: 'Predator Balance',
        description: 'Keep rats above 10 while having at least 2 cats for 120 seconds.',
        durationSec: 120,
        initialSetup: {
            rats: 20,
            cats: 2,
            resources: ['water', 'bush', 'bush', 'trash', 'trash']
        },
        winCondition: (stats: SimStats) => stats.rat >= 10 && stats.cat >= 2
    },
    {
        id: 'overpopulation_crisis',
        title: 'Overpopulation Crisis',
        description: 'Start with 50 rats. Reduce population to under 20 without going extinct (stay > 0) within 2 minutes.',
        durationSec: 120,
        initialSetup: {
            rats: 50,
            cats: 1,
            resources: ['water']
        },
        winCondition: (stats: SimStats) => stats.rat < 20 && stats.rat > 0,
        failCondition: (stats: SimStats) => stats.rat === 0
    }
];
