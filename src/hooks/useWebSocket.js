import { useState, useEffect, useCallback, useRef } from 'react';
import { getWsUrl } from '../config/apiConfig';

/**
 * Custom React hook for WebSocket connection to the studio server.
 * Provides real-time generation progress updates for the QUEUE tab.
 */
export function useWebSocket(url = getWsUrl()) {
    const [isConnected, setIsConnected] = useState(false);
    const [tasks, setTasks] = useState({});
    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('[WS] Connected to studio server');
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === 'progress') {
                        setTasks(prev => ({
                            ...prev,
                            [msg.taskId]: {
                                step: msg.step,
                                total: msg.total,
                                message: msg.message,
                                timestamp: Date.now(),
                            }
                        }));
                    }

                    if (msg.type === 'complete') {
                        setTasks(prev => {
                            const next = { ...prev };
                            delete next[msg.taskId];
                            return next;
                        });
                    }
                } catch (err) {
                    console.warn('[WS] Failed to parse message:', err);
                }
            };

            ws.onclose = () => {
                console.log('[WS] Disconnected');
                setIsConnected(false);
                // Reconnect after 3 seconds
                reconnectTimer.current = setTimeout(connect, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch (err) {
            console.warn('[WS] Connection failed:', err);
            reconnectTimer.current = setTimeout(connect, 3000);
        }
    }, [url]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    return { isConnected, tasks };
}
