/* ══════════════════════════════════════════════════════
   SubTrack — Integrate: WebSocket Hook
   Manages Playwright script WebSocket lifecycle.
   Owns terminal output, running state, and results.
   ══════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { WsMessage, TerminalLine } from '../integrate.types';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [needsInput, setNeedsInput] = useState(false);
  const [scriptResult, setScriptResult] = useState<Record<string, unknown> | null>(null);
  const [capturedToken, setCapturedToken] = useState('');

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  // Cleanup on unmount
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const connect = useCallback((executionId: string, scriptId?: string) => {
    setTerminalLines([]);
    setScriptResult(null);
    setCapturedToken('');
    setNeedsInput(false);
    setRunning(true);

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(
      `${wsProtocol}://${window.location.hostname}:8000/ws/script/${scriptId || '_inline'}/${executionId}`
    );
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WsMessage;
      switch (msg.type) {
        case 'output':
          setTerminalLines(prev => [...prev, { text: msg.text || '', stream: msg.stream || 'stdout' }]);
          if (msg.needs_input) setNeedsInput(true);
          break;
        case 'status':
          setTerminalLines(prev => [...prev, { text: `[${msg.message}]`, stream: 'status' }]);
          break;
        case 'complete': {
          setTerminalLines(prev => [...prev, { text: '✓ Script completed successfully', stream: 'status' }]);
          if (msg.result && typeof msg.result === 'object') {
            const result = msg.result as Record<string, unknown>;
            setScriptResult(result);
            const token = (result.token as string) || (result.Token as string) || (result.authorization as string) || '';
            if (token) setCapturedToken(token);
          }
          setRunning(false);
          setNeedsInput(false);
          break;
        }
        case 'error':
          setTerminalLines(prev => [...prev, { text: `✗ ${msg.message}`, stream: 'stderr' }]);
          if (msg.result && typeof msg.result === 'object') setScriptResult(msg.result as Record<string, unknown>);
          setRunning(false);
          setNeedsInput(false);
          break;
      }
    };

    ws.onerror = () => {
      setTerminalLines(prev => [...prev, { text: '✗ WebSocket connection failed', stream: 'stderr' }]);
      setRunning(false);
    };
    ws.onclose = () => setRunning(false);
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'kill' }));
    wsRef.current?.close();
    setRunning(false);
    setNeedsInput(false);
  }, []);

  const sendInput = useCallback((text: string) => {
    if (!text.trim()) return;
    wsRef.current?.send(JSON.stringify({ type: 'input', text: text.trim() }));
    setTerminalLines(prev => [...prev, { text: `> ${text}`, stream: 'input' }]);
    setNeedsInput(false);
  }, []);

  return {
    terminalLines, running, needsInput,
    scriptResult, capturedToken, setCapturedToken,
    terminalRef,
    connect, stop, sendInput,
  };
}
