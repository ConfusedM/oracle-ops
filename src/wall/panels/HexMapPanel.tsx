import { useGameState } from '../../lib/useGameState'
import { HEXES, HEX_R, VIEW_W, VIEW_H, hexCenter, hexPoints } from './hexGeometry'
import { TEAM_IDS, TEAM_COLORS, HEX_ICON_GLYPHS } from '../../lib/types'
import type { Block3State, TeamId } from '../../lib/types'
import { emberTier } from '../../lib/rules'

export default function HexMapPanel({ interactive, onHexTap }: { interactive?: boolean; onHexTap?: (id: string) => void } = {}) {
  const b3 = useGameState<Block3State>('block3')
  if (!b3) return null

  const teamsAt = (hexId: string): TeamId[] => TEAM_IDS.filter((t) => b3.teams[t] === hexId)
  const flags = TEAM_IDS.flatMap((t) =>
    (b3.embers[t] ?? [])
      .map((e) => ({ ...e, tier: emberTier(e.count), team: t }))
      .filter((e) => e.tier === 'LODESTAR' || e.tier === 'BEARER'),
  )

  return (
    <div className="hexmap-wrap">
      <svg className="hexmap" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <text x={VIEW_W / 2} y={34} className="hexmap-title" textAnchor="middle">THE FOLDED FLESH — B9</text>
        {HEXES.map((h) => {
          const { x, y } = hexCenter(h)
          const hs = b3.hexes[h.id] ?? {}
          const cleared = !!hs.cleared
          const occupants = teamsAt(h.id)
          return (
            <g key={h.id} onClick={interactive ? () => onHexTap?.(h.id) : undefined}
              style={interactive ? { cursor: 'pointer' } : undefined}>
              <polygon
                points={hexPoints(x, y, HEX_R)}
                className={`hex ${cleared ? 'hex-cleared' : 'hex-fog'} ${hs.glow ? 'hex-glow' : ''}`}
                stroke={h.star ? 'var(--gold)' : h.rally ? 'var(--ward-blue)' : 'var(--line)'}
                strokeWidth={h.star || h.rally ? 3 : 1.5}
                strokeDasharray={h.rally ? '6 4' : undefined}
              />
              <text x={x} y={y + (occupants.length ? -8 : 6)} textAnchor="middle"
                className={`hex-id ${cleared ? '' : 'hex-id-fog'}`}>
                {h.id}{h.star ? '★' : ''}
              </text>
              {h.start && !cleared && (
                <text x={x} y={y + 24} textAnchor="middle" className="hex-start">{h.start}</text>
              )}
              {(hs.icons ?? []).map((ic, i) => (
                <text key={ic} x={x - 14 + i * 16} y={y - HEX_R + 24} textAnchor="middle" className="hex-icon">
                  {HEX_ICON_GLYPHS[ic]}
                </text>
              ))}
              {occupants.map((t, i) => (
                <g key={t}>
                  <circle cx={x - ((occupants.length - 1) * 13) / 2 + i * 13} cy={y + 16} r={11}
                    fill={TEAM_COLORS[t]} className="team-marker" />
                  <text x={x - ((occupants.length - 1) * 13) / 2 + i * 13} y={y + 20.5}
                    textAnchor="middle" className="team-marker-label">{t.slice(1)}</text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>
      <div className="hexmap-rail">
        <div className="pulse">
          <div className="pulse-title">THE PULSE</div>
          <div className="pulse-blue">GIVEN {b3.pulse.blue}</div>
          <div className="pulse-grey">TAKEN {b3.pulse.grey}</div>
        </div>
        <div className="immune">
          <div className="immune-title">IMMUNE RESPONSE</div>
          <div className="immune-track">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`immune-seg ${i < b3.immune ? `immune-on immune-l${Math.min(9, i)}` : ''}`} />
            ))}
          </div>
          <div className="immune-value">{b3.immune} / 10</div>
          {b3.immune >= 7 && <div className="immune-warn">HE IS SPEAKING</div>}
          {b3.immune >= 4 && b3.immune < 7 && <div className="immune-warn immune-warn-soft">ANTIBODIES SHADOW</div>}
        </div>
        {flags.length > 0 && (
          <div className="lodestars">
            {flags.map((f) => (
              <div key={f.name} className={`lodestar-flag ${f.tier === 'BEARER' ? 'bearer-flag' : ''}`}>
                {f.tier === 'BEARER' ? '✨' : '🌟'} {f.name} <span style={{ color: TEAM_COLORS[f.team] }}>T{f.team.slice(1)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
