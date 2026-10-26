# FalaCanoas: Identity & Trust (decision brief)

**Rewritten and fact-checked 2026-10-12.** Replaces the 1,250-line draft (kept as `README.draft-v0-original.md`, safe to delete).
> **Superseded in part by `research/DECISIONS.md`, round 18 (2026-10-12).** Where this brief and round 18 differ, round 18 wins:
> - **Tiers (2 and 4.1):** civil identity no longer unlocks confirming, voting or the forum, and T2-lite is dropped. A phone code is enough for the whole loop. Nível 2 is optional, adds only weight or limits, and is not in the MVP.
> - **D1:** a phone-verified pin counts on the Placar after one independent confirmation. That means another account whose phone was verified at least 72 hours earlier.
> - **Phone storage (4.3):** the phone is always encrypted in a separate vault (for traceability), not only for notifications.
> - **CPF collision (4.4):** a new valid proof moves nível 2 to the new account in one transaction; it doesn't hold the account for review.
> - **Path A (4.1):** it is a pilot. It proceeds only if the full CPF is read from the signer's certificate and matches the declared one; a visual check on VALIDAR is no substitute.
> - **Legal basis for gov.br signatures:** corrected below to MP 2.200-2 art. 10 §2.

**Legend:** **[✔]** read in a primary source on 2026-10-12 · **[~]** secondary source or search snippet only · **[não verificado]** could not confirm · **não público** = no public price found.

---

## 1. TL;DR

1. **Login Único (gov.br) is closed to FalaCanoas.** gov.br's own FAQ: integration is "exclusiva" to public administration. Portaria SGD/MGI nº 7.076/2024 is real, but it needs an official government domain. The only path is a Prefeitura-sponsored project, and the municipality must first join the Rede Nacional de Governo Digital. [✔]
2. **OTP prices, corrected.** WhatsApp *authentication* in Brazil = **US$0.0068 = R$0.035 per delivered message** (Meta rate card, effective 2026-10-01). SMS = **US$0.0599** (Twilio list), about R$0.31. That is ~9x, not 7-8x. 5,000 verifications cost about R$175 (WhatsApp) vs about R$1,540 (SMS). BSP markups: não público. [✔]
3. **A phone code proves a phone**, not a person, uniqueness or Canoas residency. **A typed CPF proves nothing** (CPFs are not secrets). Make CPF enter the system only through a proof path, never as a text field.
4. **Two realistic proof paths for Tier 2.** (A) A gov.br-signed declaration (prata/ouro), validated at validar.iti.gov.br: free, and acceptable if our terms of use accept it (MP 2.200-2 art. 10 §2), but no API was found, so it is manual at first. *Corrected 2026-10-12:* the earlier basis was Lei 14.063 art. 4 II, but its art. 2, parágrafo único, II "a" excludes interactions between private parties. (B) A KYC vendor such as Didit (free up to 500 full KYCs/month), but the selfie is sensitive biometric data. **Skip** the Pix R$0,01 trick and a direct Serpro contract. *2026-10-26 (DECISIONS round 24): the founder dropped A for its friction; B is the only path.*
5. **Draft prices not supported:** Serpro "~$0.30" and Didit "$0.33". Didit list is $0.15 + $0.10 + $0.05 = $0.30. Serpro Consulta CPF bands are R$0.26-0.66 per query [~]. Datavalid is não público (not readable).
6. **Hashes:** CPF and phone numbers have only ~10^9-10^10 possible values, so an unkeyed hash is reversible in minutes. Use **HMAC-SHA256 with secret keys kept outside the DB**. It is still personal data under LGPD.
7. **Guest pins** are held for moderation and excluded from the scoreboard until 2 distinct verified neighbours confirm.
8. **Prefeitura account:** corporate e-mail on @canoas.rs.gov.br, a signed ofício checked at ITI, a callback to a number from the official site, and a public attestation on the Prefeitura's channels. Reclame Aqui does an *initial* biometric check of a legal representative plus *monthly automated* CNPJ/reputation checks. The draft's "monthly biometric" was wrong. [✔]
9. **Legal fixes:** breach duty is **LGPD Art. 48** (the draft said Art. 17). ANPD Res. 15/2024: 3 business days to ANPD and affected users. Fine: 2% of Brazilian revenue, **capped at R$50M per infraction**. Marco Civil Art. 15 governs log retention. The ECA Digital has been in force since 2026-03-17.
10. **Timing:** the 2026 runoff is **25 Oct** [✔ TSE]. Ship an "election mode" from day one (section 6).

---

## 2. Decisions taken (inputs) and open questions

- **Public identity:** pseudonym + bairro. The real identity is never public.
- **Tiers:** phone code to post; stronger proof later unlocks confirming pins, voting and the forum; CPF optional, hash only.
- **Guests** may drop pins (moderated, unscored until confirmed). **Prefeitura** may get a verified institutional account.
- **Open decisions for the founder:**
  - **D1.** Do pins from phone-verified (Tier 1) users count on the scoreboard immediately? Recommended: no. They count after 1 confirmation from another Tier 2 user or a Prefeitura acknowledgment, because a phone is cheap to get.
  - **D2.** Offer path B (vendor biometrics) at launch? Recommended: launch with A + D (see 4.1), add B only after counsel signs off.
  - **D3.** WhatsApp first needs a WhatsApp Business account. Can an unincorporated volunteer group get one? [não verificado] Fallback: SMS-only (~9x cost) or reverse-OTP (4.2).

---

## 3. Option comparison

| Option | Real person | Uniqueness | Canoas residency | Cost | Friction | Data stored by us | Legal risk |
|---|---|---|---|---|---|---|---|
| **Phone code, WhatsApp** | Low (a phone, not a person) | Medium (1 number ~ 1 account; numbers are cheap and get recycled [não verificado]) | None (DDD 51 is not Canoas) | R$0.035/msg [✔] + BSP markup (não público) | ~10 s | `phone_hmac` | Low (consent); needs a WABA |
| **Phone code, SMS** | same | same | None | US$0.0599 ≈ R$0.31/msg [✔ Twilio list]; local aggregators: não público | ~10-30 s | `phone_hmac` | Low |
| **Guest (no ID)** | None | None | None (pin point only) | R$0 | lowest | edit-token hash | Low; heavy moderation load |
| **gov.br Login Único** | High | High | Low | n/a | n/a | n/a | **Not available** to private projects [✔] |
| **A. gov.br-signed declaration** (ITI validator) | High (prata = bank-validated; ouro = facial biometrics [~]) | High (`cpf_hmac`) | None | R$0 | High (several steps; no API found, manual check) | `cpf_hmac` only | Low-Med; acceptance by the parties under MP 2.200-2 art. 10 §2 [✔] (corrected: Lei 14.063 art. 4 II excludes private-party interactions, art. 2, parágrafo único, II "a") |
| **B. KYC vendor** (Didit: doc + selfie) | High | High (doc-number hash) | Low (document address not guaranteed) | Free ≤500 full KYC/month, then US$0.30 list [✔] | 1-3 min | `cpf_hmac`; **vendor** holds face data | Med-High: biometrics are sensitive (LGPD Art. 5 II); DPA/hosting [não verificado] |
| **Serpro Datavalid / Consulta CPF direct** | Medium (data match, no possession proof) | Medium | None | Consulta CPF R$0.26-0.66 [~]; Datavalid não público | Needs contract; eligibility [não verificado] | n/a | High; name/DoB/CPF are not secret |
| **Pix R$0,01** | Medium (bank-KYC'd payer) | Medium (receipts show CPF masked [~]) | None | ~R$0 + a payment account [não verificado] | Medium | name + masked CPF (more than needed) | Medium; no primary source on bank terms: **skip** |
| **Comprovante de residência** (manual) | Medium (forgeable) | Low | **Medium-High (only direct signal)** | volunteer time | High (days) | document (delete after review) | High LGPD exposure; v2 at most |
| **Neighbour confirmation** (device GPS ≤200 m) | n/a | n/a | Medium (GPS is spoofable) | R$0 | Low | nothing persistent | Low |

**Dropped from the draft:** Sign in with Google/Apple (leaks e-mail, conflicts with pseudonym + phone), e-mail-only, the Fala.BR/Waze/Nextdoor/Fogo Cruzado/Onde Fui Roubado/Change.org survey (not load-bearing and mostly unverified), phone-call OTP, CEP checks, and TinEye reverse search.

**Residency honesty:** none of the cheap proofs verify "lives in Canoas". Tier 2 residency is *soft*: declared bairro + presence at confirmation + consistent behaviour. Only a manual comprovante verifies it directly.

---

## 4. Spec: tiered model

### 4.1 Tiers

| Tier | Needs | Unlocks | Does not unlock |
|---|---|---|---|
| **T0 Guest** | CAPTCHA-class challenge; photo + category + point | Create a pin (held for moderation); secret tracking link to view status and delete it | Comments, votes, forum, scoreboard |
| **T1 Morador** | Phone code (WhatsApp, SMS fallback) + unique pseudonym + bairro from the Canoas list + "I am 18+" tick | Post pins (post-moderation), edit/delete own pins, update own pins | Confirm others, vote, forum |
| **T2 Vizinho verificado** | T1 for ≥7 days + **one proof path** below | Confirm pins, vote, forum, flag | - |
| **TP Prefeitura** | Section 5 | Reply, set status, label | Delete or edit citizen content |
| **Mod** | Named volunteer, TOTP/passkey 2FA, ≤3 people with prod access | Approve/reject, blur, ban | - |

**T2 proof paths** (all produce `cpf_hmac` or nothing):
- **A. gov.br-signed declaration.** We generate a PDF with a one-time nonce; the user signs it in the Portal de Assinaturas Gov.br (needs prata/ouro [✔]) and uploads it. A verifier checks it at validar.iti.gov.br [✔ it validates "GOV.BR" signatures; **no API mentioned**], extracts name + CPF, then the system stores only the HMAC. Whether the CPF appears in the signature certificate is [não verificado]. **Spike first** with 5 real accounts.
- **B. KYC vendor** (Didit free tier). Store only `cpf_hmac` and a vendor reference; ask the vendor for deletion. Counsel review first (D2).
- **D. Reputation-only "T2-lite"** (keeps CPF truly optional): ≥30 days, ≥5 approved pins with no upheld flags, 2 vouches from T2. Unlocks **vote + forum, not confirm**, because confirmation moves the scoreboard.
- C (comprovante de residência) is deferred to v2.

### 4.2 Phone verification

- E.164 normalisation, including the Brazilian 9th digit. 6-digit code, TTL 10 min, single use, 5 wrong attempts = 1 h lock.
- **WhatsApp first, SMS fallback.** Per-DDD and monthly **budget kill-switch** against SMS-pumping fraud.
- **Reverse-OTP option:** the user sends a prefilled code to our WhatsApp number and we reply in-window. Meta's pt-BR docs say the first 1,000 service messages/month per number are free, then charged [✔ docs, but one fetch summary said "free"; the Oct-2026 rate card shows a Service column of US$0.0068, so confirm before relying on it].
- Login = the user types the number, we compute the HMAC to find the account, and send the code to the typed number. **No plaintext phone is needed at rest.**

### 4.3 Data stored

| Data | Form | Why | Retention |
|---|---|---|---|
| `account_id` | random UUIDv4 | key | until deletion |
| pseudonym, bairro (enum), tier, created_at | plain | public/UX | until deletion |
| `phone_hmac` + `key_ver` | 32 B | uniqueness, login lookup | until deletion |
| `phone_enc` | AES-256-GCM, separate key | **only if** user opts into notifications | until opt-out |
| `cpf_hmac` + `key_ver` + `proof_method` + `proof_at` | 32 B | uniqueness at T2 | until deletion |
| Pin exact lat/lon, precise timestamp | access-controlled column (app-level encrypted) | Prefeitura/mods | until pin deletion |
| Pin public cell, day-level date, re-encoded photo | plain | public | until pin deletion |
| Guest edit token | hash only | delete/track | until pin deletion |
| Security logs (IP, UA) | minimal | abuse control | short window, see 7 |

**Never stored:** real name, raw CPF, document or selfie images, utility bills, original photo files, e-mail (v1), device-fingerprint libraries.

### 4.4 Hashing and peppering (CPF and phone)

```
phone_hmac = HMAC-SHA256(K_phone[v], "fc:phone:v1|" + e164)
cpf_hmac   = HMAC-SHA256(K_cpf[v],   "fc:cpf:v1|"   + 11_digits)
# optional extra cost for CPF (rare op): Argon2id(m=19MiB, t=2, p=1, fixed app salt) then HMAC
```
- **Why keyed:** a valid CPF has only ~10^9 values (9 free digits + 2 check digits); a mobile number ≈ 67 DDDs x 10^8 ≈ 7x10^9. An unkeyed SHA-256 falls to enumeration in minutes. The secret key is the real protection.
- **Keys:** 32 random bytes each, **distinct per purpose**, stored in a secrets manager or sealed file *off the DB host and out of backups*; ideally use a KMS MAC operation so the key never leaves. Never in the repo (this project is open source: assume the attacker reads the code).
- **Rotation:** keep `key_ver`; re-hash lazily (phone at next login, CPF at next proof). We cannot re-hash without the plaintext.
- **Parameters:** the draft's PBKDF2 at 100k iterations is outdated; OWASP says 600,000 for PBKDF2-HMAC-SHA256, or Argon2id m=19 MiB, t=2, p=1 [✔].
- **Legal nature:** a keyed hash of an enumerable identifier is *pseudonymised* personal data, not anonymised (LGPD Art. 12: reversible with "esforços razoáveis") [✔].
- **Collision** (CPF already used): hold for manual review. Do not auto-ban; the victim may be an impersonated person.
- **Typed-CPF squatting:** if CPF were self-typed, an attacker could register a victim's CPF and block them. This is another reason CPF only enters via a proof path.
- Keep an HMAC tombstone of banned identities (fraud-prevention basis) [jurídico a confirmar].

### 4.5 Photos and EXIF

1. Accept JPEG/PNG/HEIC/WebP; limit size and dimensions; process in memory or tmpfs.
2. Decode, **apply EXIF orientation to the pixels**, and read `DateTimeOriginal` + GPS **transiently**.
3. **Re-encode from decoded pixels** with a metadata-less writer (this drops EXIF/XMP/IPTC/MakerNotes/embedded thumbnails). Assert there are no APP1/APP13 segments after encoding. Do not copy metadata through.
4. Discard the original at once. **Never log metadata.**
5. Use the transient readings as *signals*, not hard rejects: photo older than 72 h, EXIF GPS >300 m from the pin, or outside the Canoas polygon = "hold + ask" (gallery photos are legitimately old).
6. Store a perceptual hash to catch duplicates and recycled photos.
7. Give users a client-side blur tool (faces, plates, house numbers). Moderators can blur too.

### 4.6 Location fuzzing and pins near home

- **Public map = a deterministic ~100 m grid-cell centre** (plus street/trecho label) for pins flagged "near my home". **Never re-randomise per view:** repeated queries average the noise back to the true point. Choose once and persist.
- **Auto-flag trigger:** ≥3 of an author's pins within 150 m in 90 days. Move all of them to a 250 m cell and tell the author privately.
- **Exact coordinates** go only to TP and mods (authenticated), never to the public API.
- **Prompt at creation:** "Is this in front of your home?" (default no).
- **Dates** are day-level in public. **No per-author timeline endpoint** (only counts and filters by bairro/category).
- The draft's blanket 200-500 m fuzz and 24-72 h delay would destroy usefulness for potholes. Apply them only where a risk signal exists.

### 4.7 Rate limits

| Scope | Limit |
|---|---|
| OTP | 3 sends/phone/h, 10/phone/day; 20 requests/IP/h; global per-DDD budget |
| Signup | 2 accounts/IP/day |
| Guest pins | 3/day per IP + cookie, 10/week per /24; **max 100 pending globally**; challenge on each |
| T1 | 5 new pins/day, 20/week; 10 updates/day on own pins |
| T2 | 10 confirmations/day; 50 votes/day; 20 forum posts/day, 3 new threads/day |
| Pair rule | A may confirm B's pins ≤2 times / 30 days (and vice versa) |
| Moderation SLA | 48 h target for guest queue; if breached, stop accepting guest pins (visible banner) |

### 4.8 How guest pins get confirmed

1. Guest posts; the pin is **pending** (invisible) in the mod queue. The guest receives a **secret tracking link** (hash stored) to see status or delete.
2. A volunteer approves: real, in Canoas, urban-issue category, no personal data. The pin is now **visible as "Aguardando confirmação"** (hollow marker), **excluded from the scoreboard and Prefeitura stats**.
3. **Confirmation** = a distinct T2 user (not the author) taps "Eu vi isso". **In-person** = device GPS ≤200 m (weight 1.0). **Remote** = same bairro or adjacent (weight 0.5; a fresh photo adds 0.25).
4. **Threshold ≥1.0 from ≥2 distinct confirmers** (election mode: also ≥1 in-person). At threshold the pin is **Confirmed** and counts.
5. **Anti-ring:** confirmers with an account <14 days at T2 weigh 0.5; accounts sharing a coarse network/device cluster count as one; 10% random re-check by a moderator; 3 reversed confirmations = confirm right suspended for 30 days.
6. **Expiry:** unconfirmed pins are archived after 30 days (not deleted). Prefeitura may reply to unconfirmed pins, but the reply is marked "não confirmado".

---

## 5. Verifying the Prefeitura account

**Facts:** canoas.rs.gov.br is the official site; it shows an @canoas.rs.gov.br address domain, the 0800-510-1234 service line, an Ouvidoria link via Fala.BR, and the Diário Oficial do Município at sistemas.canoas.rs.gov.br/domc [✔ one fetch].

**Procedure (suggested, not a legal requirement):**
1. **Request** from a mailbox on `@canoas.rs.gov.br` (Gabinete, Ouvidoria or a Secretaria). Verify mailbox control with a one-time link. If the request arrives by e-mail, check SPF/DKIM/DMARC.
2. **Ofício** on letterhead, signed by the secretário/chefe de gabinete, naming the unit, up to N operators and their corporate e-mails. The signature must be gov.br or ICP-Brasil and **checked at validar.iti.gov.br** [✔ validator; Portaria ITI nº 22/2023].
3. **Appointment check:** find the signatory's nomeação in the Diário Oficial.
4. **Callback** to the unit using a number from the official website or the 0800 line, **not** from the ofício.
5. **Public attestation:** the Prefeitura posts one line on its official channel linking the account handle. This is the strongest anti-impersonation signal.
6. **Operators** are named individuals with mandatory TOTP/passkey (not phone-only). Roles: reply, set status (em análise / resolvido), no deletion. The label reads "Prefeitura de Canoas · Secretaria X". The status-change history is visible on the pin.
7. **Renewal:** yearly by new ofício; revoke when an operator leaves; quarterly mailbox liveness check.
8. **Reserve** names containing "Prefeitura/PMC/oficial/Canoas" so that ordinary users cannot take them.

**Precedents:**
- **Reclame Aqui "RA Verificada"** [✔]: confirms the company *exists*. Initial biometric validation of "membro do quadro societário ou representante legal", then a **monthly automated** CNPJ check against the Receita, a reputation/activity analysis and security checks. **No monthly biometric.** It certifies the company, not the individual user.
- **Colab** [~]: Prefeituras get a monitoring panel with protocol numbers. How Colab verifies institutional accounts is [não verificado]. Citizen signup was reported in 2021 (Palmas press) to require **name, CPF, e-mail and address, with CPF and e-mail mandatory**. This contradicts the draft ("e-mail only"). Re-check in the current app.
- **Not recommended:** the draft's CNPJ + liveness via Didit/CAF. It is costly, puts civil servants' faces with a vendor, and the ofício + mailbox + callback path is stronger evidence of *authority*.
- **Login Único** becomes possible only if the Prefeitura itself hosts/sponsors the service on a government domain (section 1).

---

## 6. Threat model

**Election mode** (switch on now; also Aug-Oct 2028 for the municipal elections [inferência, 4-year cycle]): guest pins hidden until confirmed; confirmation needs ≥1 in-person; T2 requires 14 days instead of 7; forum slow-mode; scoreboard shown as daily snapshot, no live ranking. 2026: 1st round 4 Oct, **runoff 25 Oct** [✔ TSE].

**1. Retaliation and doxxing** (neighbour, contractor, local power; severity high)
- Pseudonym + bairro only. Prefeitura sees the pseudonym and exact pin, **never** phone or CPF.
- Fuzz near-home pins (4.6); no per-author timeline; day-level dates; blur faces/plates/house numbers; takedown within 24 h.
- **Guest mode is the anonymity channel.** Promote it for sensitive reports.
- **Exclude public-security/crime categories at launch** (reduces exposure to armed groups).
- Residual: small bairro + topic can still re-identify; courts can order logs (Marco Civil Art. 15 §1).

**2. Sock puppets and scoreboard gaming** (campaign operatives, election mode)
- Cheap phones do not unlock confirmation; **T2 needs identity proof + unique `cpf_hmac`**.
- Pair rule, weights, 10% audits, ring detection (burst signups, shared network, near-duplicate text, same photo hash).
- Scoreboard counts only Confirmed or Prefeitura-acknowledged pins, normalised per capita with the method published.
- Residual: paid real people with real CPFs. This cannot be fully stopped, only made costly.

**3. Fake, old or other-city photos**
- EXIF signals (4.5), perceptual-hash duplicates, GPS presence at confirmation, mod spot checks.
- "Resolved" status requires a fresh after-photo. Strike ladder: warn, 7-day pause, ban.

**4. Location inference** (pin clusters, timestamps, photo content, API enumeration)
- Deterministic fuzz, cluster trigger, no timeline API, day-level dates, rate-limited and paginated API with no bulk export of exact data. Strip EXIF and blur.

**5. Breach** (DB, backups, photo bucket)
- Minimal data (4.3); keys off-host; app-level encryption of exact coordinates and `phone_enc`.
- Encrypted backups with a ≤30-day window; 2FA for admins; ≤3 prod admins; audit logs; secrets never in the repo.
- Written incident runbook: notify ANPD **and** users within **3 business days** of confirming personal data is affected (Res. CD/ANPD 15/2024 [~]); keep an incident record.
- Residual: hashed CPFs and phones are still personal data. If the DB **and** the key leak, they are reversible.

**6. Abuse of the verification channel**
- **OTP/SMS pumping** (cost attack): per-DDD caps, budget kill-switch, WhatsApp-first.
- **Impersonation of the Prefeitura:** reserved names plus section 5.

---

## 7. Legal checklist (for counsel; none of this is legal advice)

- **Basis:** consent (LGPD Art. 7 I) for phone/CPF. Biometrics are **sensitive** (Art. 5 II) [✔], so path B needs an Art. 11 basis and a vendor DPA.
- **Hashes** stay personal data (Art. 12) [✔].
- **Breach:** Art. 48 [✔]; deadline from Res. CD/ANPD 15/2024: 3 business days (doubled for "small-scale" agents under Res. 2/2022: 6 days [~]). Whether FalaCanoas qualifies is [não verificado].
- **Fines:** Art. 52 II: up to 2% of Brazilian revenue, **capped at R$50M per infraction** [✔]. How the base applies to a non-profit with no revenue is [não verificado].
- **Logs:** Marco Civil Art. 15 obliges *organised, professional, for-profit* legal entities to keep access logs for 6 months. Others only by court order (§1) [✔]. A volunteer project is probably outside the caput [jurídico a confirmar]. Keep IP logs to a short window and document the choice. The draft's "never log IP" is a policy choice, not a legal requirement.
- **Minors:** the ECA Digital (Lei 15.211/2025, in force 2026-03-17; Decreto 12.880/2026) applies to services "likely accessed" by minors, and the forum probably is [~]. Use an 18+ declaration plus counsel review of age-assurance duties.
- **Electronic signatures:** MP 2.200-2 art. 10 §2 lets parties accept other means of proving authorship and integrity, including certificates not issued by ICP-Brasil, such as gov.br's [✔]. Put that acceptance in the terms of use. *Corrected 2026-10-12:* Lei 14.063 art. 4 II does not apply directly between private parties (its art. 2, parágrafo único, II "a").

---

## 8. Next steps

1. **Spike (1-2 days):** 5 real gov.br prata/ouro users sign the nonce PDF; test validar.iti.gov.br and whether the CPF is readable. Decide A.
   - *Round 18:* this is the path A pilot, and it starts with one PDF signed by the founder.
   - It validates PAdES, the chain, revocation, the signed revision, `userId`, the nonce and the expiry.
   - A goes on only if the certificate's full CPF matches the declared one.
2. **Spike:** WhatsApp Business account via a BSP for an unincorporated group, plus real BSP markup. Fallback: SMS-only or reverse-OTP.
3. **Prefeitura:** send the section 5 request to Gabinete/Ouvidoria; ask about the public attestation.
4. **Counsel (1 h):** items in section 7 + D2.
5. **Implement** the 4.4 key scheme and 4.5 pipeline before the first real user.

---

## 9. Verification log

*Method note: about 50 searches/fetches. Prices were read from Meta's rate-card files, Twilio's page and Didit's page. Several Serpro/gov.br pages were JS-rendered or returned 403, hence the [~] marks.*

| Claim (draft) | Finding | Source |
|---|---|---|
| WhatsApp OTP "$0.0068/msg" | **Correct**, but "R$0.042" was wrong: BRL authentication = **R$0.035**. Eff. 2026-10-01: marketing 0.0625, utility/auth/service 0.0068 USD. Authentication-international n/a for Brazil [✔] | Meta rate-card files linked from https://developers.facebook.com/docs/whatsapp/pricing/ |
| WhatsApp "7-8x cheaper" | 0.0599 / 0.0068 = **~8.8x** | computed |
| WhatsApp service messages free? | Docs: "all non-template messages are free"; pt-BR docs: first 1,000 service msgs/month per number free, then charged; rate card has a Service column (BR 0.0068). Conflict, so confirm | same URL (pt-BR raw page) |
| SMS "$0.061" | Twilio list **US$0.0599** outbound ≈ R$0.31 (implied rate 0.035/0.0068 = R$5.15/US$). The draft's "R$0.37-0.40" was inconsistent. Local aggregator current prices: **não público** (the Zenvia figures I found were undated press) | https://www.twilio.com/en-us/sms/pricing/br |
| Serpro Consulta CPF/Datavalid "~$0.30" | **Not supported.** Consulta CPF bands in R$ per query: 0.6591 (0-999), 0.5649 (1k-9,999), 0.3557 (10k-49,999), 0.2616 (50k-99,999) [~ search relay of Loja Serpro; page unreadable]. Datavalid first band R$0.80 cadastral / R$1.68 facial reported by a search snippet [não verificado]. Datavalid FAQ gives no prices and says to contact Serpro's international team; eligibility for a private volunteer project [não verificado] | https://www.loja.serpro.gov.br/consultacpf (403/JS) ; https://apicenter.estaleiro.serpro.gov.br/documentacao/datavalid/en/faq/ |
| Didit "$0.33" | **Not supported.** ID $0.15 + liveness $0.10 + face match $0.05 = $0.30; **500 full KYC/month free**; Brazil Receita lookup $0.40 per answered attempt | https://didit.me/pricing [✔] |
| Login Único: "Portaria SGD/MGI nº 7.076" | Act **exists** (2 Oct 2024); acesso.gov.br cites it (art. 3º) and requires hosting on an official government domain. Scope = federal administration [~] | https://acesso.gov.br/roteiro-tecnico/solicitacaocredencialprocesso.html |
| Non-government entity can integrate? | **No.** FAQ: "Não. A integração é exclusiva para" federal direct/indirect administration and the other federated entities. Municipal bodies must first join the Rede Nacional de Governo Digital | https://www.gov.br/governodigital/pt-br/identidade/identidade-digital-para-gestores-publicos/duvidas-frequentes-do-ecossistema-da-identidade-digital-gov-br [✔] |
| Login Único returns "bronze: name/CPF…, prata: + address" | **Unsupported**; the FAQ does not list data per level. Prata = bank validation (17 banks [~]); ouro = facial biometrics in Meu gov.br [~] | gov.br/ITI pages via search; **bronze/prata data scopes: [não verificado]** |
| "175M users = 82%" | 175M users on 2026-03-24 [~] (MGI release; page body unreadable, figure via search snippets). "82%" = my arithmetic on IBGE 2025 est. 213,421,037 (82.0%; vs 2026 est. 214.2M: 81.7%). **Accounts ≠ unique living people** | https://www.gov.br/gestao/pt-br/assuntos/noticias/2026/marco/gov-br-alcanca-a-marca-de-175-milhoes-de-usuarios ; https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2025/estimativa_dou_2025.pdf [~] |
| gov.br level breakdown | Ouro **83.4M** (Mar 2026) ≈ 48% of accounts [~]. Bronze/prata split for Mar 2026: [não verificado] | same MGI release via search |
| "CPF 216.8M vs 212.6M population" | TCU: **~216M** regular CPFs vs **~203M** (Census 2022; 203,080,756) = ~13M surplus, many deceased CPFs still active. 212.6M was a 2024 *estimate*, so the draft mixed years. Ratio ≈ 1.06, not 1.02. "98-99% adult coverage" and "95% Datavalid match": [não verificado] | https://portal.tcu.gov.br/imprensa/noticias/tcu-audita-base-de-cadastro-de-pessoas-fisicas-da-receita-federal/ [✔] |
| Reclame Aqui "monthly CNPJ + biometric" | **Half right.** Initial biometric of a sócio/representante legal; monthly *automated* CNPJ/Receita check + reputation + security checks. No monthly biometric | https://manual.reclameaqui.com.br/ra-verificada [✔] |
| Colab "e-mail only, no CPF" | **Contradicted** by 2021 press: name, CPF, e-mail, address; CPF and e-mail mandatory. Current app [não verificado]. Prefeituras use a monitoring panel [~] | https://www.conexaoto.com.br/2021/10/22/rede-social-da-prefeitura-de-palmas-colab-ganha-adesao-da-populacao |
| gov.br-signed PDF via validar.iti.gov.br: feasible/lawful? | **Lawful:** advanced signatures valid when the parties accept them (MP 2.200-2 art. 10 §2; corrected from Lei 14.063 art. 4 II, which excludes private-party interactions) [✔]. **Feasible but manual:** validator checks ICP-Brasil and GOV.BR signatures, no API mentioned; "nenhuma informação ou arquivo são armazenados" [✔]. Signer needs prata/ouro; cert valid 1 year [✔]. The *signing* integration API is public-bodies-only [✔]. CPF in cert: [não verificado]. Third-party code reads it in clear from SubjectAltName OID 2.16.76.1.3.1 (birth date + CPF). The gov.br chain is its own PKI (Raiz, Intermediária, AC Final do Governo Federal v1), not ICP-Brasil, with a public CRL. To be tested on a real signed PDF (DECISIONS round 18, path A pilot). | https://validar.iti.gov.br ; https://www.gov.br/iti/pt-br/assuntos/assinatura-eletronica-avancada ; https://manual-integracao-assinatura-eletronica.servicos.gov.br/pt-br/latest/iniciarintegracao.html ; https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm |
| Pix R$0,01 legality / bank terms | **No primary source found** either way: [não verificado]. Receipts show payer CPF masked (***.XXX.XXX-**) [~]. The draft's "BCB Normative nº 491" came from a Feedzai blog; press attributes the R$200/R$1,000 unregistered-device limits to **Res. BCB 403/2024**; irrelevant at R$0.01. Dropped | search results; https://www.feedzai.com/blog/bcb-normative-no-491-how-brazil-can-strengthen-pix-fraud-prevention/ |
| Breach = "LGPD Art. 17" | **Wrong.** Art. 17 = titularidade; breach = **Art. 48** ("prazo razoável" set by ANPD) | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm [✔] |
| Breach: "ANPD in 3 working days, users in 20 days" | **Wrong on users.** Res. CD/ANPD 15/2024: 3 business days to ANPD **and** titulares; complementary info up to 20 business days; incident record kept 5 years; small-scale agents x2 | search results (cnbsp.org.br, confidata.com.br); primary text not read [~] |
| Fine "2% revenue or R$50M" | **Mis-stated:** 2% of Brazilian revenue, **limited to R$50M per infraction** (Art. 52 II) | LGPD, same Planalto URL [✔] |
| "PBKDF2 100k" | Outdated: OWASP 600,000 (PBKDF2-HMAC-SHA256) or Argon2id m=19 MiB, t=2, p=1; keep the pepper in a vault/HSM | https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html [✔] |
| "Never log IP" | A choice, not a rule. Marco Civil Art. 15: 6-month access logs only for organised, professional, for-profit legal entities; courts can order others (§1) | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm [✔] |
| Election timing | 2026: 1st round 4 Oct, **runoff 25 Oct**. Municipal 2028 by 4-year cycle [inferência] | https://www.tse.jus.br/comunicacao/noticias/2026/Marco/eleicoes-2026-confira-as-principais-datas-do-calendario-eleitoral [✔ via search] |
| ECA Digital | Lei 15.211/2025 in force 2026-03-17; Decreto 12.880/2026; ANPD guidance on age assurance | https://www.machadomeyer.com.br/pt/inteligencia-juridica/publicacoes-ij/direito-digital/estatuto-digital-da-crianca-e-do-adolescente-lei-n-15-211-2025-entra-em-vigor-em-17-de-marco-de-2026 [~] |
| Canoas official domain | canoas.rs.gov.br official; @canoas.rs.gov.br shown; 0800-510-1234; Ouvidoria via Fala.BR; DOM at sistemas.canoas.rs.gov.br/domc | https://www.canoas.rs.gov.br [✔] |
| "SIM tied to CPF, checked monthly" (Anatel) | [não verificado]. The draft's uniqueness argument rests on it; treat phone uniqueness as **weak** | - |
| "Onde Fui Roubado", Fala.BR, Waze, Nextdoor, Fogo Cruzado, Change.org details; 99% WhatsApp penetration; Canoas population | Not re-verified: removed or [não verificado]. The draft's Onde Fui Roubado URL (`ondeftiroubado`) looks mistyped | - |
