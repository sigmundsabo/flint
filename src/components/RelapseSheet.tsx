import { useState } from 'react'
import { Sheet } from './Sheet'
import { HoldToConfirm } from './HoldToConfirm'
import { Icon } from './Icon'
import { RELAPSE_CONFIRM } from '@/domain/relapse'
import { useAppData } from '@/hooks/useAppData'
import { useToast } from './Toast'
import { formatDateHu } from '@/lib/date'

interface Props {
  open: boolean
  dateKey: string
  onClose: () => void
}

/**
 * 14-szokasok-trendek-ui.md — a dialógus kimondja, hogy a művelet az aznapi
 * ÖSSZES adatot törli. Az Opal "Hold to Leave" mintáját követve nyomva tartás
 * kell hozzá: egy véletlen koppintás nem elég egy visszafordíthatatlan törléshez.
 */
export function RelapseSheet({ open, dateKey, onClose }: Props) {
  const { relapse, scoreFor } = useAppData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const score = scoreFor(dateKey)

  const run = async () => {
    if (busy) return
    setBusy(true)
    try {
      await relapse(dateKey)
      toast.show('Relapszus rögzítve — az aznapi adatok törölve.', 'info')
      onClose()
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'A művelet nem sikerült.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={RELAPSE_CONFIRM.title} tone="danger">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: 'rgba(226,115,133,0.16)', color: 'var(--color-bad)' }}
          >
            <Icon name="triangle-alert" size={22} />
          </span>
          <div>
            <p className="text-[15px] leading-snug font-medium">{RELAPSE_CONFIRM.body}</p>
            <p className="mt-2 text-[13px] text-ink-soft">{RELAPSE_CONFIRM.detail}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white/4 p-4">
          <p className="mb-1 text-[12.5px] tracking-wide text-ink-faint uppercase">Érintett nap</p>
          <p className="text-[15px] font-semibold">{formatDateHu(dateKey)}</p>
          <p className="num mt-2 text-[13px] text-ink-soft">
            Jelenlegi pontszám: {score.pct}% · {score.completedCount}/{score.applicableCount} szokás
            <span className="mx-1.5 text-ink-faint">→</span>
            <span style={{ color: 'var(--color-bad)' }}>0%</span>
          </p>
        </div>

        <HoldToConfirm
          label={RELAPSE_CONFIRM.confirmLabel}
          holdingLabel="Tartsd még…"
          onConfirm={() => void run()}
          disabled={busy}
        />

        <button
          type="button"
          onClick={onClose}
          className="press btn-quiet h-12 w-full text-[15px]"
        >
          {RELAPSE_CONFIRM.cancelLabel}
        </button>
      </div>
    </Sheet>
  )
}
