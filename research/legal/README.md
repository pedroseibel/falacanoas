# FalaCanoas: Brazilian Legal Framework Brief

*Revised 2026-10-12. Fact-checked against planalto.gov.br, the STF, the ANPD, the STJ and the Prefeitura de Canoas. This is not legal advice. It is a sourced brief so the founder can ask a lawyer the right questions. "[não verificado]" means it could not be confirmed from a primary source in this pass. Source IDs (S1, S2...) are listed in the Verification log.*

---

## TL;DR

1. **Public pseudonym + private phone fits CF art. 5º IV** if the platform keeps the minimum data needed to help identify an author under a legally valid request (STJ REsp 1.193.764/SP): keep the phone encrypted, plus IP/port logs. A CPF hash identifies nobody. Guest pins: log IPs; publish only once confirmed. *Wording per DECISIONS round 18:* these records let connections be correlated; they cannot guarantee that a person is identified. A phone identifies a line, and an IP may be shared (a home, a public network, CGNAT).
2. **STF Temas 987/533 (final thesis 17/06/2026):** honour offences still need a court order; other illicit content brings solidary liability after notice; "falha sistêmica" covers a closed list of grave crimes. Self-regulation, a notice channel and annual reports are required; no express small or non-profit carve-out.
3. **MCI art. 15 is no safe "exemption":** it targets organised entities with "fins econômicos", yet courts can order retention anyway (§1). Keep 6 months of logs.
4. **LGPD already applies to the waitlist.** Res. ANPD 2/2022 can cover an associação or informal group unless high-risk. Breach notice: 3 business days (6 if small).
5. **Ouvidoria:** file as FalaCanoas; Lei 13.460 art. 16 gives the identified manifestante 30+30 days. *Decided in DECISIONS round 18:*
   - The public clock still counts from the send time (`enviadoEm`), as round 5 decided.
   - A separate legal-deadline mark counts from the protocol (`protocoladoEm`) when there is one.
   - A protocol is evidence of receipt, not the act that creates the duty.
6. **Scoreboard:** órgão-level, factual, documented; never individuals.
7. **Images:** blur faces and plates publicly.
8. **Age:** 18+; ECA Digital in force since 17/03/2026.
9. **Elections:** art. 9-E says "imediata", not 24 h.
10. **Incorporate an associação** (the STF thesis expects a legal-entity representative).

---

## 1. Assumptions (decisions already taken)

*Updated to DECISIONS round 18 (2026-10-12).*

- **Scoreboard:** a public scoreboard of days open by bairro, category and secretaria.
  - The clock starts when FalaCanoas notifies the Prefeitura, in the daily digest to the Ouvidoria. A separate legal-deadline mark counts from the protocol.
  - The Prefeitura may get a verified institutional account. It never sees authors' identity and never edits community items.
- **Public identity:** an apelido and a bairro, or "Anônimo em público" per item.
  - A phone code (WhatsApp/SMS) is enough to post, confirm, comment and close. Optional civil identity never gates any of that.
  - The CPF is optional, used only for uniqueness, and stored only as an HMAC after a proof of ownership.
  - Civil identity (nível 2) is not in the MVP.
- **Guests:** they may drop pins. Their pins are held for moderation and don't count on the scoreboard until two independent confirmations.
- **Identity storage:** identity data sit in a separate vault. The phone is encrypted, and access logs are kept 6 months.
- The landing page collects sign-ups by bairro, so personal data is collected from day one.

---

## 2. The decision questions

### (a) Is "pseudonym publicly, phone-verified privately" compatible with CF art. 5º IV? And guest pins held for review?

**Answer: yes, if the operator can identify the author on court order. Guest pins are defensible if unpublished and still traceable.**

- Text: CF art. 5º, IV: "é livre a manifestação do pensamento, sendo vedado o anonimato" (S1).
- STJ, REsp 1.193.764/SP (3ª T., Min. Nancy Andrighi, j. 14/12/2010, Orkut): a provider that lets users express themselves freely must offer means to identify each user; logging the IP at registration is a reasonably efficient means (average diligence); personal data is disclosed only by court order (S34; read from STJ's Informativo summary, full inteiro teor not reopened). A public pseudonym is therefore not "anonimato" if the operator can identify the author.
- What this means for the design:
  - Store the phone number **encrypted**, not hashed. A hash cannot tell you who posted.
  - Log IP, source port, timestamp and account ID per post (see section 4; Decreto 8.771 art. 15-A, added by Decreto 12.975/2026, S13/S14).
  - A CPF hash only confirms a CPF someone already suspects; it cannot reveal an unknown author. It is still personal data (pseudonymised; LGPD art. 5º I and art. 13 §4, S3).
  - Disclosure only on court order: MCI art. 10 §1 and art. 22 (S2). Administrative authorities may request *dados cadastrais* (qualification, filiação, address) under art. 10 §3; you hold none of these if you only keep a phone number.
  - Do not market the service as "anonymous".
- CP art. 339 §1 raises the penalty by one sixth when the agent uses "anonimato ou nome suposto" in a knowingly false accusation (S4). The law treats a shielded identity as aggravating, which is another reason to stay traceable. *Context:* art. 339 is denunciação caluniosa and needs its specific elements; it does not reach every pseudonymous report about the city.
- Electoral period: Lei 9.504 art. 57-D forbids anonymity in internet campaigning (S9). How the TSE treats pseudonyms [não verificado; TSE site returned HTTP 403].
- Whether a phone number leads to a person depends on SIM registration rules [não verificado].
- **Guest pins held for review:**
  - A private service moderating before publication is not State censorship [leitura própria, sem decisão verificada].
  - Pre-publication approval weakens an "I did not know" defence for what you approve. Apply written criteria and log decisions. Consider publish-then-moderate for verified users and hold only guests.
  - Guests are still traceable through IP logs, rate limits and captcha. Strip photo EXIF; show a privacy notice on the guest form.
  - Product decision with legal weight: forward only **confirmed** guest pins to the Ouvidoria. This avoids sending unverified accusations under your name and keeps the scoreboard consistent with your own rule.

### (b) Can an independent associação forward residents' reports to the Ouvidoria? Must it answer, and by when? What consent?

**Answer: yes. The cleanest route is in FalaCanoas' own name. A resident mandate is only needed to act as the resident's representative or to send their identity.**

1. **Who may file.** Lei 13.460/2017 (S6):
   - art. 2º I: "usuário" is a *pessoa física ou jurídica* that benefits from or uses, "efetiva ou potencialmente", a public service.
   - art. 2º V: manifestações include reclamações, denúncias, sugestões.
   - art. 9º: the usuário may file manifestações.
   - art. 10: addressed to the ouvidoria and "conterá a identificação do requerente"; §1 no exigências that make filing impossible; §2 no justification of motives; §4 electronic filing allowed; §5 identity certification may be required; §7 the requerente's identity is restricted-access information under the LAI.
   - art. 11: receipt may not be refused.
   - CF art. 5º XXXIV "a" guarantees petition to public authorities to "todos" (S1).
   - So FalaCanoas, as an identified legal entity, can be the manifestante. Whether Canoas' ouvidoria accepts entity or third-party submissions in practice [não verificado].
2. **Must the Ouvidoria answer, and when.** Art. 16 (S6): the ouvidoria "encaminhará decisão administrativa final ao usuário", within **30 days, extendable once, with justification, by an equal period**. The federal Lei does not fix the start date.
   - Federal reference only: Decreto 9.492/2018 art. 18 counts from receipt (S12).
   - Canoas: the Ouvidoria's 2019 management report states that Decreto Municipal 434/2019 (10/12/2019) regulates Lei 13.460, and quotes its art. 17: conclusive reply within 30 days of receipt (S30). The decree text itself was not retrieved and may have been amended [não verificado].
   - The answer is owed to the identified manifestante, which is the associação, not each resident.
   - Federal reference: unidentified input is not a "manifestação" and creates no duty of conclusive reply (Decreto 9.492 art. 23 §1); irregularity reports, even anonymous, are forwarded if minimally substantiated (art. 23 §2) (S12). Canoas' equivalent [não verificado].
3. **Digest vs per-pin.** A daily digest is one manifestação with one clock and one answer. File per pin (or per cluster) to get meaningful deadlines.
   - Canoas receives manifestações through the federal Fala.BR platform (S31). Record the protocol and receipt voucher (Lei 13.460 art. 12 par. único, II: "emissão de comprovante de recebimento").
   - **Start the scoreboard clock at the protocol date**, or show both "sent" and "protocolled". Otherwise the Prefeitura can contest the count.
4. **Consent/mandate wording** (LGPD art. 7 I, art. 8 §§1, 4, 5; art. 9; S3):
   - Pin text, photo and location already shown on the map: forwarding is compatible if the notice says so (art. 9 V, shared use).
   - Identity (name, phone, CPF): forward only on a separate, specific opt-in naming the recipient (Prefeitura/Ouvidoria of Canoas) and the purpose, revocable at any time. The Prefeitura must keep the identity restricted (Lei 13.460 art. 10 §7).
   - Acting "on behalf of" the resident so the reply goes to them: a written, revocable authorisation limited to one pin, with FalaCanoas as intermediary. Lei 13.460 does not require a notarised procuração; Canoas practice [não verificado]. By analogy, Lei 9.784/1999 art. 9 (federal; subsidiary only, art. 69) lists as interested parties persons acting as holders or "no exercício do direito de representação", and associations for collective/diffuse interests (S17).
   - Tell residents that the legal deadline is owed to FalaCanoas and that you will post the answer on their pin.
5. **LAI** (Lei 12.527/2011 arts. 10-11, S7): any interessado may ask for information without stating motives (art. 10 §3); reply within 20 days, extendable by 10 (art. 11 §§1-2). Use it to obtain official response-time data to compare with your own numbers.
6. Lei 13.460 art. 23 §2 obliges public bodies to publish a ranking of the entities with the most user complaints. A ranking is something the law itself contemplates (S6).
7. **Prefeitura reply on FalaCanoas (verified account):** keep it separate from the legal Ouvidoria process. In election periods Lei 9.504 art. 73 VI b restricts institutional publicity in the three months before the election (S9); how that applies to a municipal account during a general election was not analysed [advogado].

### (c) Framing the scoreboard under the honour-crime articles

**Honour offences (S4):**

| Article | Offence | Penalty | Notes |
|---|---|---|---|
| 138 | Calúnia: falsely imputing a *crime* | detenção 6 months-2 years + multa | truth defence allowed (§3), with exceptions |
| 139 | Difamação: imputing a fact offensive to reputation | detenção 3 months-1 year + multa | truth defence only if the victim is a *funcionário público* and the offence concerns the exercise of functions (par. único) |
| 140 | Injúria: offending dignity or decoro | detenção 1-6 months or multa | aggravated forms in §§2-3 |
| 141 | Increases | +1/3 if against a *funcionário público em razão de suas funções* (II) or by a means that facilitates dissemination (III); **tripled** if committed or spread on social networks (§2) | |

Civil side: CC arts. 186, 927 and 953 (S5).

An accurate day-count is not an imputation of a crime and is not offensive in itself. The risk comes from inaccurate counts, attribution to persons, insinuation and adjectives. Rules:

- **Subject = the órgão** (secretaria). Never name a secretário or servidor. Individual targeting is what triggers the +1/3 in art. 141 II.
- **Label the metric neutrally:** "Dias desde o envio à Prefeitura (relatos em aberto)". Not "dias de omissão", "ignorados" or "atrasados". Never imply crime, corruption or intent.
- **Clock:** from the Prefeitura's protocol (see (b)). Show the number of reports (n), the **median**, and the oldest case. Do not rank when n is below a minimum (suggest 10); show "dados insuficientes".
- **Closure:** distinguish "respondido pela Prefeitura" from "confirmado como resolvido por moradores".
- **State the source honestly:** "relatos de moradores confirmados na FalaCanoas; não são dados oficiais". The draft's claim that the board is "based on official LAI data" was wrong; the data are your own. Show official figures (via LAI) beside them if obtained.
- **Methodology page** with definitions, update date, change log and a correction channel with a stated response time. Allow the Prefeitura's verified account to add context next to a figure, not to remove it.
- **Presentation:** neutral colours and wording; no "pior/melhor" labels; show category mix.
- **Privacy:** minimum cell sizes at bairro × category level so reporters cannot be re-identified.
- **Election years (2028 municipal cycle):** add a neutrality notice and do not promote the ranking in campaign messaging [advogado].
- Whether a *órgão* or the Município can be the victim of honour offences or *dano moral*: [não verificado].

### (d) Posts and photos of public servants, contractor trucks, licence plates

**Answer: publish the problem, not the people.**

- **CC art. 20** (S5): publication of a person's image "poderão ser proibidas" if it affects "a honra, a boa fama ou a respeitabilidade" or is for "fins comerciais", save when authorised or necessary to justice/public order. Planalto annotates "Vide ADIN 4815"; its scope (biographies) and effect on this question were not verified [não verificado].
- STJ Súmula 403 (S32): publication of a person's image for economic or commercial purposes without authorisation gives damages without proof of loss. Informational use is judged differently: REsp 1.449.082 (3ª T., 2017), no damages for a protester's photo in a news report on a public demonstration, because the purpose was informative (S33; press context, by analogy only).
- **Servants at work in public:** no consent regime applies automatically, but art. 20 bites when the image hurts honra or respeitabilidade. Do not mock, tag or name. Public map: blur faces by default. If the report is about a servant's *conduct*, route it privately to the Ouvidoria instead of publishing.
- **Contractor trucks:** logo, site, date and time are facts you may describe. The risk is false attribution (right truck? right company? a subcontractor?) and conclusions ("despejo ilegal"). Describe, do not conclude. Whether and how legal entities are protected against honour offences [não verificado].
- **Licence plates:** blur publicly. A plate identifies an owner or driver through DETRAN records, so it can be personal data under LGPD art. 5º I ("identificável"); the ANPD's position [não verificado]. Keep the original with restricted access for forwarding to authorities.
- **LGPD basis for publishing third-party images:** FalaCanoas is the controller of what it publishes. The likely basis is legitimate interest (art. 7 IX) with a documented balancing test, applying art. 6 (purpose, necessity, adequacy), plus the right to object (art. 18 §2) (S3). The exclusions in art. 4 I (purely private, non-economic use by a natural person) and art. 4 II "a" (exclusively journalistic/artistic) should not be assumed to cover an organisation's platform.
- **Children:** ECA art. 17 protects the image and identity of children and adolescents (S8). Moderators remove identifiable minors.
- **Private life:** CF art. 5º X; CC art. 21 (S1/S5). No photos into homes or interiors.
- A user "certification" in the terms (as the draft suggested) does not bind third parties; treat it as a supplement, not a safeguard.

### (e) Minimum age; what the sign-up privacy notice must contain

**Minimum age: 18+ at launch.**

- CC arts. 3-5: under 16 absolutely incapable, 16-17 relatively incapable, majority at 18 (S5). ECA art. 2: *criança* is "até doze anos de idade incompletos"; *adolescente* is 12 to 18 (S8).
- LGPD art. 14: processing must be in the child's or adolescent's best interest; §1 requires specific parental consent for *children* (S3). ANPD Enunciado CD/ANPD 1/2023: children's and adolescents' data may rest on art. 7 or art. 11 bases, subject to best interest (S28).
- **There is no "13+" threshold in Brazilian law**; the draft's "COPPA-style" gate is a US concept and has been removed.
- **ECA Digital (Lei 15.211/2025), in force 17/03/2026** (S11), regulated by Decreto 12.880/2026 (S15), with the ANPD as regulator:
  - It applies to IT services "direcionados" to, or "de acesso provável" by, minors (art. 1 and par. único: likelihood of use/attractiveness, ease of access, and significant risk, "especialmente" for services for social interaction and large-scale sharing of information).
  - Art. 24: accounts of users up to 16 must be linked to a guardian's account.
  - ANPD preliminary guidance on age assurance: proportionality to service risk (Decreto 12.880 art. 24, I); self-declaration alone has "baixo grau de confiabilidade" (S29).
  - Open question for the lawyer: is a civic map plus forum "acesso provável", and is a self-declared 18+ gate enough?
- Allowing minors also risks losing the small-agent regime: Res. CD/ANPD 2/2022 art. 4 II "d" counts data of children, adolescents and elderly as a high-risk criterion (S25).

**Sign-up privacy notice** (LGPD art. 9 I-VII and §3, S3; Res. 2/2022 arts. 7, 11 §1, S25; it is **art. 9, not art. 60**; art. 60 only amends the Marco Civil). It must be clear, adequate and prominent, and include:

1. Controller identity and contact (art. 9 III-IV) and the channel for data-subject requests. A small agent may skip naming an encarregado but must provide the channel (Res. 2/2022 art. 11 §1). Otherwise art. 41 §1 requires the encarregado's identity and contact to be public.
2. Specific purposes, listed separately (art. 9 I; art. 8 §4: generic authorisations are void): waitlist updates by bairro; account verification; publishing pins/forum; forwarding to the Ouvidoria; aggregate scoreboard; security and abuse prevention.
3. Data categories: phone, bairro, pseudonym, optional CPF hash, photos and their metadata, IP/port logs, guest-form data.
4. Legal basis per purpose (good practice, not an express art. 9 item) and, where consent is used, the right to revoke (art. 8 §5; art. 18 IX) and the consequences of refusing (art. 18 VIII). Highlight that the phone number is a condition to post (art. 9 §3).
5. What is **public** (pseudonym, bairro, pin content, photos) vs **private** (phone, CPF hash, logs).
6. Sharing (art. 9 V; art. 18 VII): Prefeitura/Ouvidoria and what is sent (identity only on opt-in); processors (hosting, SMS/WhatsApp provider); courts and authorities on court order (MCI arts. 10, 22).
7. International transfers (LGPD art. 33; Res. 19/2024) and the mechanism used.
8. Retention and form/duration of processing (art. 9 II): waitlist, logs, pins, CPF hash, deletion on request (art. 16).
9. Data-subject rights with express mention of art. 18 (art. 9 VII), how to exercise them, and the right to petition the ANPD (art. 18 §1).
10. Statement that the service is for adults.
11. Notice of changes (art. 8 §6; art. 9 §2).

**Form:** unticked checkbox plus link; separate opt-ins for the waitlist, for sending identity to the Prefeitura, and for any transfer abroad based on consent (art. 33 VIII, "consentimento específico e em destaque").

---

## 3. Intermediary liability: Marco Civil art. 19 and STF Temas 987 and 533

### What the statute says

- **Art. 19** (S2): providers are liable for third-party content only after a specific court order not complied with.
- **Art. 21** (S2) concerns **non-consensual intimate content** (nudity or private sexual acts). The draft's description of art. 21 as "data privacy" was wrong. It provides liability "subsidiariamente" after notice from the participant.
- Art. 20: when you have the poster's contact details, tell them the reasons for removal. The "substitute the content with the reasons" duty is limited to professional, for-profit providers (par. único).

### The judgment

STF, RE 1037396 (Tema 987, Rel. Min. Toffoli) and RE 1057258 (Tema 533, Rel. Min. Fux). Merits judgment concluded **26/06/2025**, by majority (dissenting on these points: Mendonça, Nunes Marques, Fachin) (S19). The ata of the merits judgment was published on 05/08/2025 (S22, item 13). **Embargos de declaração** were taken up on 10-11/06/2026 and the thesis was finalised on **17/06/2026**, with trânsito em julgado declared (S21, S22, S23). Use the **2026 text**, which differs from the 2025 text (S20).

Holdings (S22; the thesis' own item numbers are given in parentheses):

1. **Art. 19 is partially and progressively unconstitutional** (partial omission; insufficient protection of fundamental rights and democracy). Electoral legislation and TSE acts are preserved (item 2).
2. **General rule (item 3):** for crimes or unlawful acts by third parties, the provider is liable **solidarily, under the art. 21 regime** (after notice), without prejudice to the duty to remove, unless "dúvida razoável quanto à ilicitude" remains after "análise de diligência qualificada". The same applies to accounts reported as *inauthentic* (3.1).
3. **Honour crimes and civil wrongs (3.2):** art. 19 still applies (court order), "sem prejuízo da possibilidade de remoção por notificação extrajudicial". Final reach after the embargos: crimes *and civil wrongs* against honour.
4. **Repeat content (3.3):** once a court has recognised an offensive fact, social-network providers must remove identical publications on judicial or extrajudicial notice, without new orders.
5. **Art. 19 still applies (3.4)** to email, closed video/voice meetings, private instant messaging (interpersonal communications), and "outros provedores... que não possuam interferência no fluxo comunicativo e informacional" (added by the embargos; the list is exemplary).
6. **Presumed fault (item 4, rebuttable):** paid ads and boosting, and artificial mechanisms of inorganic dissemination.
7. **Duty of care for massive circulation of grave illicit content (item 5):** liability for failing to make unavailable *immediately* content within a **closed list** (anti-democratic acts, terrorism, inducement to suicide or self-harm, discrimination under Lei 7.716, crimes against women, sexual crimes against vulnerable persons and child abuse, human trafficking). Liability requires **"falha sistêmica"**: failing to adopt adequate measures to prevent or remove, breaching the duty to act "de forma responsável, transparente e cautelosa" (5.1-5.2). "Adequate" means the highest security levels *"conforme o estado da técnica ... para o tipo de atividade desempenhada pelo provedor"* (5.3). An isolated item is **not** falha sistêmica; it falls under the art. 21 regime (5.4). The poster may sue for restoration without any indemnity owed by the provider (5.5), and either may seek an injunction against removal (5.6).
8. **Self-regulation (item 7):** a system of notifications, due process and **annual transparency reports** on extrajudicial notifications, ads and boosting. **Permanent specific channels** for users *and non-users* (item 8). Rules published and periodically reviewed (item 9).
9. **Representative in Brazil (item 10):** providers must keep a seat and a representative in Brazil, "necessariamente pessoa jurídica com sede no país", with full powers. An informal group has no legal personality and could not literally meet this; an associação can.
10. **No strict liability (item 11).** Marketplaces follow the CDC (item 6).
11. **Temporal effect (item 13):** ex nunc from 05/08/2025, except continuing acts.
12. **Item 14:** providers have **60 days from publication of the embargos minutes** to implement the item 5 obligations. The date of that minute was not located; judgment ended on 17/06/2026, so the period has presumably lapsed [não verificado].

### Small and non-commercial providers

- **The thesis text has no size or non-profit carve-out.** The draft's claim that the STF "acknowledged the need to protect volunteer and small-scale operators" has no support in the thesis.
- Possibly relevant calibrations: item 5.3 ties "adequate measures" to the *type of activity*; item 11 excludes strict liability; item 3.4(d) exempts providers without interference in the communicative flow. A service that moderates, approves guest pins and ranks content likely **does interfere**.
- The STF news of 11/06/2026 reported a provisional consensus restricting the duty-of-care measures to large providers (over one million registered users in Brazil) (S23). **That limit is not in the published final thesis** (S22). Check the minutes and acórdão [não verificado].
- **Executive layer:** Decreto 12.975/2026 (20/05/2026; in force 60 days after publication; S14) added arts. 16-A to 16-P and 20-A to Decreto 8.771/2016. It repeats the duties above, requires a permanent reporting channel and a legal-entity representative (art. 16-A), requires self-regulation with an annual transparency report (art. 20-A), and assigns oversight to the ANPD (art. 19-A). **Art. 16-P** lets the competent authority set "critérios diferenciados" by economic size, level of interference, state of the art and risk, "especialmente quanto aos pequenos provedores". No such ANPD act was found [não verificado]. Note that the ANPD is now the "Agência Nacional de Proteção de Dados" (Lei 15.352/2026, per the Planalto annotation to LGPD art. 5º VIII).
- Draft's internal deadlines ("7 days / 3 days") have no legal source. They are fine as policy targets. The thesis only says "imediata" for item 5 content and leaves notice deadlines to future regulation (Decreto art. 16-D par. único).

### What this means for FalaCanoas (practical)

- Treat notified illicit content (other than honour) as removable on notice; document "dúvida razoável" decisions.
- Honour complaints: you may remove on extrajudicial notice, but you are not liable for keeping the content until a court order (item 3.2). Decide and publish your policy.
- Provide the self-regulation pack (item 7-9): terms and moderation rules, a notification channel open to non-users, due-process steps (acknowledge, decide with reasons, contest), annual transparency report, and named contact.
- Moderation duty "imediata" for the grave-crime list is real even if isolated items fall under art. 21.

---

## 4. Marco Civil: access-log retention (art. 15)

**Text (S2):** "O provedor de aplicações de internet constituído na forma de pessoa jurídica e que exerça essa atividade de forma **organizada, profissionalmente e com fins econômicos** deverá manter os respectivos registros de acesso a aplicações de internet, sob sigilo, em ambiente controlado e de segurança, pelo prazo de 6 (seis) meses". The four conditions are cumulative.

**The draft was wrong in two ways.** It called a non-commercial project "exempt", and it described art. 15 §1 as exempting small or non-commercial providers. **§1 says the opposite:** a court order can oblige providers *not* subject to the caput to keep logs "por tempo certo" for specific facts in a defined period. §2: police, administrative authorities or the Ministério Público may request *cautionary* retention from **any** provider, including beyond six months. §3: release of logs always needs a court order. Art. 22: any interested party may seek an order for logs.

**Analysis:**

- **Informal group:** not a legal entity, so the caput is not triggered on its terms [leitura própria].
- **Associação:** CC art. 53 defines associações as unions of persons organised "para fins **não** econômicos" (S5), a strong textual argument that an associação is outside "fins econômicos". I found no decision applying art. 15 to a non-profit associação.
- **Donations:** nothing found says donations alone create "fins econômicos". The argument weakens with revenue-generating activity: ads, paid features, sponsored placements, selling services (including to the Prefeitura) [advogado].
- **Art. 17:** "a opção por não guardar os registros de acesso... não implica responsabilidade sobre danos decorrentes do uso desses serviços por terceiros", except where the Law provides otherwise. This partly limits the 2010 STJ reasoning in REsp 1.193.764; how they interact is a question for the lawyer.
- **Decreto 8.771 art. 13 §2:** keep as little personal data as possible and delete it as soon as the purpose is met or a legal deadline ends. **Art. 15-A** (added by Decreto 12.975/2026): the IP-log duty under arts. 13 and 15 includes the source *porta lógica* when needed to identify the terminal; it falls on each provider and does not depend on a request (S13).
- **MCI art. 16** bans logging other applications without consent and holding personal data excessive to the purpose.
- **Conclusion:** do not rely on "exemption". Keep a minimal, secured 6-month log (the cost is low and it supports the STJ identification standard). Delete on schedule. The longer-term retention of identification tied to a post is a separate question: CC art. 206 §3 V sets a three-year period for civil reparation claims (S5), a reference point for the lawyer.
- **Where the 6 months come from:** MCI art. 15 caput. A secondary source says Decreto 12.975/2026 sets no retention period of its own [~ S36].
- **Preservation requests:** art. 15 §2 refers to art. 13 §§3-4. The requesting authority has 60 days to seek a court order for access. If it doesn't, or the order is refused, the request lapses. Release always needs a court order.
  - Decided in DECISIONS round 18: deletion is suspended only selectively, with grounds, scope, start and end documented, and never indefinitely on an administrative request.
- **How we capture it (DECISIONS round 18):**
  - The Worker doesn't receive the client port natively. A Transform Rule copies `cf.edge.client_port` into a request header, together with the edge IP and port and the transport.
  - The record is made on sign-ins and writes only (publications, confirmations, comments, guest pins), never on reads.
  - Under HTTP/2 and HTTP/3 many requests share one port, so the record keeps a millisecond timestamp.
  - A blocking test on the real domain must pass before launch. The fallback is Logpush `http_requests` (`ClientSrcPort`), available on every plan since 2026-09-30 (S37, S38).

---

## 5. LGPD (Lei 13.709/2018)

### 5.1 Legal bases, waitlist and sensitive data (S3)

- **Correct mapping of art. 7:** consent = I; legal obligation = II; contract or pre-contractual steps requested by the data subject = **V**; exercise of rights in proceedings = VI; **legitimate interest = IX**. The draft mixed these up. "Public interest" is not a base for private controllers; art. 7 III is for public administration.
- **Waitlist:** consent (art. 7 I, art. 8) is the cleanest base. Keep fields minimal (contact + bairro), state purposes, allow one-click withdrawal, set a retention period.
- **Geolocation is not "sensitive"** under art. 5º II. The draft was wrong. Sensitive data include political opinion, health, biometric data and others. Forum posts may reveal **political opinion**; if so art. 11 bases apply. Treat accordingly in moderation and notice.
- **Phone verification** through SMS or WhatsApp involves a third-party operator, probably abroad: list it in the notice and cover the transfer (5.4).
- The art. 4 exclusions (private non-economic use by a natural person; exclusively journalistic or artistic purposes) should not be assumed to apply to the platform.

### 5.2 Small processing agents: Res. CD/ANPD 2/2022 (S25)

- **Who qualifies (art. 2 I):** microenterprises, small companies, startups, "pessoas jurídicas de direito privado, **inclusive sem fins lucrativos**", and "pessoas naturais e **entes privados despersonalizados**" acting as controller or processor. A volunteer group or an associação can qualify.
- **Excluded (art. 3):** high-risk processing; gross revenue above the LC 123/2006 art. 3 II ceiling (the draft says R$4.8M; not re-checked); membership of an economic group above it.
- **High risk (art. 4):** at least one *general* criterion (large scale; or significant effect on fundamental rights, including image and reputation) **and** at least one *specific* criterion (emerging or innovative technology; surveillance of publicly accessible areas; solely automated decisions; sensitive data, or data of children, adolescents or the elderly).
  - Elderly residents will use the service, and the forum may reveal political opinion, so it is **not safe to assume** small-agent status. Ask the lawyer.
- **Waived or softened:** no mandatory encarregado (art. 11); simplified processing record (art. 9); simplified security policy (art. 13); double deadlines for data-subject requests, incident notice and complete declarations (art. 14); simplified declaration within 15 days (art. 15); simplified incident procedure (art. 10).
- **Not waived:** legal bases and principles; data-subject rights; information under arts. 9 and 18 (art. 6-7); minimum technical and administrative security (art. 12); a **communication channel** with data subjects if no encarregado is named (art. 11 §1).
- **ANPD may override:** art. 16 lets the ANPD order a small agent to comply with obligations that were waived.

### 5.3 Security incidents: LGPD art. 48 and Res. CD/ANPD 15/2024 (S3, S26)

- The draft had no breach section. Correct framework: **LGPD art. 48** (notify the ANPD and the data subject of an incident that may cause "risco ou dano relevante", within a period the ANPD defines).
- **Res. CD/ANPD 15/2024:**
  - Art. 5: relevant risk when the incident can significantly affect fundamental rights **and** involves sensitive data, data of children/adolescents/elderly, financial data, **authentication data**, legally secret data, or large-scale data.
  - Arts. 6 and 9: notice to the ANPD **and** to data subjects within **three business days** from knowing the incident affected personal data.
  - Art. 10: keep an incident record, including non-notified incidents, for at least **five years**.
  - Small agents get **double time**, i.e. 6 business days (Res. 15 art. 6 §8 and art. 9 §6; Res. 2/2022 art. 14 II as amended).
- Security of log stores: Decreto 8.771 art. 13 asks for strict access control, strong authentication, an access inventory and encryption or equivalent (S13).

### 5.4 Sanctions: LGPD art. 52 (S3)

- Art. 52: advertência; **multa simples up to 2% of the faturamento of the pessoa jurídica de direito privado, group or conglomerate in Brazil in its last fiscal year, excluding taxes, capped at R$50 million per infraction**; daily fine; publicização; bloqueio; eliminação; suspension of the database or of the processing activity (up to 6 months, renewable); partial or total prohibition of processing.
- The draft's "2% or R$50M, whichever is less, assessed against individuals" mis-states the formula. Criteria in art. 52 §1 include good faith, economic condition, good-practice policies and prompt corrective measures.
- How fines are computed where there is no revenue (Res. CD/ANPD 4/2023, dosimetria): [não verificado; not read].
- Separate and often more relevant for a small project: **civil liability** (art. 42: compensation for patrimonial, moral, individual or collective harm; co-controllers jointly liable). Without a legal entity there is no shield: legal existence of private entities begins with registration (CC art. 45).

### 5.5 International transfers: art. 33 and Res. CD/ANPD 19/2024 (S3, S27)

- Hosting, email, SMS/WhatsApp and analytics providers abroad mean international transfers (art. 33). Lawful mechanisms include adequacy (I), standard contractual clauses (II "b"), and specific, prominent consent (VIII).
- **ANPD standard clauses (Annex II) must be adopted "integral e sem alteração"** (art. 16). A cloud vendor's own "SCCs" do not satisfy this unless the ANPD recognised them as equivalent (arts. 18-20). The draft was wrong on this point. The deadline to incorporate them into existing contracts was 12 months from publication (23/08/2024).
- The ANPD page also lists a resolution recognising the European Union as adequate (not read). Adequacy for the US [não verificado].
- Choosing a Brazilian region avoids the question for hosting but not for third-party services.

---

## 6. Electoral law

**What exists (S9, S10, S35):**

- **Lei 9.504/1997:** art. 57-D: free expression online, "vedado o anonimato durante a campanha eleitoral". Art. 57-F: a hosting provider is liable only if it fails to act within the time set by the Justiça Eleitoral after notice of a decision declaring the propaganda irregular, and only if it had **prior knowledge** (par. único). Art. 57-H §1: hiring people to offend a candidate's honour online is a crime (detenção 2-4 years + multa).
- **Electoral honour crimes sit in the Código Eleitoral (Lei 4.737/1965) arts. 323-326:** electoral calúnia (art. 324: detenção 6 months-2 years). The draft's "Lei 9.504 arts. 326-329 (2 months to 3 years)" was wrong.
- **Res. TSE 23.610/2019**, amended by **Res. 23.732/2024** and **Res. 23.755/2026 (2 March 2026)** (the number cited in the draft is real). Art. 9º-E makes providers *solidarily liable, civilly and administratively*, when they fail to ensure the "indisponibilização **imediata**" of content and accounts in listed risk cases (anti-democratic conduct; notorious falsehoods about the integrity of the process; grave threats to electoral officials; hate speech; AI-generated content breaching labelling rules; republication of content already ordered removed; political violence against women). I found **no "24 h removal" rule** in art. 9-E. The 24 h figures in the resolution relate to windows around voting day (72 h before to 24 h after for synthetic content; 48 h before to 24 h after for paid boosting). This is read from a quoted version of the text in an Artigo 19 technical note (S35); the TSE site returned HTTP 403, so **check the compiled text on tse.jus.br** [não verificado at source].
- Art. 125-B (compliance plans) is addressed to providers under TSE Presidency rules, tied to platform credentialing.
- Timing: the 2026 general elections are the current cycle; Canoas' own municipal election is in the 2028 cycle [calendário não verificado].

**For FalaCanoas:** keep to "removal on notice, immediately for electoral content orders". Do not amplify political content. Moderate electoral propaganda out. Place a neutrality notice during campaigns. Disable boosting. A lawyer should read art. 9-E's "imediata" for a very small provider.

**Moderation rule (DECISIONS round 18).** In every relevant campaign period, 2026 included:
- Content classified as electoral propaganda can't be published as "Anônimo em público". Moderation removes it, or asks for it to be republished in a lawful form.
- Moderation decisions can be contested.
- A report about a public service is not propaganda just because it hurts an administration.
- A pseudonym is not assumed sufficient under art. 57-D until counsel reviews it.

---

## 7. Entity form and licence

- **Informal group:** no legal personality, so those who act answer personally [conclusion for confirmation]. It also cannot be the "pessoa jurídica" representative required by the STF thesis (item 10).
- **Associação:** CC art. 53 (union of persons for non-economic ends); art. 54 (mandatory statute contents, including funding sources and governance); registration of the constitutive act gives legal existence (art. 45; registry = Registro Civil das Pessoas Jurídicas, not a "municipal court"). Directors are not automatically shielded in cases of abuse (art. 50, desconsideração) (S5).
- **OSC (Lei 13.019/2014):** art. 2 I defines the *organização da sociedade civil* (no profit distribution; assets applied to the social object); art. 33 sets statute requirements for partnerships with the public sector (S18). The draft's description of a "federal OSC registry" and a "501(c)(3)-equivalent" status is not Brazilian law and was removed.
- **Licence:** software is protected under the copyright regime (Lei 9.609/1998 art. 2) and used under a licence contract (art. 9) (S16). AGPL-3.0 and MIT are both usable; AGPL adds a source-offer duty for network use of modified versions, MIT does not. Choose by project goals. Neither changes the analysis above.

---

## 8. Questions to ask a lawyer

1. **STF thesis scope:** are we within items 7-10 (self-regulation, channels, representative) or within 3.4(d)? Does the "over one million registered users" limit reported on 11/06/2026 appear in the minutes or acórdão? Has the ANPD issued criteria under Decreto 12.975 art. 16-P?
2. **Pre-moderation:** does holding and approving guest pins change our liability posture or our "no prior knowledge" position? Would publish-then-moderate for verified users and hold-for-guests be safer?
3. **Logs and identification:**
   - Is a registered associação outside MCI art. 15 "fins econômicos"? Do donations, ads or a service contract with the Prefeitura change that?
   - How do STJ REsp 1.193.764 and MCI art. 17 interact?
   - How long may we keep identification data (CC art. 206 §3 V)?
   - Is the round 18 wording right: we keep the minimum data to *help* identify an author under a valid request, without promising identification?
4. **LGPD:**
   - Is consent enough for the waitlist?
   - Do the elderly-data and "large scale" criteria, or the potentially high-risk processing (identity, location, photos, possible political opinion), remove us from Res. 2/2022? Until that's confirmed we follow the general deadlines, including art. 19's 15 days.
   - What should the RIPD cover? Round 18 requires one before any CPF, selfie or biometric data.
   - Should we name an encarregado anyway?
   - Is the data-subject procedure in round 18 adequate? It includes a public channel for people without an account and asks for no identity documents by default.
5. **Ouvidoria:** under Decreto 434/2019 and Fala.BR, can a legal entity file as manifestante, can it file per pin, and will the Prefeitura reply to it? What exact consent or authorisation text should we use for sharing identity?
6. **Scoreboard:** wording review; can a *órgão* or the Município be the victim of honour offences or claim *dano moral*; election-year handling; correction and right-of-reply procedure.
7. **Images:** legitimate-interest assessment template; are licence plates personal data; liability for "blurred but still identifiable" images; servants' conduct reports.
8. **Minors (launch condition, DECISIONS round 18):**
   - Is the service "de acesso provável" under the ECA Digital?
   - Are the two `/bem-vindo` confirmations (18+, privacy notice read) enough, or what proportionate age assurance is required? The ANPD's preliminary guidance calls self-declaration alone low-reliability.
   - What is the status of the ANPD's age-assurance guidance?
9. **Elections:**
   - How should art. 9-E "imediata" be read for a tiny provider?
   - Do pseudonyms satisfy Lei 9.504 art. 57-D, and is the round 18 moderation rule (no "Anônimo em público" for electoral propaganda, with contestation) adequate?
   - What effect does Lei 9.504 art. 73 VI b have on a verified Prefeitura account?
10. **Entity (reverses round 6, per DECISIONS round 18):** an associação is a prerequisite for the user-content launch and for any civil verification; the waitlist can run before it.
    - Which statute clauses do we need (non-economic purposes, funding sources), and what governance and duties?
    - Who is the "representante" under item 10 and under Decreto 8.771 art. 16-A?
    - What is the directors' exposure (CC art. 50; LGPD art. 42)?
    - Contract with the Prefeitura, or informal cooperation?
11. **Transfers:** which vendors will sign the ANPD standard clauses; Brazilian-region hosting; SMS/WhatsApp provider role and location.
12. **Electronic signatures (civil identity, path A):**
    - Is accepting gov.br advanced signatures through our terms of use valid under MP 2.200-2 art. 10 §2 (S39)?
    - This is the basis to rely on, not Lei 14.063 art. 4 II: Lei 14.063 art. 2, parágrafo único, II "a" excludes interactions between private parties (S40).
    - Is reading the CPF from the signer's certificate to check uniqueness (keeping only an HMAC) proportionate?
13. **Recycled phone numbers:**
    - After 180 days without a sign-in, an account can only be reopened with a passkey (DECISIONS round 18). Anatel keeps released numbers unassigned for at least 6 months (S41).
    - Is that acceptable under consumer and data-subject rules, given that the person may lose the old account?

---

## 9. Prudent defaults

1. **Incorporate an associação** before public posting opens. It satisfies the "representante pessoa jurídica" expectation (STF item 10; Decreto art. 16-A) and enables contracts, banking and Fala.BR identification.
2. **Landing page today:** privacy notice per LGPD art. 9; unticked consent box; minimal fields; stated retention; a working channel for data-subject requests (Res. 2/2022 art. 11 §1); processor list; one-click unsubscribe.
3. **Identification:** phone encrypted; IP, source port, UTC timestamp and account ID per post; keep 6 months minimum; disclose only on court order; written procedure for requests.
4. **Self-regulation pack (STF items 7-9; Decreto art. 20-A):** published terms and moderation rules; notification channel for users and non-users; acknowledge each notice; reasoned decision; contest route; annual transparency report. Internal targets (policy, not law): acknowledge within 48 h; decide within 7 days; remove at once content on the grave-crime list and intimate imagery (MCI art. 21).
5. **Honour content:** removal on extrajudicial notice is permitted (item 3.2); define the criteria and tell the poster the reason (MCI art. 20).
6. **Photos:** faces and plates blurred publicly; EXIF stripped; no identifiable minors; no private interiors; originals private with restricted access.
7. **Guest pins:** unpublished until confirmed; IP logs; rate limits; forward to the Ouvidoria only after confirmation.
8. **Ouvidoria:** register via Fala.BR as FalaCanoas; one manifestação per pin or cluster; record the protocol; identity only on opt-in; ask the Controladoria/Transparência office for the current Decreto 434/2019 and how they treat entity submissions.
9. **Scoreboard:** the rules in section 2(c), with n, median, methodology, update date and correction channel.
10. **Age:** 18+, stated at sign-up; remove accounts of apparent minors.
11. **Hosting and vendors:** Brazilian region where possible; otherwise ANPD standard clauses (Res. 19/2024 Annex II) in every foreign processor contract.
12. **Incident plan:** notify the ANPD and affected people within 3 business days of knowing (6 if small-agent status is confirmed); keep incident records five years.
13. **Elections:** neutrality notice during campaigns; no boosting; immediate compliance with Justiça Eleitoral orders; no Prefeitura institutional publicity on the platform in restricted periods without legal advice.
14. **Record-keeping:** moderation log (date, content ID, reason, reviewer, appeal), legal-request log, data-access log.
15. **Legal review triggers:** before public posting opens; before any Prefeitura integration or verified account; on the first legal notice; before adding revenue, minors or ads; when the ANPD issues small-provider criteria.

---

## 10. Verification log

**Method note.** Statutes were fetched from planalto.gov.br and read in text. STF thesis texts and news were retrieved from the STF's news site (WebFetch returned HTTP 403; curl succeeded). TSE pages (tse.jus.br, sintse) returned HTTP 403 and could not be opened, so TSE content below is second-hand. Canoas decrees were verified only through the Prefeitura's own 2019 ouvidoria report.

| # | Draft claim | Finding | Source |
|---|---|---|---|
| 1 | CF art. 5º IV quote | Correct. | S1 |
| 2 | "STJ: anonymous denunciations alone cannot support prosecution" | [não verificado] | none |
| 3 | Pseudonym "with CPF backing" is the safe design | Reframed: phone (encrypted) plus IP logs meet the STJ identification standard; a CPF hash cannot identify an author. | S34, S3 |
| 4 | MCI art. 15 §1: small or non-commercial providers are not subject | Wrong. §1 allows a court order to compel retention from providers *outside* the caput. | S2 |
| 5 | Non-commercial project "exempt" from art. 15 | Overstated. Cumulative criteria (legal entity, organised, professional, economic ends); associação defined as non-economic (CC art. 53); no case law found; §§1-2 retention orders apply to any provider. | S2, S5 |
| 6 | MCI art. 21 = "data privacy / marcos gerais" | Wrong. Intimate images; liability "subsidiária" after notice. STF thesis borrows its notice regime. | S2, S22 |
| 7 | STF judgment "June 2026" and "2025 judgment" | Merits concluded 26/06/2025; embargos concluded 17/06/2026 with a revised thesis (solidary liability, honour civil wrongs, 3.4(d), 60-day period, ex nunc from 05/08/2025). | S19, S21, S22 |
| 8 | 8-3 vote | Consistent: dissent by Mendonça, Nunes Marques and Fachin on the points reported. | S19 |
| 9 | "Reasonable care within a reasonable timeframe" for all illegal content | Replaced by the actual regime: art. 21 notice for crimes/illicit acts; art. 19 for honour; falha sistêmica for a closed list; presumed fault for ads/bots. | S22 |
| 10 | STF "acknowledged need to protect small/volunteer operators" | Unsupported. Thesis silent; only item 3.4(d) and 5.3 calibrate by function/activity; 1M-user limit reported provisionally on 11/06/2026 but not in final text. | S22, S23 |
| 11 | Response deadlines of 7 and 3 days | No legal basis; keep as policy. | S22, S14 |
| 12 | Decreto 12.975/2026 | Missing from the draft. Adds arts. 16-A to 16-P, 19-A, 20-A to Decreto 8.771; art. 15-A on porta lógica; art. 16-P differentiated criteria; ANPD as regulator. In force 60 days after publication. | S14 |
| 13 | LGPD art. 7: contract = I, consent = II, public interest = IX | Wrong. Consent I; contract V; legitimate interest IX; public interest only for administration (III). | S3 |
| 14 | Precise coordinates are "sensitive" (art. 5 II) | Wrong. Not in the art. 5 II list. | S3 |
| 15 | "ANPD endorses HMAC-SHA256"; "satisfies pseudonymisation under art. 6" | No source found. Pseudonymised data remain personal data; art. 13 §4 defines pseudonymisation; art. 6 III is necessity. ANPD guide was in public consultation. | S3 |
| 16 | LGPD art. 14: children ≤12, adolescents 13-17; "COPPA-style" gate | ECA art. 2: child is under 12; 12-18 is adolescent. §1 requires parental consent only for children. COPPA is US law; no 13+ threshold in Brazil. | S3, S8 |
| 17 | CC art. 20 liability only for commercial gain or reputational harm | Text: honra, boa fama, respeitabilidade or commercial ends; ADI 4815 annotated (content not verified). | S5 |
| 18 | "LGPD art. 60" governs privacy notices | Wrong. Art. 60 amends MCI arts. 7 and 16. Notice duties: art. 9 (plus 8, 14 §2, 18). | S3 |
| 19 | DPO exemptions by revenue, "non-profit if only own operations" | Res. 2/2022 art. 11: small agents need not name an encarregado but must give a channel; qualification is by art. 2-3 tests. | S25 |
| 20 | Res. 19/2024: vendor SCCs are accepted | Wrong. ANPD standard clauses, adopted without alteration. | S27 |
| 21 | US adequacy "not yet granted" | [não verificado] | none |
| 22 | Breach notification (suspected misattribution) | Draft had no section. Now: art. 48; Res. 15/2024 arts. 5, 6, 9, 10; small-agent doubling. | S3, S26, S25 |
| 23 | Sanctions: "2% or R$50M, whichever is less, against individuals" | Wrong. 2% of the legal entity's Brazilian revenue, capped at R$50M per infraction, plus other sanctions. | S3 |
| 24 | CP penalties: difamação 1-3 years; injúria 1-3 months | Wrong. Difamação 3 months-1 year; injúria 1-6 months or multa. Calúnia 6 months-2 years correct. Art. 141 increases missing. | S4 |
| 25 | Art. 339: 2-8 years | Correct; add §1 (+1/6 for anonymity or false name) and the requirement that the agent *knows* the person innocent. | S4 |
| 26 | Scoreboard is "factual because based on official LAI data" | Not the project's data model; label as resident reports. | this brief |
| 27 | TSE requires removal in 24 h | Not found. Art. 9º-E uses "imediata"; 24 h figures concern vote-day windows. TSE site not accessible. | S35 [second-hand] |
| 28 | Illegal electoral propaganda: Lei 9.504 arts. 326-329, 2 months-3 years | Wrong. Honour crimes: Código Eleitoral arts. 323-326; Lei 9.504 art. 57-H §1 (2-4 years). | S10, S9 |
| 29 | TSE Res. 23.755/2026 | Real (2 March 2026), but the cited law-firm page was not retrievable; content read via Artigo 19. | S35 |
| 30 | Lei 13.460 "arts. 13-16", "30 + 30", "total 60 days" | Art. 16: 30 days, extendable once by an equal period with justification. Manifestações defined in art. 2 V; filing in arts. 9-10. | S6 |
| 31 | Identity preserved under "art. 13 §1º" | Wrong. Art. 10 §7. | S6 |
| 32 | Cannot forward manifestações without a mandate | Overstated. A legal entity is a "usuário" (art. 2 I) and may file in its own name. | S6, S1 |
| 33 | LAI 20+10 days | Correct (art. 11 §§1-2); any "interessado" may ask (art. 10); no registration required. | S7 |
| 34 | Canoas: Lei 6.017/2016, Decreto 434/2019 | Confirmed in the Ouvidoria's 2019 report (CGM created by Lei 6.017/2016; Decreto 434/2019 regulates Lei 13.460; art. 17 quoted). Decree text not retrieved. Current website names the "Secretaria Municipal de Transparência, Controladoria e Governo Digital" and Fala.BR. | S30, S31 |
| 35 | Lei 14.129/2021 section | Unverified claims; removed. | none |
| 36 | Associação registers at the "municipal court"; "501(c)(3)-equivalent"; federal OSC registry | Wrong or unverified. CC art. 45 registration; OSC defined in Lei 13.019 art. 2 I. | S5, S18 |
| 37 | AGPL "raises adoption friction" | Removed as unsupported opinion; neutral note added; Lei 9.609 added. | S16 |
| 38 | ANPD Res. 2/2022 sourced to a gov.br/cidadania page and a law-firm note | Replaced by the ANPD primary text. | S25 |
| 39 | Code Penal link "del2848.htm" | Original 1940 text; use the compiled version. | S4 |
| 40 | ECA Digital | Missing from the draft. Lei 15.211/2025 in force 17/03/2026; Decreto 12.880/2026; ANPD preliminary age-assurance guidance. | S11, S15, S29 |

### Source key (accessed 2026-10-12)

- S1 Constituição Federal: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm
- S2 Lei 12.965/2014 (Marco Civil): https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- S3 Lei 13.709/2018 (LGPD): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- S4 Código Penal (compilado): https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm
- S5 Código Civil (compilado): https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm
- S6 Lei 13.460/2017: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13460.htm
- S7 Lei 12.527/2011 (LAI): https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm
- S8 ECA (Lei 8.069/1990): https://www.planalto.gov.br/ccivil_03/leis/l8069.htm
- S9 Lei 9.504/1997: https://www.planalto.gov.br/ccivil_03/leis/l9504.htm
- S10 Código Eleitoral (compilado): https://www.planalto.gov.br/ccivil_03/leis/l4737compilado.htm
- S11 Lei 15.211/2025 (ECA Digital): https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
- S12 Decreto 9.492/2018 (federal reference): https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/D9492.htm
- S13 Decreto 8.771/2016: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8771.htm
- S14 Decreto 12.975/2026: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12975.htm
- S15 Decreto 12.880/2026: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12880.htm
- S16 Lei 9.609/1998: https://www.planalto.gov.br/ccivil_03/leis/l9609.htm
- S17 Lei 9.784/1999: https://www.planalto.gov.br/ccivil_03/leis/l9784.htm
- S18 Lei 13.019/2014: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13019.htm
- S19 STF news, 26/06/2025 (the STF's own summary): https://noticias.stf.jus.br/postsnoticias/stf-define-parametros-para-responsabilizacao-de-plataformas-por-conteudos-de-terceiros/
- S20 STF 2025 thesis PDF (superseded): https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2025/06/26205223/MCI_tesesconsensuadas.pdf ; STF "Informação à Sociedade": https://www.stf.jus.br/arquivo/cms/noticiaNoticiaStf/anexo/Informac807a771oa768SociedadeArt19MCI_vRev.pdf
- S21 STF news, 17/06/2026: https://noticias.stf.jus.br/postsnoticias/plataformas-terao-60-dias-para-implementar-medidas-estruturais-decide-stf/
- S22 STF final thesis (embargos): https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf
- S23 STF news, 11/06/2026: https://noticias.stf.jus.br/postsnoticias/stf-avanca-na-discussao-de-ajustes-na-tese-do-marco-civil-da-internet/ (and 09/06/2026 list of embargos: https://noticias.stf.jus.br/postsnoticias/stf-vai-analisar-recursos-contra-tese-fixada-no-julgamento-do-marco-civil-da-internet/)
- S24 Cross-check (secondary): Mattos Filho, 22/06/2026: https://www.mattosfilho.com.br/unico/stf-atualiza-teses-fixadas/
- S25 Res. CD/ANPD 2/2022 (consolidated with Res. 15/2024): https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- S26 Res. CD/ANPD 15/2024 (text from a state-government mirror; ANPD list page: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd): https://www.lgpd.ms.gov.br/wp-content/uploads/2024/05/REGULAMENTO-DE-COMUNICACAO-DE-INCIDENTE-DE-SEGURANCA-ABRIL-2024-ANPD-.pdf
- S27 Res. CD/ANPD 19/2024: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- S28 Enunciado CD/ANPD 1/2023: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes
- S29 ANPD, age-assurance preliminary guidance: https://www.gov.br/anpd/pt-br/assuntos/eca-digital/mecanismos-confiaveis-de-afericao-de-idade-orientacoes-preliminares.pdf
- S30 Canoas Ouvidoria management report 2019: https://www.canoas.rs.gov.br/wp-content/uploads/2020/10/RELATORIO-GESTAO-OUVIDORIA-CGM-2019-Canoas.pdf
- S31 Canoas Fala.BR page: https://www.canoas.rs.gov.br/sistemafalabr/
- S32 STJ Súmula 403: https://www.stj.jus.br/docs_internet/revista/eletronica/stj-revista-sumulas-2014_38_capSumula403.pdf
- S33 STJ news on REsp 1.449.082: https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias-antigas/2017/2017-04-10_09-11_Negada-indenizacao-a-manifestante-que-teve-foto-estampada-em-jornal.aspx
- S34 STJ REsp 1.193.764/SP: located through the STJ SCON search (https://scon.stj.jus.br/jurisprudencia/externo/informativo/, search "REsp 1193764"); holding as summarised there; full text not reopened.
- S35 Artigo 19, technical note on Res. TSE 23.755/2026 (quotes the amended text of Res. 23.610): https://artigo19.org/wp-content/blogs.dir/24/files/2026/03/NOTA_TSE2026-VF.pdf ; TSE compiled text (not accessible, HTTP 403): https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-755-de-2-de-marco-de-2026
- S36 Migalhas, "Decreto 12.975/26: por que o IP já não basta para identificar o usuário" (secondary; CGNAT and source port): https://www.migalhas.com.br/depeso/458172/decreto-12-975-26-por-que-o-ip-ja-nao-basta-para-identificar-o-usuario
- S37 Cloudflare, Request Header Transform Rules, fields usable in dynamic values (`cf.edge.client_port`, `cf.edge.server_ip`, `cf.edge.server_port`, `cf.ray_id`): https://developers.cloudflare.com/rules/transform/request-header-modification/reference/fields-functions/ ; Cloudflare HTTP headers (no port header by default): https://developers.cloudflare.com/fundamentals/reference/http-headers/
- S38 Cloudflare Logpush `http_requests` dataset (`ClientSrcPort`, `RayID`, `EdgeStartTimestamp`): https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/zone/http_requests/ ; changelog "Logpush is now available on all plans" (30/09/2026): https://developers.cloudflare.com/changelog/post/2026-09-30-logpush-usage-based-pricing/
- S39 MP 2.200-2/2001, art. 10 §2 (other means of proving authorship and integrity, including certificates not issued by ICP-Brasil, when accepted by the parties): https://www.planalto.gov.br/ccivil_03/mpv/antigas_2001/2200-2.htm
- S40 Lei 14.063/2020 (art. 2, parágrafo único, II "a"; art. 4 II): https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm
- S41 Anatel, Ato nº 12.712/2024, Anexo I, item 22.1 (released numbers not reassigned for at least 6 months): https://informacoes.anatel.gov.br/legislacao/component/content/article/154-atos-de-numera%C3%A7%C3%A3o/2140-ato-12712

---

*Not legal advice. Before launch, review this brief with a Brazilian lawyer in direito digital and proteção de dados, ideally one familiar with Canoas municipal practice.*
