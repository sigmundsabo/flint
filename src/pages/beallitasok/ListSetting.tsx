// A Beállítások oldal egy darabja. A lap 628 soros volt — egyetlen
// fájlban kilenc, egymástól független beállítás-csoporttal. Szétszedve
// mindegyik a saját nevén kereshető, és egy módosítás nem görget át a
// többi nyolcon.

import { Card, SectionTitle } from '@/components/Card'
import { Icon } from '@/components/Icon'
import { useState } from 'react'

export function ListSetting({
  title, hint, items, onChange,
}: { title: string; hint: string; items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('')
  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-[12.5px] text-ink-faint">{hint}</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 rounded-full bg-white/6 py-1.5 pr-1.5 pl-3 text-[13px]"
            >
              {item}
              <button
                type="button"
                aria-label={`${item} eltávolítása`}
                onClick={() => onChange(items.filter((i) => i !== item))}
                className="press grid size-7 place-items-center rounded-full text-ink-faint"
              >
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Új elem"
            aria-label={`${title} — új elem`}
            className="h-11 flex-1 rounded-2xl border border-[var(--color-line)] bg-white/4 px-3.5 text-[16px] outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            disabled={!draft.trim() || items.includes(draft.trim())}
            onClick={() => {
              onChange([...items, draft.trim()])
              setDraft('')
            }}
            className="press btn-quiet h-11 px-5 text-[14px] disabled:opacity-40"
          >
            Hozzáad
          </button>
        </div>
      </Card>
    </section>
  )
}
