// ============================================
// GameCanvas - Phaser 3 渲染容器
// ============================================

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WorldScene } from '@game/scenes/WorldScene';
import { useGameStore } from '../store/gameStore';

export function GameCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const gameRef = useRef<Phaser.Game | null>(null);

    useEffect(() => {
        if (!containerRef.current || gameRef.current) return;

        const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            parent: containerRef.current,
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: '#1a1a2e',
            scene: [WorldScene],
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { x: 0, y: 0 },
                    debug: false,
                },
            },
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH,
            },
            render: {
                pixelArt: true,
                antialias: false,
            },
        };

        gameRef.current = new Phaser.Game(config);

        return () => {
            gameRef.current?.destroy(true);
            gameRef.current = null;
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
            }}
        />
    );
}
