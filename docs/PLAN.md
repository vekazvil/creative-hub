# Creative Hub — plan izrade (snapshot artifacta, stanje 2. 11. 2026.)

Izvor: https://claude.ai/artifact/FniDGvfwwGftYKpmE4hVtX ("Creative Hub setup").
Izvori tog plana: "Creative Hub — plan izrade do 11. 12.", Creative Hub wireframe, TECH STACK od 26. 10., odgovori klijenta od 28. 10., sastanak od 2. 11. Datumi kapija su NAŠ prijedlog, ne obećanje klijenta.

## Kontekst

- Klijent: Vilore Foods, La Costeña USA.
- Creative Hub = novi ulaz za zahtjeve prema creative timu. Zamjenjuje **custom GPT i Zap** za La Costeñu.
- **Rok: petak 11. 12. 2026.** — custom GPT tada prestaje raditi u ovom obliku.
- 6 sedmica, ~30 radnih dana, 2. 11. – 11. 12.
- Pilot: La Costeña, ~30 ljudi: Creative, Digital eCommerce, Social media.
- Tim: 1 developer. Jedan repo, jedna baza, sve TypeScript.
- Ljudi kod klijenta: **Ana** (PM, Slack admin, daje PDF prošlih projekata, vlasnik liste brendova), **Nabor** (Monday/OpenAI pristupi, odobrava hitno zajedno s Anom). Google admin, klijentov IT.

## Kalendar — 6 sedmica, 4 kapije

Ako kapija kasni, pomjera se pilot; prelazak 11. 12. ostaje.

| Sedmica | Datumi         | Tema              | Sadržaj                                                                                                                    | Kapija                                                                    |
| ------- | -------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1       | 2.–6. 11.      | Setup             | Repo, CI, baza, numeracija, outbox, lažni (fake) konektori. Prompt za Anu, recap, zahtjevi za pristupe.                    | **K1 pet 6. 11.**: Monday test workspace, developer pristup, OpenAI ključ |
| 2       | 9.–13. 11.     | Forma i kreiranje | Forma iz šema po vrsti posla, draft, mapiranje brendova. Monday item i subitemi, Drive folder, brief iz templatea.         | **K2 sri 11. 11.**: Anin PDF s vrstama posla i pitanjima                  |
| 3       | 16.–20. 11.    | Agent i pravila   | Popuna iz teksta bez izmišljanja, šta fali, slični projekti. Hitno ispod 5 radnih dana, u ime drugoga, Slack kanal, email. | **K3 pet 20. 11.**: odluka o numeraciji za migraciju                      |
| 4       | 23.–27. 11.    | Uloge i migracija | Uloge i vidljivost, admin stranice za forme, brendove i ljude. Migracija trenutnih projekata, usklađivanje brojeva.        | Thanksgiving čet 26. 11. — Ana i Nabor manje dostupni                     |
| 5       | 30. 11.–4. 12. | Pilot na testu    | Ana i Nabor rade prave zahtjeve na kopiji boarda. Popravke, produkcijske postavke, uputstvo za obuku.                      | **K4 pet 4. 12.**: svi testovi prihvatanja prolaze                        |
| 6       | 7.–11. 12.     | Prelazak          | La Costeña na živom boardu, Zap ugašen za La Costeñu. Custom GPT penzionisan, dežurstvo prvih dana.                        | **Prelazak pet 11. 12.**: niko više ne šalje zahtjeve starim putem        |

## Obim — mora raditi do 11. 12.

**Ulaz**

- Forma po vrsti posla s obaveznim pitanjima. Vrste posla dolaze iz Aninog PDF-a.
- AI pomoć u formi: popuni polja iz zalijepljenog teksta — samo ono što u njemu piše — i označi šta fali.
- Slanje zahtjeva u ime drugoga (za Anu kao PM-a).
- Hitno: rok kraći od 5 radnih dana (Texas kalendar, US praznici) čeka odobrenje Ane ili Nabora.

**Provjere prije kreiranja**

- Mapiranje brendova: podbrend ili novo ime ide pod srodni brend, u njegovu numeraciju i foldere.
- Slični projekti: ponudi postojeći prije novog, izbor „ažuriraj postojeći“ ili „ovo je novo“.

**Kreiranje projekta** (svaki korak se može ponoviti bez duplikata)

- Broj pod lockom → Monday item i subitemi → Drive folder → Brief iz templatea → Slack kanal za creative tim → Email requesteru.

**Pristup**

- Prijava firmenim nalogom, Microsoft (Entra ID) ili Google. Do odgovora radi privremena dev prijava.
- Uloge i vidljivost: requester, creative tim, PM i creative manager, admin.
- Admin stranice: integracije, vrste posla, brendovi, ljudi i uloge.

**Prelazak i nadzor**

- Migracija trenutnih La Costeña projekata, s usklađenim brojevima.
- Event log, i iz njega status: šta je u toku, šta je zaglavljeno, zadnji update.

**Poslije 11. 12. (odgođeno)**

- Chat „pitaj o svom poslu“ (ako ne stigne u prvu verziju).
- Grafikoni i izvještaji.
- Pitanje o zadovoljstvu nakon odobrenja (ulazi ako ostane vremena; tabela `feedback` postoji).
- Ostali brendovi i odjeli, Figma, analitika ciklusa.

## Arhitektura

- `apps/web` (Next.js App Router) i `apps/worker` (Node + pg-boss), jedan repo, jedna PostgreSQL baza.
- Web: prijava (Auth.js · Entra ID ili Google), forma po vrsti posla, popuna iz teksta (AI), provjere prije slanja, moji zahtjevi i taskovi, admin stranice, API kao route handlers.
- Web zove OpenAI (structured output, JSON šema) za popunu forme.
- Web upisuje stanje + posao u outbox u **jednoj transakciji**.
- Worker: prazni outbox, retry s pauzom (backoff), bez duplikata; zove Monday (servisni korisnik), Drive i Docs (servisni nalog), Slack (bot, creative tim), Email (Graph sendMail ili Gmail). Rezultat u `operations` i `events`.
- Dok ne stignu pristupi, konektori rade kao fake verzije u memoriji.

### Put jednog zahtjeva

1. **web · Forma** — ista Zod šema crta formu u pregledniku i provjerava je na serveru. (`work_types`)
2. **web · Popuna iz teksta** — OpenAI vrati samo polja koja u tekstu postoje; ostalo prazno i označeno. (`events`)
3. **web · Provjere** — brend ili alias, slični projekti preko pg_trgm, radni dani po Texasu. (`brands`, `brand_aliases`, `projects`)
4. **web · Slanje** — jedna transakcija: zahtjev, verzija briefa i posao u outboxu. (`requests`, `brief_versions`, `outbox`)
5. **web · Hitno?** — rok ispod 5 radnih dana čeka odobrenje Ane ili Nabora prije kreiranja. (`approvals`)
6. **worker · Broj i projekat** — worker uzme posao i dodijeli broj pod lockom na redu brojača. (`counters`, `projects`)
7. **worker · Monday i Drive** — item sa subitemima, folder i brief iz templatea. (`operations`)
8. **worker · Slack i email** — kanal za creative tim i email requesteru s linkovima. (`operations`, `events`)

Koraci 6–8 upisuju ključ `(request_id, operacija)` u `operations` PRIJE poziva, a vraćeni ID POSLIJE. Kad poziv padne, worker ponovi samo taj korak. Svaki prelaz stanja ide u `events`.

## Stack

Odstupanja od TECH STACK-a (26. 10.): API u Next.js umjesto zasebnog NestJS-a (rok, 1 developer); OpenAI umjesto Claudea (odluka klijenta).

| Sloj     | Tehnologije                                                                              | Napomena                                                                                    |
| -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Ekran    | Next.js App Router, React, Tailwind, shadcn/ui                                           | Forma, panel s provjerama, moji zahtjevi i admin u jednom deployu                           |
| API      | route handlers, server actions, Zod, Auth.js                                             | Isto pravilo u pregledniku i na serveru. NestJS/Fastify tek ako API naraste                 |
| Podaci   | PostgreSQL, Drizzle, pg-boss, pg_trgm i full-text                                        | Stanje, red poslova, outbox, brojači, event log u jednoj bazi. pgvector kasnije ako zatreba |
| Pozadina | worker (Node), outbox, retry s pauzom                                                    | Svaki korak idempotentan                                                                    |
| Vani     | Monday GraphQL, Drive i Docs API, Slack Web API, Graph sendMail ili Gmail, OpenAI        | Svaki iza našeg interfejsa, s fake verzijom i ugovornim testovima na snimljenim odgovorima  |
| Pogon    | 1 kontejner / 2 procesa, secret store ili Doppler, Sentry + pino, GitHub Actions, Vitest | Staging na svaki merge, produkcija ručno. Event log = poslovni zapis, Sentry = tehnički     |

### Struktura repoa (prijedlog)

```
creative-hub/
  apps/
    web/          forma, provjere, moji zahtjevi, admin, API
    worker/       prazni outbox, zove konektore, retry
  packages/
    core/         stanja, radni dani (Texas), hitno, šeme posla
    db/           Drizzle šema, migracije, seed
    connectors/   monday, google, slack, email, openai
                  svaki: interfejs, prava verzija, fake
  .github/workflows/  lint, typecheck, test, build, deploy
  Dockerfile      jedan image: web i worker
  .env.example    samo imena; vrijednosti u secret storeu
```

pnpm monorepo, TypeScript strict, ESLint, Prettier.

### Tri okruženja

- **Lokalno (od prvog dana):** Postgres u Dockeru, fake konektori u memoriji, dev prijava, bez pravih ključeva.
- **Staging (od sedmice 1):** managed Postgres (Neon, Supabase ili Azure), Monday test workspace s kopijama boardova, deploy na svaki merge u main.
- **Produkcija (nakon K4):** živi board, ručni deploy, ID-jevi boardova i kolona u `env_settings`, odvojeni od testa.
- Hosting prod: Azure Container Apps ako su Microsoft firma, inače Fly.io ili Render.

## Model podataka — 18 tabela

9 iz TECH STACK-a + 9 novih (odluke od 2. 11., označeno _novo_). Centar je `requests`; `projects` nastaje iz odobrenog zahtjeva i nosi broj svog brenda.

**Zahtjev (3)**

- `requests` — jedan red po zahtjevu: requester, ko je poslao (u ime drugoga), stanje. Nastaje prije bilo kakvog vanjskog upisa.
- `brief_versions` — svaka verzija briefa kao JSONB, s verzijom forme. Ništa se ne briše.
- `approvals` — ko je odobrio koju verziju i kad, i hitno. Bez reda nema kreiranja.

**Projekat (4)**

- `projects` — broj, ime, brend, datumi, vlasnik. Jedan red po odobrenom zahtjevu.
- `deliverables` — stavke i SKU-ovi. Prazno u prvoj verziji.
- `project_members` _novo_ — ko vidi koji projekat. Filtrira se na serveru.
- `feedback` _novo_ — ocjena i komentar requestera nakon odobrenja. Jedan po projektu.

**Pouzdanost (3)**

- `operations` — svaki vanjski poziv i ID koji je vratio. Jedinstven ključ `(request_id, operacija)`.
- `outbox` — poslovi koji čekaju, s vremenom sljedećeg pokušaja. Ista transakcija kao stanje.
- `events` — ko, kad, prelaz, verzija briefa, greška, trošak AI poziva. Samo dodavanje (append-only).

**Konfiguracija (5)**

- `work_types` _novo_ — šema pitanja, obavezna polja, default subitemi, ko odobrava. Zahtjev pamti verziju forme.
- `brands` _novo_ — kod, broj, ime, folder na Driveu. Uvoz iz Sheet brojača (kolone B, C, D).
- `brand_aliases` _novo_ — podbrend ili drugo ime koje vodi na brend. Novo ime bez veze čeka admina.
- `counters` — brojač po brendu. Mijenja se samo pod lockom.
- `env_settings` _novo_ — board, grupa i ID-jevi kolona po okruženju. Test i produkcija se ne miješaju.

**Ljudi (3)**

- `people` _novo_ — email, ime, odjel, Monday ID, Slack ID, Google email, stanje uparivanja. Upareni po emailu iz prijave.
- `roles` _novo_ — requester, creative tim, PM i creative manager, admin.
- `person_roles` _novo_ — ko ima koju ulogu. Uloga određuje šta osoba vidi i smije.

### Dodato van plana (6. 11.)

- `chats` _novo_ — jedan intake razgovor: vlasnik, naslov, stanje briefa (vrsta, odgovori, izvori), veza na draft zahtjeva, vrijeme zadnje poruke, `deleted_at`. Privatan po nalogu, provjera na serveru.
- `chat_messages` _novo_ — poruke razgovora, red po red, samo dodavanje.
- Zašto posebno, a ne u `requests`: chat počinje prije nego što se zna vrsta posla, a treba lista „Recent chats“ iz wireframea.
- Model čita zadnjih 30 poruka; sve odgovoreno do tada ide kroz stanje, pa duži chat ne poskupljuje poziv.
- Otvoreno za Anu: smije li creative tim ili PM vidjeti razgovor iz kojeg je nastao brief, i koliko dugo čuvamo obrisane i nedovršene chatove.

## Pristupi — šta treba i od koga

| Do               | Šta                                                             | Od koga               | Otključava                                               |
| ---------------- | --------------------------------------------------------------- | --------------------- | -------------------------------------------------------- |
| pet 6. 11. (K1)  | Monday test workspace s 3–4 kopirana boarda                     | Nabor                 | Monday konektor, mapiranje kolona, smoke test            |
| pet 6. 11. (K1)  | Monday developer pristup i servisni korisnik                    | Nabor                 | Prave upise u Monday                                     |
| pet 6. 11. (K1)  | Novi OpenAI ključ, upisan pravo u secret store                  | Nabor                 | Prave AI pozive. Ključ poslan preko Slacka se mijenja    |
| pon 9. 11.       | Prijava: Microsoft ili Google, i ime IT admina                  | Ana ili njihov IT     | Prijavu, email, uparivanje ljudi, izbor hostinga za prod |
| pon 9. 11.       | Google servisni nalog na shared driveu i pristup Sheetu brojača | Google admin          | Drive, Docs, uvoz brendova                               |
| sri 11. 11. (K2) | PDF o prošlim projektima: vrste zahtjeva, pitanja, problemi     | Ana, s našim promptom | Prave forme po vrsti posla                               |
| pet 13. 11.      | Odobrenje Slack bota u workspaceu                               | Slack admin (Ana)     | Interne kanale za creative tim                           |
| pet 13. 11.      | Lista 23 automatizacije na Creative Projects boardu             | Ana ili Nabor         | Da naš upis ne pokrene njihove automatizacije pogrešno   |
| pet 13. 11.      | Lista brendova i podbrendova, i ko je vlasnik liste             | Ana                   | Mapiranje brendova                                       |
| pet 20. 11. (K3) | Odluka o numeraciji pri migraciji: duplikat 275, prefiks „01-.“ | Ana i Nabor           | Migraciju trenutnih projekata                            |

**Naše, otvori odmah:** GitHub repo + Actions (lint, typecheck, test, build, deploy na staging); hosting za staging (isti image svuda); managed Postgres (Neon/Supabase/Azure), lokalno Docker; Sentry (jedan projekat za web i worker); secret store (platformin ili Doppler), u repou samo `.env.example`.
Dok klijentovi pristupi ne stignu: fake konektori, dev prijava i tri privremene vrste posla.

## Prva sedmica (2.–6. 11.)

- **pon 2. 11. — Zadaci sa sastanka:** prompt za Anin GPT (pregled prošlih projekata u jedan PDF s vrstama zahtjeva i formi, pitanjima koja se ponavljaju i problemima); recap sastanka za tim (odluke, zadaci, rok 11. 12., šta tražimo od koga); zahtjevi za pristupe Naboru, Ani i Google adminu.
- **uto 3. 11. — Kostur repoa:** pnpm monorepo, TS strict, ESLint, Prettier, apps i packages; GitHub Actions: lint, typecheck, test, build.
- **sri 4. 11. — Baza i staging:** Postgres na stagingu, Drizzle šema v1 i migracije; jedan image za web i worker, deploy na staging; Sentry i strukturirani logovi (pino).
- **čet 5. 11. — Jezgro:** atomična numeracija (lock na redu brojača) + test s dva istovremena zahtjeva; outbox, pg-boss i tabela operations za idempotentnost; stanja zahtjeva kao typed mapa prelaza, s upisom u events.
- **pet 6. 11. (K1) — Konektori i pravila:** interfejsi za Monday, Drive, Docs, Slack i email s fake verzijama u memoriji; format šeme za vrstu posla (Zod i JSON) i tri privremene vrste: **video, social post, retail i POS print**; radni dani po Texasu (US praznici) i pravilo za hitno ispod 5 radnih dana; provjera K1.
- **Sljedeće (kad ostane vremena ili od pon 9. 11.):** Auth.js kostur s dev prijavom; OpenAI omotač sa structured outputom i logom troška po pozivu; uvoz brendova iz Sheet brojača (kolone B, C, D) čim stigne pristup.

**Definition of done za sedmicu 1:** push na main prođe lint, typecheck, test i build i završi na stagingu; dva zahtjeva u istoj sekundi dobiju različite brojeve; fake Monday i Drive prime poslove iz outboxa bez duplikata.

## Šest pravila (od prvog commita)

1. **Ništa na živom boardu.** Sve na kopije u Monday test workspaceu dok ne prođu testovi prihvatanja na K4.
2. **Ključevi samo u secret storeu.** Nikad u repou, promptu ni Slacku. Ključ koji je prošao kroz Slack se mijenja.
3. **Svaki vanjski upis ide kroz outbox.** Ključ `(request_id, operacija)` u operations sprečava duplikat kad se korak ponovi.
4. **AI ne izmišlja.** Popunjava samo ono što piše u tekstu requestera. Ostalo ostaje prazno i označeno.
5. **Test i produkcija se ne miješaju.** ID-jevi boardova, grupa i kolona u `env_settings`, posebno za svako okruženje.
6. **Vidljivost se provjerava na serveru.** Svaki upit se filtrira po ulozi i članstvu; AI nikad ne dobije projekat koji osoba ne smije vidjeti.
