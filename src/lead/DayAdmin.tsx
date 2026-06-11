import { SEED } from '../lib/types'
import { resetNamespace, resetDay, exportLogCsv } from '../lib/actions'

export default function DayAdmin({ gm }: { gm: string }) {
  const download = async () => {
    const csv = await exportLogCsv()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `oracle-ops-tally-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }
  return (
    <div className="tab">
      <div className="panel-sub">THE TALLY</div>
      <button className="btn" onClick={download}>⬇ EXPORT EVENT LOG (CSV)</button>

      <div className="panel-sub">RESETS (careful)</div>
      <div className="btn-col">
        {Object.keys(SEED).map((key) => (
          <button key={key} className="btn btn-dark" onClick={() => {
            if (confirm(`Reset "${key}" to its starting state?`)) resetNamespace(gm, key)
          }}>
            RESET {key.toUpperCase()}
          </button>
        ))}
        <button className="btn btn-dark" onClick={() => {
          if (prompt('This resets EVERYTHING (bowl to 60, all boards, all timers).\nType RESET to confirm:') === 'RESET') resetDay(gm)
        }}>
          ⚠ RESET THE ENTIRE DAY
        </button>
      </div>

      <div className="panel-sub">SETUP NOTES</div>
      <div className="muted">
        TVs: open <b>/#/wall</b>, press F11 for fullscreen, tap ENABLE AUDIO once.<br />
        GMs: open <b>/#/gm</b> on your phone, pick your name.<br />
        Lead: this page (<b>/#/lead</b>). Nothing needs a password — just don't put this URL on a TV.
      </div>
    </div>
  )
}
