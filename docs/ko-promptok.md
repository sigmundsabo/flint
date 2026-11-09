# A tíz kő + a tartó — promptok

A tíz kép **ugyanannak a kőnek a tíz állapota**, nem tíz külön kő. Ezen áll vagy
bukik az egész: ha mindegyik más szikla, a felhasználó nem fejlődést lát, hanem
véletlenszerű követ. Ezért két szabály:

1. **A váz szó szerint ugyanaz** minden promptban. Csak a `VÁLTOZÓ RÉSZ` cserélődik.
2. **A 0. kép után mindig az ELŐZŐ elfogadott képet csatold referenciaként.**
   Nem hidegen generálsz tízszer, hanem láncban haladsz: 0 → 1 → 2 → …

Ha egy lépésnél elcsúszik a kő formája, ne fogadd el — pörgesd újra az előző
képből. Egy elrontott lépés az összes utána következőt elviszi.

**Formátum:** álló 3:4, fehér háttér. A fehér háttér szándékos: a feldolgozó
script `--bg=white` módja erre van beállítva.

---

## Váz — ez minden promptba bekerül, változtatás nélkül

```
Studio photograph of a single rough stone, floating alone on a pure white background.

The stone is an irregular, rounded, slightly triangular boulder, a little taller
than it is wide. Dark grey-green weathered rock with a coarse pitted crust and a
few paler mineral streaks.

Camera: straight on, very slightly from above. The stone is centred and fills
about 60% of the frame width, with wide empty white margin on all four sides.

Lighting: soft and even, slightly cool, coming from the upper left.

Background: pure solid white, completely empty. No floor, no surface, no shadow,
no reflection, no gradient.

Photorealistic, sharp throughout, fine mineral surface detail. Portrait 3:4.
```

## Láncoló mondat — az 1. képtől kezdve a váz ELÉ

```
Use the attached image as the reference. Keep the exact same rock: same
silhouette, same surface texture, same camera angle, same lighting, same white
background. Change only what is described below.
```

---

## Változó rész fokozatonként

**0 — üres nap.** Ez az egyetlen, amit hidegen generálsz.
```
The stone is completely closed and dull. No crystal, no glow, no green light
anywhere — just bare weathered rock.
```

**1**
```
A single hairline crack runs across the front of the stone. Deep inside it a
faint green light is barely visible. No crystal has broken the surface yet.
```

**2**
```
The crack has widened into a narrow fissure. A small patch of pale green crystal
is visible inside it, glowing faintly.
```

**3**
```
The fissure is wider and the green crystal inside it is brighter. A soft glow is
just beginning to spill onto the rock around the opening.
```

**4**
```
The fissure is full of glowing green crystal, and the first few small crystal
points have broken through the surface at its edge.
```

**5**
```
A short cluster of green crystal points now grows out of the fissure. Their glow
clearly lights the rock around them.
```

**6**
```
The cluster is larger, with longer crystal blades. Light escapes through the
thinnest parts of the surrounding rock, making them translucent green.
```

**7**
```
The crystal has spread. The main cluster is tall, and smaller crystal points have
broken out elsewhere on the stone. The glow is strong.
```

**8**
```
Crystal now covers most of the front of the stone: a dense field of glowing green
blades, the rock reduced to a dark shell around them. A few tiny crystal motes
float just off the surface.
```

**9 — teljes nap.**
```
The stone has become a blazing crystal cluster. Long, brilliant green crystal
blades fill the front, light pouring out of them, the remaining rock only a thin
dark rim. Tiny bright motes drift in the air around it.
```

---

## A tartó

Külön kép, nem a lánc része. Egyszer kell legenerálni.

```
Studio photograph of a small dark stone plinth, alone on a pure white background.

A low, rough-hewn pedestal of dark grey basalt: a flat round top surface and
slightly tapered sides, wider than it is tall, like a short column cut from cave
rock. The top surface is flat and completely empty — nothing is standing on it.

Camera: straight on, very slightly from above, so a shallow ellipse of the top
surface is visible.

Lighting: soft and cool from the upper left. The top surface catches a little
more light than the sides.

Background: pure solid white, completely empty. No floor, no shadow, no
reflection.

Photorealistic, sharp, fine stone texture. Landscape 3:2, the plinth centred and
filling about 55% of the frame width.
```

---

## Mentés

`~/Downloads/` alá, pontosan ezekkel a nevekkel:

```
ko-0.png  ko-1.png  ko-2.png  …  ko-9.png  tarto.png
```

Nem kell egyszerre mind — ahogy elkészül egy-kettő, szólhatsz, és beteszem őket.
Amíg egy fokozat képe hiányzik, az app a mostani egyetlen kőre esik vissza, tehát
semmi nem törik el félkész állapotban.
