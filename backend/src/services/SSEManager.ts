import { Response } from 'express';

/**
 * Simulation event types (from shared types)
 */
export type SimEvent =
    | { type: 'DEATH'; tick: number; entityId: string; reason: string; killedBy?: string; location?: { x: number; y: number }; subjectName?: string }
    | { type: 'BIRTH'; tick: number; entityId: string; parentId: string; location?: { x: number; y: number }; subjectName?: string }
    | { type: 'HUNT'; tick: number; predatorId: string; preyId: string; location?: { x: number; y: number }; subjectName?: string; targetName?: string }
    | { type: 'DRINK'; tick: number; entityId: string; waterId: string; location?: { x: number; y: number }; subjectName?: string }
    | { type: 'EAT'; tick: number; entityId: string; source: 'prey' | 'trash'; location?: { x: number; y: number }; subjectName?: string; targetName?: string }
    | { type: 'GENERIC'; tick: number; message: string; importance: string; location?: { x: number; y: number } };

/**
 * SSE Client connection
 */
interface SSEClient {
    id: string;
    playerId?: string;
    res: Response;
    connectedAt: number;
    lastHeartbeat: number;
    viewport?: {
        x: number;
        y: number;
        radius: number;
    };
}

/**
 * SSE Manager - Manages Server-Sent Events connections
 */
export class SSEManager {
    private clients: Map<string, SSEClient> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
    private readonly MAX_CLIENTS = 100;

    constructor() {
        this.startHeartbeat();
    }

    /**
     * Add a new SSE client connection
     */
    addClient(id: string, res: Response, playerId?: string): void {
        // Check client limit
        if (this.clients.size >= this.MAX_CLIENTS) {
            console.warn(`⚠️  SSE client limit reached (${this.MAX_CLIENTS}), rejecting connection`);
            res.status(503).json({ error: 'Too many connections' });
            return;
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx

        // Store client
        const client: SSEClient = {
            id,
            playerId,
            res,
            connectedAt: Date.now(),
            lastHeartbeat: Date.now(),
        };

        this.clients.set(id, client);

        console.log(`✅ SSE client connected: ${id}${playerId ? ` (player: ${playerId})` : ''} (total: ${this.clients.size})`);

        // Send initial connection event
        this.sendToClient(id, {
            type: 'GENERIC',
            tick: 0,
            message: 'Connected to event stream',
            importance: 'C',
        });

        // Handle client disconnect
        res.on('close', () => {
            this.removeClient(id);
        });
    }

    /**
     * Remove a client connection
     */
    removeClient(id: string): void {
        const client = this.clients.get(id);
        if (client) {
            this.clients.delete(id);
            console.log(`🔌 SSE client disconnected: ${id} (total: ${this.clients.size})`);
        }
    }

    /**
     * Update client viewport (for proximity filtering)
     */
    updateClientViewport(id: string, x: number, y: number, radius: number): void {
        const client = this.clients.get(id);
        if (client) {
            client.viewport = { x, y, radius };
        }
    }

    /**
     * Send event to specific client
     */
    sendToClient(clientId: string, event: SimEvent): void {
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }

        try {
            const data = JSON.stringify(event);
            client.res.write(`data: ${data}\n\n`);
            client.lastHeartbeat = Date.now();
        } catch (error: any) {
            console.error(`Error sending event to client ${clientId}:`, error.message);
            this.removeClient(clientId);
        }
    }

    /**
     * Broadcast event to all clients
     */
    broadcast(event: SimEvent): void {
        for (const [clientId, client] of this.clients) {
            // Apply proximity filtering if viewport is set
            if (client.viewport && event.location) {
                if (!this.isEventInViewport(event, client.viewport)) {
                    continue;
                }
            }

            this.sendToClient(clientId, event);
        }
    }

    /**
     * Broadcast event to specific player
     */
    broadcastToPlayer(playerId: string, event: SimEvent): void {
        for (const [clientId, client] of this.clients) {
            if (client.playerId === playerId) {
                this.sendToClient(clientId, event);
            }
        }
    }

    /**
     * Check if event is within client's viewport
     */
    private isEventInViewport(
        event: SimEvent,
        viewport: { x: number; y: number; radius: number }
    ): boolean {
        if (!event.location) {
            return true; // Include events without location
        }

        const dx = event.location.x - viewport.x;
        const dy = event.location.y - viewport.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= viewport.radius;
    }

    /**
     * Send heartbeat to all clients
     */
    private sendHeartbeat(): void {
        const now = Date.now();
        const heartbeatEvent: SimEvent = {
            type: 'GENERIC',
            tick: 0,
            message: 'heartbeat',
            importance: 'C',
        };

        for (const [clientId] of this.clients) {
            this.sendToClient(clientId, heartbeatEvent);
        }

        // Clean up stale connections
        for (const [clientId, client] of this.clients) {
            if (now - client.lastHeartbeat > this.HEARTBEAT_INTERVAL_MS * 2) {
                console.warn(`⚠️  Removing stale SSE client: ${clientId}`);
                this.removeClient(clientId);
            }
        }
    }

    /**
     * Start heartbeat timer
     */
    private startHeartbeat(): void {
        if (!this.heartbeatInterval) {
            this.heartbeatInterval = setInterval(() => {
                this.sendHeartbeat();
            }, this.HEARTBEAT_INTERVAL_MS);
        }
    }

    /**
     * Stop heartbeat timer
     */
    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Get number of connected clients
     */
    getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Get client info
     */
    getClientInfo(): Array<{ id: string; playerId?: string; connectedAt: number }> {
        return Array.from(this.clients.values()).map(client => ({
            id: client.id,
            playerId: client.playerId,
            connectedAt: client.connectedAt,
        }));
    }

    /**
     * Cleanup all connections
     */
    cleanup(): void {
        this.stopHeartbeat();
        for (const [clientId] of this.clients) {
            this.removeClient(clientId);
        }
    }
}

// Singleton instance
let sseManagerInstance: SSEManager | null = null;

export function getSSEManager(): SSEManager {
    if (!sseManagerInstance) {
        sseManagerInstance = new SSEManager();
    }
    return sseManagerInstance;
}
