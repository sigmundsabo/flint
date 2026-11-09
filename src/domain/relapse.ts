// 11-quit-reset-fogmosas-kivetel.md
//
// DESTRUKTÍV MŰVELET. A Leszokás relapszus nem csak a Leszokás streaket nullázza, hanem
// az adott nap ÖSSZES habit-logját törli. Ez szándékos önkontroll-mechanizmus,
// nem hiba — a viselkedés nincs lágyítva.
//
// A megerősítő dialógus a UI-réteg felelőssége. Ez a függvény már csak akkor
// hívódik meg, ha a felhasználó megerősítette.

/** Adat-hozzáférési műveletek, amiket a reset igényel. Injektálva → tesztelhető. */
export interface RelapseResetDeps {
  /** Törli az adott NAP összes habit-logját. Visszaadja a törölt sorok számát. */
  deleteHabitLogsForDate(dateKey: string): Promise<number>
  /** Törli az adott nap kiegészítő-pipáit is (ezek is aznapra rögzített szokások). */
  deleteSupplementLogsForDate(dateKey: string): Promise<number>
  /** Beírja a Leszokás logot `done = false`-ra az adott napra. */
  setHabitLog(input: { habitId: string; dateKey: string; done: boolean }): Promise<void>
}

export interface RelapseResetSummary {
  dateKey: string
  deletedHabitLogs: number
  deletedSupplementLogs: number
}

/**
 * Végrehajtja a relapszus-resetet EGYETLEN napra.
 *
 * Sorrend számít: előbb törlünk mindent, utána írjuk vissza a Leszokás `false`
 * bejegyzést — így a Leszokás-nap ténye megmarad a streak-előzményben, miközben az
 * aznapi többi teljesítés eltűnik.
 *
 * Korábbi napokat SOHA nem érint.
 */
export async function triggerRelapseReset(
  dateKey: string,
  quitHabitId: string,
  deps: RelapseResetDeps,
): Promise<RelapseResetSummary> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`triggerRelapseReset: érvénytelen dátum (${dateKey})`)
  }

  const deletedHabitLogs = await deps.deleteHabitLogsForDate(dateKey)
  const deletedSupplementLogs = await deps.deleteSupplementLogsForDate(dateKey)
  await deps.setHabitLog({ habitId: quitHabitId, dateKey, done: false })

  return { dateKey, deletedHabitLogs, deletedSupplementLogs }
}

/** A megerősítő dialógus szövege — a művelet tétjét egyértelműen kimondja. */
export const RELAPSE_CONFIRM = {
  title: 'Relapszus rögzítése',
  body:
    'Ez nem csak a Leszokás streaket nullázza. Az adott nap ÖSSZES bepipált szokása ' +
    'és rögzített értéke törlődik — a napi pontszám 0%-ra esik.',
  detail: 'A korábbi napok érintetlenül maradnak. A művelet nem vonható vissza.',
  confirmLabel: 'Igen, rögzítem',
  cancelLabel: 'Mégsem',
} as const
