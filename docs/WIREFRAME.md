# Creative Hub — wireframe / prototip (snapshot 5. 11. 2026.)

Izvor: https://claude.ai/artifact/EV6GMQYXZBBsXeitpqsPzJ ("Creative Hub request form", Design artifact, kreiran 4. 11. 2026.).
Izvorni fajlovi: `docs/reference/wireframe/` — `Main.dc.html` (forma), `Chat.dc.html` (chat-first flow), `canvas.json` (raspored i bilješke), `work-types.reference.js` (sve vrste posla s poljima, doslovno iz prototipa — koristiti za seed `work_types`).

UI je na engleskom. Font IBM Plex Sans / Plex Mono, primarna boja `#1F5EDB`, sidebar `#F5F6F7`.

## Ekrani (11 boardova)

Red 1 — "Start with a chat, check every field, then send"

1. **Chat first** (prototip, launch ekran)
2. **The chat ends with a brief to check**
3. **Check every field**
4. **Sent to the creative team**

Red 2 — "Or pick the type yourself, and the form grows with it" 5. **Or pick the type yourself** (step 1 forme) 6. **Sell sheet: the form expands** 7. **Event or trade show**

Red 3 — "Updates, campaigns and the brief it sends" 8. **Update an existing deck** (mode = update) 9. **Campaign: strategy once, a form per piece** 10. **Check and send** (review briefa)

Red 4 11. **All forms at a glance** (katalog svih formi, ● obavezno / ○ opcionalno)

## Navigacija / layout

- Sidebar: logo "Creative Hub", dugme **New request**, nav: **Chats**, **My requests** (badge 2), **My tasks** (badge 3), **Fill in a form**, "Recent chats" lista (npr. Crispy Jalapeños sell sheet, Pizza Expo banner, Walmart deck refresh, Fiestas Patrias posts). Korisnik dolje: avatar "LR", **Lucia Ramos · Brand Marketing** (demo requester).
- Indikator "Draft saved" / "Sent".

## Flow A — Chat first

Koraci (stepper): **Chat → Check every field → Sent**.

- Home: "What are you working on, Lucia?" / "Tell me about it in your own words. I’ll ask only what’s missing, then turn it into a brief for the creative team." Composer "Describe what you need…", chipovi **Brand: not set** i **Type: auto** (poslije postanu "La Costeña", "Sell sheet · update"). Disclaimer: "Creative Hub can get things wrong. You check every field before anything is sent." Primjer: "Update a sell sheet". Link "Prefer a form? Pick the type yourself".
- Asistent pita samo ono što fali, **1–3 pitanja odjednom**, i **nikad ne popunjava product data (UPC, case data) ni broj projekta**.
- Kad nađe postojeći projekat, prikazuje karticu reference (npr. `01 184 · Crispy Jalapeños – Pizza Topping Foodservice Sell Sheet · Sell sheet · La Costeña · Drive folder · Open`).
- Requester može prikačiti fajl (npr. `Crispy-Jalapenos-2lb-specs.xlsx`).
- Dugme **Create the form now** (od 1. odgovora) → poslije završetka **Check the form**.
- Kraj chata: kartica briefa "SELL SHEET · UPDATE — <title> — 24 fields · 6 AI suggestions · 1 missing".

Demo razgovor (4 runde): update sell sheeta Crispy Jalapeños za foodservice, novi 2 lb bag, novi format → šta ostaje i koji product data → poruka za distributere → datumi i approver (draft 13. 11., final 20. 11., approver Marco Díaz · Sales).

### Check every field

"I filled this in from our chat. Nothing goes to the creative team until you confirm every field, so change anything that isn’t right."

- Polja grupisana: **Basics**, **What we’re updating**, **<Type> details**, **Dates and approval**, **Files**; po grupi "X of Y confirmed"; napomena o opcionalnim praznim poljima.
- Svako polje ima **izvor (badge)**:
  | Izvor   | Label                              | Boja        |
  | ------- | ---------------------------------- | ----------- |
  | chat    | From the chat                      | plava       |
  | ai      | AI suggestion                      | narandžasta |
  | brand   | Brand list                         | siva        |
  | earlier | From <broj projekta> (npr. 01 184) | siva        |
  | file    | Your file                          | siva        |
  | rule    | Timing rule                        | siva        |
  | you     | Changed by you                     | zelena      |
  | missing | Missing                            | crvena      |
- Polje može imati note (npr. "Not in the chat. English is usual for foodservice.", "Same as 01 184.", "7 working days in Texas, so no rush approval is needed.").
- Akcije po polju: **Change**/**Done**, **Confirm**/**Confirmed** (disabled ako je prazno). Izmjena poništava potvrdu. Missing choice polje se bira direktno dugmadima.
- Progress "N of M confirmed", "X left to confirm, including 1 missing answer." Legenda izvora s brojem.
- **Send to the creative team** omogućeno tek kad je SVE potvrđeno. "Each confirmation is saved with your name and the time."
- Sent: "You confirmed all N fields. The brief went to the creative team with a record of who confirmed each one and when." + lista šta je kreirano.

**Otvoreno pitanje (bilješka):** ko potvrđuje polja — ovdje requester. Ako PM / creative manager treba odobriti prije creative tima, to je dodatni korak poslije "Check every field".

## Flow B — forma (pick the type yourself)

Stepper: **What you need → Details → Check and send**.

### Step 1 — What you need

- "What do you need? Pick the closest match. The form then asks only what this kind of work needs."
- **Is it new work?** toggle: **New work** / **Update something that exists** ("An update asks for the current file and what changes.").
- Grupe kartica: **Most requested** (top), **More types**, posebno **CAMPAIGN** ("Start a campaign →").
- **Not sure which one?** — zalijepi bilješke → **Suggest a type** (AI predlaže tip s razlogom, npr. "Your notes mention a retractable banner and an expo." → **Use this type**), ili "Or describe it in a chat".
- **Not creative work?** — reports, workflow/automation, spreadsheets, trainings ne idu creative timu: "Send it to [TEAM OR PERSON]. It won’t get a project number, a creative folder or creative subitems." (12 prošlih zahtjeva, INTERNAL; destinacija TBD).
- Kartica s `process` napomenom prikazuje badge "Different process" (WEB).

### Step 2 — Details (sekcije)

"Questions marked * are required." Desni panel **Checks**:

- Required questions — "This form has N required questions." / "All N required questions are answered."
- **Similar past project** — prikazuje sličan projekat + **Update this one instead** ("An update gets its own project number and links to the old one.").
- **Timing** — "Normal notice is 5 working days, counted in Texas. Under that, the PM or the creative manager approves first."
- **When you send** — project number + Monday item; Drive folder s briefom i fajlovima; Slack kanal za creative tim; email requesteru s linkovima.

Redoslijed sekcija:

1. **Basics** (For every request)
2. **What are we updating?** (samo update mode) — "Link the version that exists today, so nobody starts from scratch."
3. **<TYPE> details** — "Only the questions this kind of work needs." (+ tip, npr. DECK: "Ready-made Canva brand templates may already cover this." → "See the templates")
   - Campaign: **Campaign strategy** — "Asked once for the whole campaign. Each piece gets its own short form below."
4. Campaign samo: **Piece i of n · CODE** (collapsible, "Fill in"/"Collapse", Remove; summary "N questions, starting with …") + **Add a piece** ("Each piece keeps its own type, specs and quantity."; opcije: social, email, ads, video, ecom, pos, event, print, photo). Default pieces: social, email, ads.
5. **When and who** (Dates and approval) — "Real calendar dates only, counted in Texas working days."
6. **Budget** (samo tipovi s `budget: true`) — "Something here is produced or bought."
7. **References and source files** — "Files go straight into the project folder."

#### Zajednička polja

Basics:

| Polje                         | Tip                                   | Obav. | Napomena                                                                                                                       |
| ----------------------------- | ------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| Title                         | text                                  | ●     | placeholder "e.g. <sampleTitle>"                                                                                               |
| Brand                         | pick (search)                         | ●     | lista brendova; "A new name goes under a related brand until an admin confirms it."                                            |
| Co-brands                     | text                                  | ○     |                                                                                                                                |
| Language                      | choice: English / Spanish / Bilingual | ●     |                                                                                                                                |
| Products and SKUs             | textarea                              | ●     | samo za tipove s `products: true`; "One per line, with the UPC where it matters"; **"Product data is never filled in by AI."** |
| Objective                     | textarea                              | ●     | "What should this achieve? More than “sell more”."                                                                             |
| Audience                      | text                                  | ●     |                                                                                                                                |
| Key message or mandatory copy | textarea                              | ●     |                                                                                                                                |
| Requester                     | auto                                  | —     | iz company sign-ina; "The PM can send a request for someone else."                                                             |

Update (mode):
| Link to the current file or project | text | ● | "Drive link or project number, e.g. 01-.250" |
| What changes | textarea | ● | |
| What must stay the same | textarea | ○ | |

Dates and approval:
| First draft | date | ● | "For your first round of feedback." |
| Final files | date | ● | |
| <dateLabel tipa> | date | ● | npr. "Needed by sales on", "Meeting date" |
| Approver | people search | ● | "Picked from the user list." |
| Priority | choice: **Normal / Urgent / Bomberazo** | ● | "Under 5 working days, the PM or creative manager approves first." |
| Creative freedom | choice: Low / Medium / High | ● | |

Budget: `Budget` text ○ ("Production and media, if known").
Files: `Upload files` file ○ (drag & drop), `Links` text ○.

### Vrste posla (16 = 15 + campaign) — iz 305 prošlih foldera na Driveu

Redoslijed u katalogu: top → campaign → more. Pun spisak polja: `docs/reference/wireframe/work-types.reference.js`.

| Kod      | Naziv                              | Grupa   | Prošlih | dateLabel                   | products | budget | Primjer sličnog                                                       |
| -------- | ---------------------------------- | ------- | ------- | --------------------------- | -------- | ------ | --------------------------------------------------------------------- |
| SELL     | Sell sheet or spec sheet           | top     | 56      | Needed by sales on          | ✓        | –      | 01 184 Crispy Jalapeños – Pizza Topping Foodservice Sell Sheet        |
| ADS      | Advertising: print, OOH or digital | top     | 30      | Publisher or media deadline | ✓        | ✓      | 01-.236 Crispy Jalapeños – Abasto Magazine Ad                         |
| PACK     | Packaging or label                 | top     | 27      | Files due at the printer    | ✓        | –      | 01-.226 La Costeña Salsas Portfolio Redesign                          |
| EVENT    | Event, sponsorship or trade show   | top     | 26      | Files due at the printer    | ✓        | ✓      | 01 183 Pizza Expo Foodservice Retractable Banner                      |
| DECK     | Presentation                       | top     | 22      | Meeting date                | –        | –      | 01-.234 La Costeña Walmart Initiatives Deck Redesign                  |
| VIDEO    | Video or animation                 | top     | 19      | Air or publish date         | ✓        | ✓      | 01-.220 La Costeña × Mercedes-Benz Stadium – Sponsorship Launch Video |
| CAMPAIGN | Campaign: several pieces, one idea | special | 16      | Campaign launch             | ✓        | ✓      | 01-.245 La Costeña Beans Campaign – TX & CA Growth Initiative         |
| SOCIAL   | Social media                       | more    | 17      | Publish date                | ✓        | –      | 01-.266 Giveaway La Costeña × Atlanta United — VIP Suite              |
| POS      | Retail or POS                      | more    | 16      | In-store date               | ✓        | ✓      | 01-.263 La Costeña Generic POP Materials                              |
| ECOM     | E-commerce                         | more    | 13      | Go-live date                | ✓        | –      | 01-.252 Costco Launch – High-Resolution Product Images                |
| PHOTO    | Photography or renders             | more    | 13      | Images needed by            | ✓        | ✓      | 01-.264 mexicorico.com Product Photography                            |
| MERCH    | Merch or promo item                | more    | 9       | Needed at the event on      | –        | ✓      | 01 187 Hidalgo BorderFest Leprechaun T-Shirt                          |
| EMAIL    | Email                              | more    | 6       | Send date                   | ✓        | –      | 01-.197 March Newsletter – Lent Email Visual                          |
| PRINT    | Promotional print                  | more    | 6       | Files due at the printer    | ✓        | ✓      | 01-.261 Wallet de Cupones UTSA                                        |
| BRAND    | Brand identity or guidelines       | more    | 5       | Needed by                   | –        | ✓      | 01-.238 Brand Guidelines & Modern Brand Book Update                   |
| WEB      | Website or digital product         | more    | 5       | Launch date                 | –        | ✓      | 00-.30 Vilore Central Product Catalog & Sales Portal                  |

Ostalo iz analize: ~40 prošlih zahtjeva su **updatei** (mode, ne tip); 12 **internal** (ne ide u formu).
WEB ima `process`: "Website work needs its own process, not the Copy → Design → Review → Deployment steps. To be decided with the owners."

Tipovi polja u šemi: `text`, `textarea`, `number`, `date`, `choice` (single), `multi`, `file`, `pick` (search lista), `auto` (read-only iz sistema). Atributi: `label`, `req`, `opts`, `ph` (placeholder), `hint`, `half` (pola širine), `value`.
Atributi tipa: `id`, `code`, `name`, `group` (top/more/special), `past`, `examples`, `similar`, `dateLabel`, `products`, `budget`, `sampleTitle`, `tip?`, `process?`, `fields[]`.

### Brendovi (iz prototipa — "kod broj · skraćenica · ime")

`00 MULTI · Several brands`, `01 LC · La Costeña`, `02 · Mexico Rico`, `03 JX · Jumex`, `04 TT · Totis`, `05 AM · AMOR`, `06 · Odwalla`, `07 V5 · Vitafive`, `08 · The Respect Co`, `10 · Lucks`, `11 · Primo`, `12 · Pronto`, `13 · Congelli`, `15 TL · Tía Lupita`, `17 · Cal C Tose`, `18 CT · Chocomilk`, `19 METCO · Metco`, `20 CON · CON Alimentos`, `21 SOM · Fregon`.
(Lista i kodovi se potvrđuju s PM-om i creative managerom.)

### Numeracija projekata

Format u prototipu: `01-.279 – LC – <title>` (`<broj brenda>-.<redni broj>`). Stari projekti imaju i `01 184` (bez "-."), WEB primjer `00-.30`. Update dobija **svoj novi broj** i linkuje stari. Format se potvrđuje (vidi K3 u PLAN.md: duplikat 275, prefiks „01-.“).

### Step 3 — Check and send (brief)

"This is the brief the creative team gets, section by section." Svaka sekcija ima **Edit** (vraća na Details). Dugmad **Send request**, **Back to details**.

| Sekcija              | Sadržaj                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A Overview           | Title; Brand and co-brands; Type; New work / Update of an existing asset; Priority; First draft and final files; <dateLabel>                    |
| B Strategy           | Objective; Audience; Key message or mandatory copy; Language; (Products and SKUs)                                                               |
| C Production         | (update polja) + sva polja tipa + (Piece i: <tip> za kampanju)                                                                                  |
| D Creative direction | Creative freedom; References and source files                                                                                                   |
| E Management         | Approver; Requester; Subitems Copy → Design → Review → Deployment (za kampanju "for each piece"; WEB: "Process to be decided for website work") |

### Sent — šta se kreira

- **Project**: `01-.279 – LC – <title>` (+ "Linked to 01 184." za update)
- **Monday**: item na **Creative Projects** boardu, subitemi **Copy → Design → Review → Deployment**
- **Drive**: folder projekta s briefom, fajlovi u **Briefing and Assets**
- **Slack**: kanal za projekat s creative timom
- **Email**: requesteru sa svim linkovima
  "Request sent — Everything is set up. The links are also in your email." → "Start another request".

## Za potvrditi s PM-om i creative managerom (bilješka iz prototipa)

Lista brendova i kodovi; koja pitanja su opcionalna; merch kao poseban tip ili dio eventa; proces za website rad; gdje idu ne-kreativni zahtjevi; format broja projekta (prikazan današnji `01-.279`); ko potvrđuje polja (requester vs. PM/CM).
