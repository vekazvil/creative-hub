# Creative Hub — taskovi po redu

Izvor: Claude Doc https://claude.ai/artifact/6vnyuTAJpEiroQYc2SCkCR (Nov 2, 2026), sadržaj zalijepio korisnik 5. 11. 2026.

Ovo su 54 zadatka do prelaska 11. 12., redom kojim ih radiš. U svakoj sedmici prvo ide ono što drugi čekaju od tebe, a na kraju je provjera kapije. Kad zadatak čeka pristup, nastavi na fake verziji i vrati se čim pristup stigne.
Kalendar i arhitektura: `docs/PLAN.md`. Forme i UI: `docs/WIREFRAME.md`.

## Sedmica 1 · 2.–6. 11. · Setup

Kostur i jezgro na stagingu, svi pristupi se traže prvog dana. Kapija 1 je 6. 11.: test workspace, developer pristup i OpenAI ključ.

**Ponedjeljak 2. 11.**

- [ ] 1.1 Prompt za Anin GPT: pregled prošlih projekata u jedan PDF s vrstama zahtjeva i formi, pitanjima koja se ponavljaju i problemima. PDF tražimo do 11. 11.
- [ ] 1.2 Recap sastanka za tim: odluke, zadaci, rok 11. 12. i šta tražimo od koga.
- [ ] 1.3 Zahtjevi za pristupe, jedna poruka po osobi, s datumom:
  - Nabor, do 6. 11.: Monday test workspace s 3–4 kopirana boarda, developer pristup i servisni korisnik, i novi OpenAI ključ upisan pravo u secret store.
  - Nabor, u istoj poruci: potvrda da GPT i Zap pod njegovim nalogom rade kao rezerva do prelaska.
  - Ana ili njihov IT, do 9. 11.: Microsoft ili Google za prijavu, i ime IT admina.
  - Google admin, do 9. 11.: servisni nalog na shared driveu i pristup Sheetu brojača.
  - Ana, do 13. 11.: odobrenje Slack bota, lista 23 automatizacije na boardu i lista brendova i podbrendova s vlasnikom liste.
- [ ] 1.4 Naši nalozi: GitHub repo, hosting za staging, managed Postgres, Sentry projekat i secret store.

**Utorak i srijeda**

- [x] 1.5 pnpm monorepo s apps/web, apps/worker, packages/core, packages/db i packages/connectors; TypeScript strict, ESLint, Prettier.
- [x] 1.6 GitHub Actions: lint, typecheck, test i build na svaki push.
- [x] 1.7 Drizzle šema v1 i migracije za jezgro: requests, brief_versions, approvals, projects, counters, operations, outbox, events. Ostale tabele dolaze s dijelom kojem trebaju.
- [ ] 1.8 Jedan Docker image za web i worker, Postgres na stagingu i deploy na staging iz CI-ja.
- [ ] 1.9 Sentry i pino u webu i workeru.

**Četvrtak 5. 11.**

- [ ] 1.10 Atomična numeracija: lock na redu brojača i test s dva istovremena zahtjeva.
- [ ] 1.11 Outbox, pg-boss i operations: ključ (request_id, operacija) i retry s pauzom.
- [ ] 1.12 Stanja zahtjeva kao typed mapa prelaza; svaki prelaz se upisuje u events.

**Petak 6. 11.**

- [ ] 1.13 Interfejsi za Monday, Drive, Docs, Slack i email, s fake verzijama u memoriji.
- [x] 1.14 Format šeme za vrstu posla (Zod i JSON) i tri privremene vrste: video, social post, retail i POS print.
  - 5. 11.: umjesto tri privremene vrste ubačeno svih 15 vrsta i kampanja iz wireframea (`packages/core/src/forms`). Na kapiji 2 se usklađuju s Aninim PDF-om.
- [x] 1.15 Radni dani po Texasu (US praznici) i pravilo za hitno ispod 5 radnih dana, s testovima.
- [ ] 1.16 Provjera kapije 1. Ako nešto fali, podsjeti Nabora isti dan, a rad ide dalje na fake verzijama.

**Gotovo kad:**

- push na main prođe lint, typecheck, test i build i završi na stagingu;
- dva zahtjeva u istoj sekundi dobiju različite brojeve;
- fake Monday i Drive prime poslove iz outboxa bez duplikata.

## Sedmica 2 · 9.–13. 11. · Forma i kreiranje

Zahtjev prvi put prolazi od forme do Mondaya i Drivea na stagingu. Kapija 2 je 11. 11.: Anin PDF s vrstama posla i pitanjima.

- [ ] 2.1 Auth.js s dev prijavom i listom dozvoljenih emailova za pilot. Pravi provider, Entra ID ili Google, dodaješ čim stigne odgovor.
  - 5. 11.: umjesto Auth.js urađen Better Auth s emailom i lozinkom (registracija, potvrda emaila, zaboravljena lozinka, reset). Lista dozvoljenih domena je `AUTH_ALLOWED_EMAIL_DOMAINS`. SSO dolazi kasnije.
- [ ] 2.2 OpenAI omotač: structured output po JSON šemi i trošak svakog poziva u events. Bez ključa radi na fake verziji.
  - 5. 11.: urađeno (`packages/connectors/src/ai`, model `OPENAI_MODEL`, default gpt-5.4-mini). Tokeni se pišu u events; cijena u USD čeka cjenovnik.
- [ ] 2.3 Monday konektor na test workspaceu: ID-jevi boarda, grupe i kolona u env_settings, item sa subitemima i smoke test.
- [ ] 2.4 Forma iz šeme vrste posla: obavezna pitanja, oba datuma obavezna i čuvanje drafta.
  - 5. 11.: urađeno (forma iz šeme, automatsko čuvanje drafta, pregled briefa A–E, slanje upisuje brief_versions, events i outbox).
- [ ] 2.5 Brendovi u brands i brand_aliases, s uvozom iz Sheet brojača (kolone B, C, D). Nepoznato ime ide pod srodni brend ili čeka admina.
  - Dok nema pristupa Sheetu, La Costeñu unesi ručno.
  - 5. 11.: tabele `brands` i `brand_aliases` sa seedom iz wireframea (19 brendova i par drugih naziva). Prepoznavanje ide bez akcenata i velikih slova, preko kratkog koda i drugih naziva. U chatu se nepoznato ime upisuje kao `pending` alias za admina, a polje ostaje prazno. Ostaje uvoz iz Sheeta (kolone B, C, D) i admin ekran za potvrdu.
- [ ] 2.6 Kapija 2: zamijeni privremene vrste posla pravim formama iz Aninog PDF-a. Forme su podaci, pa deploy ne treba.
- [ ] 2.7 Drive konektor: folder projekta na shared driveu, preko servisnog naloga.
- [ ] 2.8 Brief iz templatea u Google Docsu, s odgovorima iz forme.
- [ ] 2.9 Kreiranje od kraja do kraja na stagingu: forma, broj, Monday item, Drive folder i brief.
- [ ] 2.10 Kad stigne lista 23 automatizacije, provjeri na kopiji boarda da ih naš upis ne pokreće pogrešno.

**Gotovo kad:**

- zahtjev poslan kroz formu na stagingu napravi broj, Monday item sa subitemima, folder i brief;
- ponovljeno slanje istog zahtjeva ništa ne napravi dvaput.

## Sedmica 3 · 16.–20. 11. · Agent i pravila

Forma dobija AI pomoć i pravila za hitno, slične projekte, Slack i email. Kapija 3 je 20. 11.: odluka o numeraciji za migraciju.

- [ ] 3.1 Popuna iz zalijepljenog teksta: OpenAI vraća samo polja koja u tekstu postoje, a ostalo ostaje prazno i označeno.
  - 5. 11.: urađeno kao chat (`/chat`): AI postavlja pitanja i popunjava formu, svako polje pamti izvor (chat ili AI prijedlog). Ekran "Check every field" s potvrdom polje po polje još nije urađen.
  - 6. 11.: chatovi se čuvaju (`chats`, `chat_messages`): lista s lijeve strane, nastavak na `/chat/<id>`, brisanje, "Open the form" otvara uvijek isti draft.
- [ ] 3.2 Testovi za popunu: tekst bez datuma ostavlja datum prazan, i AI ne dodaje ništa što requester nije napisao.
- [ ] 3.3 Lista „šta fali“ uz formu, s linkom na svako prazno obavezno polje.
- [ ] 3.4 Slični projekti preko pg_trgm i full-texta nad projects, uz izbor „ažuriraj postojeći“ ili „ovo je novo“. Ažuriranje ne pravi novi broj.
- [ ] 3.5 Hitno: rok kraći od 5 radnih dana čeka odobrenje Ane ili Nabora u approvals, a oni dobiju obavijest.
- [ ] 3.6 Slanje u ime drugoga: PM bira requestera, a zahtjev pamti ko ga je poslao.
- [ ] 3.7 Slack konektor: kanal po projektu za creative tim, bez requestera. Treba odobren bot.
- [ ] 3.8 Email requesteru s linkovima, preko Graph sendMail ili Gmaila, po odgovoru o prijavi.
- [ ] 3.9 Kapija 3: zapiši pravila migracije po odluci o duplikatu 275 i prefiksu „01-.“.

**Gotovo kad:**

- AI ne popuni ništa što nije u tekstu;
- hitan zahtjev čeka odobrenje prije kreiranja;
- sličan projekat se ponudi prije novog foldera;
- Slack kanal i email stignu za novi projekat.

## Sedmica 4 · 23.–27. 11. · Uloge i migracija

Svako počinje vidjeti samo ono što smije, a migracija se proba na kopiji. Četvrtak 26. 11. je Thanksgiving: Ana i Nabor manje dostupni.

- [ ] 4.1 U ponedjeljak dogovori termine za pilot (30. 11.–4. 12.) s Anom i Naborom.
- [ ] 4.2 Uparivanje ljudi po emailu iz prijave: people s Monday i Slack ID-jem, a razlike idu adminu na potvrdu.
- [ ] 4.3 Uloge u roles i person_roles: requester, creative tim, PM i creative manager, admin.
- [ ] 4.4 Vidljivost na serveru preko project_members: svaki upit se filtrira, a AI ne dobije projekat koji osoba ne smije vidjeti.
  - Testovi za svaku ulogu.
- [ ] 4.5 Admin stranice: integracije, vrste posla i forme s verzijama, brendovi i numeracija, ljudi i uloge.
- [ ] 4.6 Status iz event loga: šta je u toku, šta je zaglavljeno i zadnji update.
- [ ] 4.7 Skripta za migraciju trenutnih La Costeña projekata po pravilima s kapije 3, i probni prolaz na kopiji.
- [ ] 4.8 Produkcija pripremljena, ali ne uključena: hosting po odgovoru o prijavi, tajne u secret storeu i env_settings za živi board.

**Gotovo kad:**

- requester vidi samo svoje zahtjeve, član tima samo svoje projekte, a PM i creative manager sve;
- probna migracija prođe bez duplih brojeva.

## Sedmica 5 · 30. 11.–4. 12. · Pilot na testu

Ana i Nabor rade prave zahtjeve na kopiji boarda, a ti popravljaš ono što nađu. Kapija 4 je 4. 12.: svi testovi prihvatanja prolaze.

- [ ] 5.1 Pilot: Ana i Nabor šalju prave zahtjeve na kopiji boarda, a ti svaki dan pratiš events i Sentry.
- [ ] 5.2 Popravke iz pilota ovim redom: blokeri, greške u podacima, pa sitnice u formi.
- [ ] 5.3 Uputstvo za obuku: kako se šalje zahtjev, šta je hitno i gdje se prati status.
- [ ] 5.4 Produkcijski deploy spreman i probno pokrenut, bez prebacivanja na živi board.
- [ ] 5.5 Kapija 4: testovi prihvatanja s Anom i Naborom, po listi iz plana izrade.

**Gotovo kad:** testovi prihvatanja prođu na test workspaceu, a probna migracija nema duplih brojeva. Gašenje Zapa se provjerava u sedmici 6.

## Sedmica 6 · 7.–11. 12. · Prelazak

La Costeña prelazi na novi sistem, a stari put se gasi. Prelazak je 11. 12.

- [ ] 6.1 Migracija trenutnih La Costeña projekata na produkciju.
- [ ] 6.2 Prebacivanje na živi board i prvi pravi zahtjev pod tvojim nadzorom.
- [ ] 6.3 Zap ugašen za La Costeñu, zajedno s Naborom.
- [ ] 6.4 Obavijest ljudima: gdje se od sada šalju zahtjevi i gdje je uputstvo.
- [ ] 6.5 Custom GPT penzionisan.
- [ ] 6.6 Dežurstvo prvih dana: svaki dan provjeri events, Sentry i zaglavljene zahtjeve.

**Gotovo kad:**

- svi trenutni La Costeña projekti su u novom sistemu, bez duplih brojeva;
- niko ne šalje zahtjeve starim putem.
