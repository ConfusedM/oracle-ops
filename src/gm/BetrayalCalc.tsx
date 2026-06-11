import { useState } from 'react'
import { betrayalStats } from '../lib/rules'

export default function BetrayalCalc() {
  const [units, setUnits] = useState(0)
  const s = betrayalStats(units)
  return (
    <div className="tab">
      <div className="panel-sub">BETRAYAL CONVERSION — count everything held: embers (bright or withered), Taken Advantages, grey items</div>
      <div className="calc-units">
        <button className="btn" onClick={() => setUnits(Math.max(0, units - 1))}>−</button>
        <div className="calc-units-value">{units}<span> units</span></div>
        <button className="btn" onClick={() => setUnits(units + 1)}>+</button>
      </div>
      <div className="calc-grid">
        <div className="calc-stat"><div>every d20 roll</div><b>+{s.d20}</b></div>
        <div className="calc-stat"><div>spell save DC</div><b>+{s.saveDC}</b></div>
        <div className="calc-stat"><div>every damage roll</div><b>+{s.damage}</b></div>
        <div className="calc-stat"><div>max &amp; current HP</div><b>+{s.hp}</b></div>
      </div>
      <div className="calc-notes">
        <p><b>Burning a stack:</b> an ally gifts a NEW bright ember, eyes open, naming it — the turncoat saves Wis or Cha against <b>their own spell save DC</b>. Fail = one stack gone forever. Once per ally, per turncoat.</p>
        <p><b>0 HP:</b> not dying — the grey burns OUT. Expelled, stable, themselves, stripped of stacks.</p>
        <p><b>Come home:</b> burn all remaining stacks voluntarily — drop to half original max HP, turn back.</p>
        <p><b>Second betrayal:</b> each genuine turn-of-coat after the first grants +1 fresh stack. Adjacent to the vessel: DRINK THE PLATE — Plate −3, +1 stack.</p>
      </div>
    </div>
  )
}
