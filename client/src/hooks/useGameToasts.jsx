import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * useGameToasts — fires rich custom toasts on game state changes.
 * Call inside GameHub where you have access to both gameState and the user.
 */
export function useGameToasts({ gameState, user }) {
  const { status, winners, result, winningCategory } = gameState;
  const prevStatusRef = useRef(null);

  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === status) return;
    prevStatusRef.current = status;

    if (status === 'RESULT' && winners?.length > 0) {
      const myResult = winners.find((w) => w.username === user?.username);

      if (myResult?.won) {
        // ── WIN toast ─────────────────────────────
        toast.custom(
          (t) => (
            <div
              onClick={() => toast.dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
                border: '1px solid #16a34a',
                borderRadius: '16px', padding: '14px 18px',
                boxShadow: '0 0 24px rgba(22,163,74,0.35)',
                cursor: 'pointer', color: '#fff',
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? 'translateY(0)' : 'translateY(-16px)',
                transition: 'all 0.25s ease',
                minWidth: '280px',
              }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1 }}>🏆</span>
              <div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '2px' }}>You Won!</p>
                <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '18px' }}>
                  +{Math.round(myResult.payout).toLocaleString()} Credits
                </p>
                <p style={{ color: '#86efac', fontSize: '11px' }}>
                  {winningCategory?.replace('_7', ' 7') ?? ''} · Wheel landed on {result}
                </p>
              </div>
            </div>
          ),
          { duration: 5000, position: 'top-center' }
        );

      } else if (myResult && myResult.refund > 0) {
        // ── REFUND toast ──────────────────────────
        toast.custom(
          (t) => (
            <div
              onClick={() => toast.dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'linear-gradient(135deg, #0c1a3d 0%, #1e3a8a 100%)',
                border: '1px solid #3b82f6',
                borderRadius: '16px', padding: '14px 18px',
                boxShadow: '0 0 24px rgba(59,130,246,0.25)',
                cursor: 'pointer', color: '#fff',
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? 'translateY(0)' : 'translateY(-16px)',
                transition: 'all 0.25s ease',
                minWidth: '260px',
              }}
            >
              <RotateCcw size={28} className="text-blue-400 shrink-0" />
              <div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '2px' }}>Refunded!</p>
                <p style={{ color: '#93c5fd', fontWeight: 700, fontSize: '16px' }}>
                  +{Math.round(myResult.refund).toLocaleString()} Credits returned
                </p>
                <p style={{ color: '#bfdbfe', fontSize: '11px' }}>No winners — 90% refunded</p>
              </div>
            </div>
          ),
          { duration: 4000, position: 'top-center' }
        );

      } else if (myResult && !myResult.won) {
        // ── LOSE toast ────────────────────────────
        toast.custom(
          (t) => (
            <div
              onClick={() => toast.dismiss(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'linear-gradient(135deg, #1c0606 0%, #450a0a 100%)',
                border: '1px solid #dc2626',
                borderRadius: '16px', padding: '14px 18px',
                cursor: 'pointer', color: '#fff',
                opacity: t.visible ? 1 : 0,
                transform: t.visible ? 'translateY(0)' : 'translateY(-16px)',
                transition: 'all 0.25s ease',
                minWidth: '260px',
              }}
            >
              <span style={{ fontSize: '28px', lineHeight: 1 }}>😬</span>
              <div>
                <p style={{ fontWeight: 800, fontSize: '15px', marginBottom: '2px' }}>Better luck next time</p>
                <p style={{ color: '#fca5a5', fontSize: '12px' }}>
                  Wheel: {result} · {winningCategory?.replace('_7', ' 7') ?? ''}
                </p>
              </div>
            </div>
          ),
          { duration: 3000, position: 'top-center' }
        );
      }
    }

    if (status === 'SPINNING') {
      toast('🎰 The wheel is spinning!', {
        icon: '🌀',
        duration: 2500,
        style: {
          background: '#111118',
          color: '#e2e8f0',
          border: '1px solid #c44ff0',
          borderRadius: '12px',
        },
      });
    }
  }, [status]); // eslint-disable-line
}
