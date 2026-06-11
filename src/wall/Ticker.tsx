import { useEvents, eventText } from '../lib/useEvents'

const BIG_ACTIONS = ['block1.surge', 'block2.breach', 'block1.slain', 'plate.adjust', 'plate.retired', 'dragon.call', 'block3.scar']

export default function Ticker() {
  const events = useEvents()
  const shown = events.filter((e) => e.ticker).slice(0, 8)
  return (
    <div className="ticker">
      {shown.map((e, i) => (
        <div
          key={e.id}
          className={`ticker-item ${i === 0 ? 'ticker-new' : ''} ${BIG_ACTIONS.includes(e.action) ? 'ticker-big' : ''}`}
          style={{ opacity: 1 - i * 0.11 }}
        >
          <span className="ticker-gm">{e.gm}</span> {eventText(e)}
        </div>
      ))}
    </div>
  )
}
