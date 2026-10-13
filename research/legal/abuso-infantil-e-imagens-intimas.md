# Child abuse material and intimate images: duties and procedure

*Researched 2026-10-13 for DECISIONS round 20. This is not legal advice: it is a sourced brief and a draft procedure for the founders to review with counsel before the app opens to the public. "[não verificado]" means a primary source could not be read in this pass; check those first.*

## What the law asks of a platform like the Fala

**ECA (Lei 8.069/1990)** ([text](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm))
- **Art. 241-A §§1–2:** anyone who provides storage or access to child sexual abuse material is liable like the author once the service's legal representative, "oficialmente notificado", fails to disable access.
- **Art. 241-B §§2–3:** possession is not a crime when it serves reporting to the police, the Ministério Público or the courts. This covers only the provider's legal representative and responsible staff, and only until the material reaches the authority, kept confidential. Whether unpaid volunteers count as "responsible staff" is [não verificado], so volunteers should never hold or view the material once it has been identified.
- **Lei 15.487/2026** (in force 7 Aug 2026, per [Senado](https://www12.senado.leg.br/noticias/materias/2026/08/07/lei-aumenta-penas-para-crimes-sexuais-contra-criancas-na-internet)) rewrote arts. 240–241-B around "violência sexual contra criança ou adolescente". It raised penalties, covered AI-generated material (art. 241-E), and added liability for whoever hosts or moderates an environment for storing or sharing it [não verificado: read the consolidated text].

**ECA Digital (Lei 15.211/2025)** ([text](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm)), in force since 17 Mar 2026
- **Art. 27:** providers "disponíveis no território nacional", not only children's services, must remove apparent exploitation or abuse content and report it to the authorities.
- **Art. 27 §§2–3:** they must retain the content, the user's data and the metadata for the Marco Civil art. 15 period (6 months), extendable.
- **Art. 39:** duties scale with the provider's size and its control over content. There is no small-provider exemption.
- **Arts. 28–29** (a reporting mechanism for minors; takedown on notice from victims, MP or child-rights bodies without a court order) apply to services directed at, or likely to be accessed by, minors. Whether a civic map is one is [não verificado]. The Fala is 18+ (round 6), but ask counsel.
- **Regulation:**
  - **[Decreto 12.880/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12880.htm), arts. 36–40:**
    - The Polícia Federal's Centro Nacional (CNCA) receives reports.
    - Providers remove the content immediately and preserve it with the account data.
    - Once the CNCA confirms receipt, they delete the material and keep the account data and metadata.
    - Penalties reach repeated failures, not isolated ones.
  - **Portaria MJSP 1.312/2026**, per [Agência Gov](https://agenciagov.ebc.com.br/noticias/202609/mjsp-regulamenta-notificacao-de-crimes-contra-criancas-em-plataformas-digitais):
    - Reports go through the PF's **Nidus** system.
    - Deadlines are 12 h for imminent risk, 72 h for recent material and 7 days otherwise.
    - Provider registration opens around 29 Oct 2026.
    - The text of the Portaria itself is [não verificado]: read it in the DOU.

**Marco Civil (Lei 12.965/2014)** ([text](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm))
- **Art. 21:** for intimate images (nudity or sex) shared without consent, the platform is liable if it fails to disable them "de forma diligente" after a notice from the person shown or their representative. The notice must identify the material and the sender's standing. No deadline is set.
- **Art. 19 after STF Temas 987 and 533** (26 Jun 2025, [tese](https://sipla.ip.mpg.de/fileadmin/Files/Files/STF_Responsabilidade_de_plataformas_digitais_por_conteudo_de_terceiros.pdf)):
  - For crimes and illicit acts in general, liability starts after an extrajudicial notice. Crimes against honour still need a court order.
  - A duty of care, with liability for systemic failure, covers child abuse material and grave crimes against children, among others.
  - Platforms need a notice channel, due process for removals and an annual transparency report.
- **Art. 15:** 6 months of access logs for legal entities "com fins econômicos". Courts can order retention anyway, so the vault keeps them regardless (round 18).

## What the Fala does (built 2026-10-13)

- **Before anyone sees a photo:** moderation looks at every photo before it goes public (round 19).
- **Hash matching:** automatic matching against known material isn't connected yet (BUILD 5.7).
- **Reports:** "Denunciar" on pins, photos and updates, open to anyone. A report of nudity or a child takes a photo down at once, until a moderator looks. That covers art. 21 notices from people without an account. The data-subject channel (`/privacidade/pedido`) stays the formal path.
- **Escalation:**
  1. A moderator who meets child abuse material presses "É abuso sexual infantil", or ticks the box in "Remover agora".
  2. In that one step it comes down. It is never served again, not even to moderators, and the bytes stay in the private bucket for the authorities.
  3. The case is recorded with the account id, kept without a foreign key so closing the account can't erase it.
  4. The account is suspended for 90 days. The person isn't told what was found, only that "the case is with the team responsible", and their contest goes to the controller, never to volunteers.
- **The controller's side** (`bun --filter @fala/web escalation`):
  1. `list` shows what is still "A DENUNCIAR".
  2. Report it, then `reported <código> <canal> <protocolo>`.
  3. When the authority confirms receipt, `received <código>`.
  4. Only then `purge <código>`, which deletes the bytes and keeps the metadata.
- **Retention:** removed photos lose their bytes six months after removal (the daily job). That excludes anything under an open contest or an escalation.

## Draft procedure, for counsel

1. **Triggers:** a moderator's suspicion, a "Denunciar" report, a future hash match, or an official notice from the MPF, PF or a court.
2. **Stop exposure:** escalate in the app, so it is off the map at once. Share cards and caches follow, since photos are served for at most an hour. Shares already sent outside the Fala can't be recalled.
3. **Don't view, copy or forward it.** No chat, e-mail or screenshots. The designated person (and one backup) may open it once, only if classification needs it, and never on a personal device.
4. **Preserve:** the app already keeps the file unserved and the case, account id, timestamps and moderator action. The vault keeps the access evidence (IP, port, time) for 6 months. If an authority asks to keep it longer, register a preservation hold in the vault (round 18).
5. **Report:**
   - Until Nidus registration exists: SaferNet Brasil ([denuncie](https://new.safernet.org.br/denuncie)), plus a direct report to the Polícia Federal or the MPF. Whether that satisfies art. 27 is [não verificado]; confirm with counsel.
   - Then register the Fala on Nidus and meet the 12 h / 72 h / 7-day deadlines.
   - Record each protocol with `escalation reported`.
6. **After the authority confirms receipt:** `escalation purge`. Check first that no preservation request covers it.
7. **Account:** suspended automatically. Counsel should decide how far to inform the person (Marco Civil art. 20; Lei 15.211 art. 30). Until then the app says only that a post was removed for violating the law and the case is with the team.
8. **Adult intimate images:**
   - On a report, the photo comes down at once.
   - On a notice from the person shown, remove it and log the notice and the removal time.
   - Our own target is within 24 hours of any notice. That is our commitment, not a legal deadline.
   - Point the victim to the police: disseminating intimate images without consent is a crime under Código Penal art. 218-C.
9. **Governance:** a designated person and a backup; a published contact channel; an annual transparency report (STF tese). The associação must exist first: Nidus registration and the STF tese assume a legal-entity representative.

## Hash matching for known material

| Option | Cost | Notes |
|---|---|---|
| [Arachnid Shield](https://projectarachnid.com/shield) (Canadian Centre for Child Protection) | Free | Self-serve registration and API key. Exact and perceptual hashes. Scans bytes at upload, before a volunteer sees them. Brazilian eligibility not stated: ask. **First choice.** |
| [PhotoDNA Cloud Service](https://www.microsoft.com/en-us/photodna/CloudService) | Free for vetted organisations | Unpublished criteria, slow approval. Apply in parallel. |
| [Google Content Safety API](https://protectingchildren.google/tools-for-partners/) | Free for approved partners | A classifier for previously unseen material. Apply in parallel. |
| [Cloudflare CSAM Scanning Tool](https://developers.cloudflare.com/cache/reference/csam-scanning/) | Free | Scans images passing through the Cloudflare cache, at serve time. Whether it sees Worker-streamed photos is [não verificado]. A backstop once the domain is live, not the main control. |
| Thorn Safer | ~US$50k/yr (Vendr median) | Out of reach. |

No SaferNet or PF hash-sharing programme for platforms was found. Ask SaferNet about a partnership.
