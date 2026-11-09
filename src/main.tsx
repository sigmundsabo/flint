import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { isLocalMode } from './data'
import { seedLocalStoreIfEmpty } from './data/localSnapshot'
import './index.css'

/**
 * A peremen megtörő fény (`#liquid-glass` szűrő) bekapcsolása.
 *
 * A `backdrop-filter: url(#…)` csak Chromiumban működik: a WebKit hibajegye
 * 2022 óta nyitott, és a Gecko sem tudja. A `@supports` itt NEM használható,
 * mert az csak azt nézi, ÉRTELMEZHETŐ-e a érték — a Safari értelmezi, aztán
 * nem csinál vele semmit, és közben a mellette lévő blurt is elveszítenénk.
 *
 * Ezért a motor a kapu: a `navigator.userAgentData` csak Chromiumban létezik.
 * Ha nincs, nem történik semmi, és marad a tiszta CSS-üveg — ami önmagában is
 * kész felület, nem csonk.
 */
if ('userAgentData' in navigator) {
  document.documentElement.dataset.glass = 'refract'
}

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

// Helyi módban a render előtt feltöltjük a tárolót a kimentett előzményből,
// hogy az app ne egy pillanatra üres képernyővel induljon. Csak egyszer fut:
// ha már van adat, a seed azonnal kilép.
if (isLocalMode) {
  void seedLocalStoreIfEmpty().finally(render)
} else {
  render()
}
