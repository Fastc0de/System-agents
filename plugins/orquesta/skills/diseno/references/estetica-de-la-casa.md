# The house aesthetic

Every orquesta app starts from one visual identity: **warm, editorial and calm**, inspired by the visual language of Anthropic (paper-like warm neutrals, literary serif headings, one earthy accent, generous space, quiet motion). It is the taste of the person who owns this system, so it is the default. It is a starting point, not a uniform: each project makes it its own (section 5), and three directions are always offered so the person chooses (section 6).

**Inspired by, never copied.** Never use Anthropic's or Claude's name, logo, spark/asterisk mark, illustrations or commercial typefaces (Styrene, Tiempos, Copernicus; the token validator rejects them). The app belongs to the person's brand.

**The person's brand wins.** If they bring a logo, colors or typefaces, those lead; the house contributes its principles (sections 1, 3 and 4) and the directions vary layout, type pairing and the signature around their brand.

---

## 1. Principles

1. **Paper, not screen.** The page is a warm off-white (ivory, cream), never pure `#FFFFFF`; white is for raised surfaces (cards, inputs, sheets). Text is a warm near-black, never pure `#000`. Dark mode is warm charcoal, never pure black.
2. **Type does the work.** A serif with character for headings, a clean humanist or grotesque sans for interface and body text. Hierarchy comes from size, weight and space, not from boxes, colors or icons. Big, confident headings in sentence case; comfortable reading measure (≤ 68 characters).
3. **One accent, used with intent.** An earthy accent (clay, terracotta, rust by default) for the primary action, the current selection and small highlights; at most about 10 % of any screen. Everything else is neutrals. Status colors (success, warning, error) are muted, never neon.
4. **Calm space.** A 4 px grid, generous margins, few elements per screen, one primary action per screen. Let content breathe; whitespace is not wasted space.
5. **Hairlines over shadows.** 1 px warm borders and subtle surface shifts separate things. Shadows only for what floats (menus, dialogs, sheets), soft and low.
6. **Soft, not bubbly.** Moderate radii (8–12 px for controls and cards), consistent everywhere; full pills only for tags and chips.
7. **Human imagery.** Real photography with warm grading, simple line illustrations, abstract organic shapes or nothing at all. One icon set (Lucide or Phosphor style, ~1.5 px line), never emoji as icons.
8. **Quiet motion.** 150–250 ms, ease-out, small opacity and position changes that explain a change of state. Nothing bounces, nothing loops. `prefers-reduced-motion` turns movement off.
9. **Plain, warm voice.** Sentence case. Buttons say what happens («Reservar cita», never «Enviar»). Errors say what happened and what to do, without blame.
10. **Accessible by default.** WCAG AA contrast (4.5:1 text, 3:1 large text and controls), visible focus ring, 44 × 44 px touch targets, labels always visible, color never the only signal (errors carry an icon and words).

## 2. Baseline tokens

Direction A of every project starts here (then tuned to the product). Values pass AA in both modes.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| `fondo` | `#FAF9F5` | `#21201E` | Page background |
| `superficie` | `#FFFFFF` | `#2B2A27` | Cards, inputs, sheets |
| `superficie_alt` | `#F0EEE6` | `#26251F` | Wells, selected rows, sidebars |
| `borde` | `#E3DFD3` | `#3D3B36` | Hairlines and dividers |
| `texto` | `#1F1E1C` | `#F2EFE6` | Body and headings |
| `texto_suave` | `#5E5B53` | `#B8B3A6` | Secondary text, hints |
| `acento` | `#B5532F` | `#E08A66` | Primary action, selection |
| `acento_texto` | `#FFFFFF` | `#21201E` | Text on the accent |
| `acento_suave` | `#F5E5DC` | `#3A2A22` | Highlights, selected chips |
| `exito` | `#3F6B3B` | `#8DBB86` | Success messages |
| `aviso` | `#8A5A0B` | `#E0B05C` | Warnings |
| `error` | `#A8372B` | `#F08B7E` | Errors |
| `foco` | `#2F6BAE` | `#7FB0EA` | Focus ring |

**Typefaces** (free, Google Fonts). Default pairing: **Source Serif 4** (headings, 500–600) + **Hanken Grotesk** (text, 400/500/600). Alternatives that keep the house feel:

| Headings (serif) | Character |
| --- | --- |
| Source Serif 4 | Sober, bookish, very legible |
| Newsreader | Editorial, newspaper warmth |
| Fraunces | Soft, expressive, a little playful (use lower "wonk") |
| Instrument Serif | Elegant display; headings only, large sizes |
| Literata | Calm, made for long reading |

| Text (sans) | Character |
| --- | --- |
| Hanken Grotesk | Warm grotesque, close to the house feel |
| Instrument Sans | Crisp, slightly narrow, modern |
| Figtree | Friendly, rounded geometry |
| Public Sans | Neutral, institutional, very clear |
| Geist | Precise, technical |

Mono when needed: JetBrains Mono or Geist Mono. Inter, Roboto, Arial and system fonts are fallbacks only, never the identity.

**Scale** (px): 12, 14, 16 (base, never smaller on phones), 18, 20, 24, 30, 36, 48, 60. Line height 1.15–1.25 for headings, 1.6 for text; headings with slight negative tracking (−0.01 em).
**Space** (px): 0, 4, 8, 12, 16, 24, 32, 48, 64, 96. **Radius**: 6 / 10 / 16 / pill. **Motion**: 120 / 200 / 320 ms, `cubic-bezier(0.2, 0, 0, 1)`. **Widths**: reading 68ch, content 1120 px.
**Shadow** (floating layers only): `0 1px 2px rgb(31 30 28 / 0.06), 0 8px 24px rgb(31 30 28 / 0.08)`.

## 3. Components, the house way

- **Buttons.** Primary: accent fill, `acento_texto`, radius md, 44 px min height, medium weight. Secondary: surface with a 1 px border. Quiet: text only, underline on hover. One primary per screen. Pending state keeps the width and shows a small spinner plus a verb in progress («Reservando…»), and blocks double submits.
- **Inputs.** Label above, always visible; hint below in `texto_suave`; error below in `error` with an icon, linked to the field; 1 px border that turns `foco` on focus with a 2–3 px ring. Placeholders only as examples, never as labels.
- **Cards and lists.** Surface + hairline border, no shadow; generous padding; the whole row is the tap target when it leads somewhere.
- **Notices.** `superficie_alt` or a tint of the status color, an icon, one sentence, an action if there is one.
- **Empty states.** A short serif line that explains, a sentence on what to do, and the action. Optional small line illustration. Never a blank page.
- **Loading.** Skeletons that match the final layout for content; a spinner only inside buttons. No full-screen spinners after the first load.
- **Navigation.** Phones: a simple top bar with the screen title (serif) and back; a bottom bar only with 3–5 real destinations. Desktop: content centered within the content width; a sidebar only for tools used all day (staff, admin).
- **Dialogs and sheets.** Bottom sheet on phones, centered dialog on desktop; the only places with shadow.

## 4. Never (what makes an app look generated)

- Purple, indigo or blue-violet gradients; gradient text; mesh blobs; glassmorphism; neon glows.
- Inter/Roboto/system fonts as the identity; the default Tailwind palette (`indigo-600`, `gray-500`, `slate-*`) left as is.
- The template landing: centered hero + three feature cards + testimonial slider. Dashboards of four KPI cards by reflex.
- Heavy drop shadows on every card; `rounded-2xl` on everything; pills everywhere.
- Emoji as icons, mixed icon sets, stock 3D illustrations, generic "people with laptops" art.
- Title Case Everywhere, «¡Bienvenido a X!», «Comenzar», «Enviar», exclamation marks in every message.
- Lorem ipsum or invented copy in mockups: always the approved texts.
- Gray-on-gray low-contrast text; text over busy photos; more than one accent; color as the only signal.

## 5. Making it original: the signature

Every project gets **one signature** (`firma`): a distinctive detail taken from the world of the product, used in two or three places, that makes the app recognizable without hurting legibility. It must serve the product, not decorate it.

| Product | Possible signature |
| --- | --- |
| Barbershop | A thin diagonal stripe (barber pole) as divider and loading bar; the booking confirmation as a ticket with a perforated edge |
| Bakery | Hand-drawn wheat and crumb line icons; prices set in an old-style serif with ruled leaders |
| Clinic | A soft "breathing" progress ring while waiting; rounded calm cards with a quiet green accent |
| Bookshop / library | Catalog-card layout for items, with a typewriter-style mono for codes |
| Gym | Bold condensed numerals for times and sets; a progress line that fills like a track |
| Restaurant | Menu-like typographic lists with dotted leaders; a warm photo band |

Ways to go further within the house: a type pairing with more character, a product-born accent (olive for a vineyard, deep blue for a sailing school), an editorial layout (asymmetric columns, big numerals), a texture (subtle paper grain, a ruled-notebook background), a custom illustration motif.

## 6. Three directions

In stage 4 the person always sees three directions, side by side, built with the real screens and texts:

| Direction | What it is | How it moves |
| --- | --- | --- |
| **A · Casa** | The house baseline, tuned to the product | Accent and signature adjusted to the product; the safest choice |
| **B · Casa + mundo** | House principles with the product's world | Palette, type pairing and signature drawn from the trade, the place, the materials |
| **C · Salto** | One deliberately bolder step | Pick one or two strong moves (dark-first, oversized type, a confident color field, an unusual layout) while keeping principles 8–10 and the never-list |

The three must look different at a glance: each differs from the others on at least three axes (palette and accent, type pairing, shape language, density, imagery, layout concept, signature). Three tints of the same layout are not three directions.

The person may pick one or mix ("la letra de A con los colores de C"). A mix is resolved into one coherent system; if two choices clash (a playful display face with a very formal palette), say so and propose the closest coherent version.

## 7. Experience options

Opt-in extras to offer with the directions, only those that fit the app, each with its consequence and a recommendation:

| Option | Choices | Consequence |
| --- | --- | --- |
| Dark mode | automatic (follows the phone) · with a switch · no | Every screen is designed and tested twice; small extra work |
| Motion | sober (default) · more expressive · minimal | Expressive motion needs care on slow phones |
| Imagery | own line illustrations · real photos (theirs) · type only | Photos need the person's material; type only is fastest |
| Installable on the phone | yes · no | An icon on the home screen without an app store; small extra work |
| Density | airy (default) · compact | Compact suits screens used all day (staff, admin) |
| Text size control | yes · no | Helps older users; small extra work |

## 8. Before calling a design done

- [ ] Real approved texts everywhere; no lorem ipsum, no invented copy.
- [ ] Tokens validate (contrast AA in every mode) and nothing uses a value outside them.
- [ ] One accent, one signature, used with restraint.
- [ ] The never-list is clean.
- [ ] Every screen has its loading, empty, error and success states.
- [ ] Works at 360 px wide and on desktop; touch targets ≥ 44 px; focus visible.
- [ ] The three directions differ on at least three axes.
- [ ] No Anthropic or Claude brand elements.
