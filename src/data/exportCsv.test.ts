import { describe, it, expect } from 'vitest'
import { habitLogsCsv, healthMetricsCsv, weightLogsCsv } from './exportCsv'
import { makeHabit, makeLog } from '@/domain/testFactories'

describe('habitLogsCsv', () => {
  it('feloldja a habit_id-t névre, és dátum szerint rendez', () => {
    const habits = [makeHabit({ id: 'lepes', type: 'min', name: 'Lépés', unit: 'lépés', target_value: 10000 })]
    const logs = [
      makeLog({ habit_id: 'lepes', date: '2026-08-31', value: 12000 }),
      makeLog({ habit_id: 'lepes', date: '2026-08-29', value: 8000 }),
    ]
    const csv = habitLogsCsv(logs, habits)
    const lines = csv.replace('﻿', '').trim().split('\r\n')
    expect(lines[0]).toBe('datum,szokas,tipus,teljesitve,ertek,idopont,egyseg')
    expect(lines[1]).toBe('2026-08-29,Lépés,min,,8000,,lépés')
    expect(lines[2]).toBe('2026-08-31,Lépés,min,,12000,,lépés')
  })

  it('idézőjelezi a vesszőt tartalmazó mezőket', () => {
    const habits = [makeHabit({ id: 'x', type: 'binary', name: 'Reggeli, kávé' })]
    const csv = habitLogsCsv([makeLog({ habit_id: 'x', date: '2026-08-31', done: true })], habits)
    expect(csv).toContain('"Reggeli, kávé"')
  })

  it('UTF-8 BOM-mal kezdődik, hogy az Excel jól nyissa meg', () => {
    expect(habitLogsCsv([], [])[0]).toBe('﻿')
  })
})

describe('healthMetricsCsv / weightLogsCsv', () => {
  it('üres adathoz is ad fejlécet', () => {
    expect(healthMetricsCsv([]).replace('﻿', '').trim())
      .toBe('datum,lepes,kaloria,alvas_ora,viz_liter,kepernyoido_perc,lefekves')
    expect(weightLogsCsv([]).replace('﻿', '').trim())
      .toBe('datum,idopont,sulykg,megjegyzes')
  })
})
