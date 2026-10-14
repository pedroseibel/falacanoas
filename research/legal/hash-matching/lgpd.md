# LGPD brief: CSAM hash screening of uploads (Arachnid Shield)

*2026-10-13. Not legal advice: a sourced brief for counsel. "[não verificado]" = not confirmed from a primary source in this pass. Source IDs [L#] are listed at the end.*

## Bottom line

- **Image bytes to Canada (`/v1/media`): not defensible** under Res. CD/ANPD 19/2024. There is no adequacy for Canada, the ANPD standard clauses need a signed, unaltered bilateral contract, the art. 33 exceptions fit badly, and hash-only is a less intrusive route, which defeats "necessidade".
- **PDQ hash only (`/v1/pdq`): the defensible design.** For C3P a bare 256-bit hash arguably is not "dado pessoal", so arguably no "transferência internacional". But the ANPD reads personal data "objectively", has not ruled on perceptual hashes, and for the Fala the hash is tied to a photo it holds. Treat it as personal data in the Fala's own paperwork.
- **Basis:** legitimate interest (art. 7º IX), documented; legal obligation only for the steps after a match. Do a RIPD. The notice line "não manda nada a outras empresas" stops being true.

## 1. Legal basis for scanning every upload

- **Art. 7º IX:** "quando necessário para atender aos interesses legítimos do controlador ou de terceiro, exceto no caso de prevalecerem direitos e liberdades fundamentais do titular". Art. 10: only data "estritamente necessários" (§1), transparency (§2), the ANPD may ask for a RIPD (§3). Protecting child victims is an interest "de terceiro" [L1].
- **ANPD legitimate-interest guide (Feb 2024)** [L5]:
  - Three phases: finalidade, necessidade, balanceamento e salvaguardas.
  - The test is "boa prática e medida recomendável", "ferramenta essencial" for art. 6º X and art. 37, not mandatory. "O controlador deve elaborar teste de balanceamento e manter registro da justificativa".
  - If inconclusive or unmitigated, "deverá ser adotada outra base legal". Impact need not be zero, only minimised.
  - Legitimate interest is "não aplicável ao tratamento de dados pessoais sensíveis" (it is only in art. 7º, not art. 11).
- **Sensitive-data wrinkle** [leitura própria]: most uploads (potholes) are not sensitive, but a positive match is an image of a child's sexual life (art. 5º II "vida sexual"). Legitimate interest cannot carry that phase. Use art. 11 II "a" (obrigação legal) and "e" (proteção da vida ou da incolumidade física de terceiro). Whether "física" covers sexual exploitation, and any ANPD view on CSAM scanning: [não verificado].
- **Legal obligation (art. 7º II)?**
  - ECA Digital art. 27 [L11]: providers "deverão remover e comunicar os conteúdos de aparente exploração, de abuso sexual ... detectados em seus produtos ou serviços". Decreto 12.880 art. 39 §1 [L12]: who "identificarem material criminoso" must remove it and preserve it. Art. 40 §2 excuses "falha isolada ou residual, inerente ao estado da técnica".
  - These duties start on detection. I found no express duty to scan every upload, and neither text mentions hashing. Commentary calling art. 27 "proactive" is secondary [não verificado].
  - The STF "estado da técnica" and "falha sistêmica" language pushes toward scanning but is not an art. 7º II duty. Anchor removal, preservation and reporting on art. 7º II / 11 II "a", not the blanket scan.
- **Not fit:** consent (bystanders cannot give it, art. 8º §3; offenders will not). Art. 4º III (public security) is closed to private persons (§2).
- **Documentation expected:** a LIA in the ANPD model (Annex II); the art. 37 record (simplified for small agents, Res. 2/2022 art. 9 [L8]); a RIPD; the notice (arts. 9º, 10 §2); an objection channel (art. 18 §2); a log of scan results and decisions.

## 2. Is a PDQ hash personal data? Biometric?

- **Text:** art. 5º I "informação relacionada a pessoa natural identificada ou identificável". Art. 5º III: anonimizado = "que não possa ser identificado, considerando a utilização de meios técnicos razoáveis e disponíveis". Art. 12: not personal "salvo quando o processo de anonimização ... for revertido, utilizando exclusivamente meios próprios, ou quando, com esforços razoáveis, puder ser revertido" (§1: "custo e tempo ... tecnologias disponíveis"). Art. 13 §4: pseudonymised = association only via "informação adicional mantida separadamente" [L1].
- **ANPD guidance:** no final anonymisation guide found (a draft went to consultation in early 2024; no 2025–26 final located [não verificado]). Two technical studies (v1.0, Nov 2023) [L6]: anonymisation is a risk-based process whose first act is itself processing; "a LGPD aponta para a teoria objetiva do conceito amplo de dado pessoal" (others' reasonable means count); illicit means are "irrazoáveis"; avoid "cenários irreais". Non-binding.
- **Not personal (for C3P):**
  - 32 bytes, lossy, identifies an image not a person, no identifiers; our API key names the Fala, not the resident.
  - Madden et al. (2024): PDQ, PhotoDNA and NeuralHash "robust" to inversion; on diverse images "not able to learn any meaningful inversions" [L16].
  - CJEU *EDPS v SRB* (C-413/23 P, 4 Sep 2025): relative approach, pseudonymised data may be non-personal for a recipient lacking means to re-identify [L17]. Persuasive only; the ANPD's "objective" wording cuts the other way.
- **Personal:**
  - For the Fala the hash maps to a photo and an account ("meios próprios").
  - Hawkes et al. (IEEE S&P Magazine 2024): "low-budget" GAN inversion including PDQ, on consumer hardware (CelebA faces) [L16]. Athalye recovered rough faces and body shapes from 144-byte PhotoDNA hashes (PDQ not tested there).
  - So "not designed to be reversible" is not "irreversible"; Meta's PDQ README makes no such claim [não verificado beyond README].
- **Biometric?** Art. 5º II: "dado genético ou biométrico, quando vinculado a uma pessoa natural"; no statutory definition. ANPD NT 17/2025 §4.1 [L7]: data from "tratamento técnico específico relativo às características físicas, fisiológicas ou comportamentais ... que permitam ou confirmem a identificação única dessa pessoa"; §5.2 cites GDPR Recital 51 (photographs count only with specific means of unique identification).
  - Against: PDQ fingerprints a whole image, identifies no person uniquely, and is not "vinculado" to one.
  - For: faces may partly survive in the hash; the ANPD's biometrics rulemaking (Agenda 2025–26, item 5) is open [2026 status não verificado].
  - Assessment: low risk, not zero. Our face detection (no recognition) is already disclosed.

## 3. International transfer (Canada)

- **Two layers.** Legitimate interest is a basis, not a transfer mechanism. Res. 19 art. 9 needs both a hypothesis of art. 7º/11 and a valid mechanism, and art. 9 par. único limits it to the "mínimo necessário" [L2].
- **Is hash-only a transfer?** Art. 5º: transfer exists "quando o exportador transferir dados pessoais para o importador" (art. 3º IV). If the hash is not personal data on leaving, art. 33 is not engaged. This is a reading, not an ANPD ruling [não verificado].
- **Adequacy:** only the EU (Res. CD/ANPD 32/2026 art. 1: "Fica reconhecida a União Europeia") [L3]. The ANPD page says the EU is the only one so far and a list will follow [L4]. Nothing for Canada.
- **Standard clauses:**
  - Art. 16: "adoção integral e sem alteração ... mediante instrumento contratual firmado entre o exportador e o importador"; other terms cannot "excluir, modificar ou contrariar" them (§2). Existing contracts had 12 months (art. 2º par. único; ended 23/08/2025); no equivalent clauses are recognised [L4].
  - No rule bans click-through form, but C3P must accept Annex II unaltered (clause 9: accession "em comum acordo"). C3P's website terms (maybe not the Shield API terms, visible only after sign-up [não verificado]) are amendable "at any time without prior notice", give a licence over submissions "for any purpose whatsoever", and choose Manitoba law [L15]. That clashes with Annex II. Countersignature is unlikely [não verificado].
- **Art. 33 exceptions** (Res. 19 art. 9 II "c"):
  - IV ("proteção da vida ou da incolumidade física ... de terceiro"): arguable for one suspected image, not a blanket scan.
  - IX (with art. 7º II): ECA Digital requires reporting to the PF or an "autoridade internacional competente" (Decreto art. 39 §1), not sending uploads to a charity. Weak.
  - VIII (consent "específico e em destaque"): unusable. II "d", III, V–VII: n/a.
- **Bytes:** necessity is the killer (art. 6º III). Every photo would also export bystanders' faces and plates. Sending a suspected CSAM file abroad may raise ECA art. 241-A exposure [não verificado; counsel].
- **No-transfer route:** C3P says high-volume services can "scan content locally" with the Arachnid or IWF hash lists, on application [L15]. Eligibility [não verificado].
- **C3P context:** data stored in Manitoba; it cites PIPEDA and "legitimate interest" [L15]. PIPEDA covers "commercial activity"; whether it governs Shield [não verificado].

## 4. Art. 20 (automated decisions)

- **Text** (Lei 13.853/2019): right "a solicitar a revisão de decisões tomadas unicamente com base em tratamento automatizado ... que afetem seus interesses". §1: "informações claras e adequadas a respeito dos critérios e dos procedimentos", subject to trade and industrial secrecy. The 2018 words "por pessoa natural" are gone and §3 is "VETADO": no statutory human reviewer [L1]. ANPD rulemaking on art. 20 is open (NT 12/2025) [secondary].
- **Design so no consequence is "unicamente" automatic:**
  - The auto-hide is an interim, reversible step.
  - The 90-day suspension and the report follow a check by the designated person (and backup) of the match record: class, exact vs near, never the image.
  - Shield's classes are `csam`, `harmful-abusive-material`, `no-known-match`, `test` [L14]. C3P says harmful-abusive material "may not necessarily meet a criminal law threshold" [L15], so it should not auto-escalate as CSAM.
- **Tipping off:** the LGPD has no carve-out for private controllers. Anchors:
  - MCI art. 20 [L13]: reasons are owed "salvo expressa previsão legal ou expressa determinação judicial fundamentada em contrário".
  - Decreto art. 38: reports get "classificação de sigilo".
  - ECA Digital art. 30 II would require saying whether detection was "análise humana ou automatizada" and offering appeal. It sits in the art. 29 takedown procedure (services directed at or likely accessed by minors); scope for counsel.
  - Practice: publish the general criteria in the notice (meets §1 in generic form). Withhold case detail only with recorded reasons (art. 18 §4 II: "razões de fato ou de direito"). The contest goes to the controller, as round 20 built.

## 5. Transparency, RIPD, encarregado

- **Notice:** art. 9º I–VII; §3 (processing is a condition to post: say so prominently); art. 10 §2. Any transfer adds Res. 19 art. 17 §2: a plain-Portuguese page (form, duration, purpose, country, controller, shared use, responsibilities, security, rights), with the full clauses on request within 15 days [L2].
- **RIPD (art. 38):** the ANPD "poderá determinar". Its Q&A: send only when asked, but prepare before high-risk processing, using Res. 2/2022 art. 4 as the parameter [L9]. No RIPD regulation found in 2026 [secondary].
  - Art. 4 needs one general and one specific criterion [L8]. General: processing that "possa afetar significativamente interesses e direitos fundamentais" (§2: impeding use of a service, image, reputation). Specific: "c) decisões tomadas unicamente com base em tratamento automatizado"; "d) dados pessoais sensíveis ou de ... crianças".
  - A false positive (suspension, referral) plus child and sensitive data plausibly meets 1+1.
  - **Advisable:** one RIPD for the whole upload pipeline (nudity, faces, plates, hash). If it is high risk, small-agent relief ends (art. 3º I).
- **Encarregado:** art. 41 and §1 (public identity). Res. 2/2022 art. 11 exempts small agents only without high-risk processing, and still requires a channel [L10]. Name one, separate from the CSAM designated person.

## 6. EU context (for counsel only)

- Reg. (EU) 2021/1232 is a temporary ePrivacy derogation (arts. 5(1), 6(1)) for voluntary detection by number-independent interpersonal communications services, with conditions such as state-of-the-art technology, human oversight and a DPIA [de memória; EUR-Lex blocked].
- It lapsed 3–4 Apr 2026; the Council adopted an extension to 3 Apr 2028 on 23 Jul 2026, excluding end-to-end encrypted messaging. OJ publication not confirmed; the permanent CSA Regulation is still in trilogue [L18]. Hosting uploads are outside its target; EU hosts rely on GDPR legitimate interest and DSA art. 7 [de memória].

## Implications for the Fala

**(a) Image bytes to Canada.** Do not. No adequacy, no Annex II counterparty, weak exceptions, hash-only defeats necessity, bystanders' and minors' images would leave Brazil, and the notice sentence would be false. If ever needed, only per suspected image, with counsel (art. 33 IV/IX).

**(b) PDQ hashes only.** Go, with conditions:
- Compute in São Paulo. Send only base64 hashes: no account id, time, place or filename.
- Get C3P's written confirmation of no retention or linkage, or ask for Annex II.
- Ask whether an associação qualifies (the page says "companies") and about the local hash-list option.
- Use the `test` class for QA. Escalate only on `csam`.
- Re-assess if the ANPD calls perceptual hashes personal or biometric. Disclose the flow in the notice anyway.

**(c) Basis and documentation.** A written LIA (ANPD Annex II); an art. 37 record (legitimate interest for the scan; art. 7º II / 11 II "a" and "e" for post-match steps); a RIPD; a match procedure (human check, contest, logs); a vendor file (Shield terms, C3P replies, dated transfer analysis); a named encarregado.

**(d) Privacy-notice wording** (bump `PRIVACY_NOTICE_VERSION`; `/bem-vindo` asks again):
- Replace "não manda nada a outras empresas":
  - "Antes de qualquer pessoa ver a foto, o serviço do Fala em São Paulo calcula uma impressão digital da imagem (um código curto, que não permite refazer a foto) e a compara com uma lista de material de abuso sexual infantil conhecido, mantida pelo Canadian Centre for Child Protection, no Canadá. Só esse código sai do Brasil, sem a foto, sem seu nome e sem sua conta."
  - "Se houver correspondência, a foto sai do ar na hora, uma pessoa responsável confere o registro da correspondência e, confirmado, o caso vai às autoridades; a conta pode ser suspensa. Você pode contestar. Não detalhamos o que possa atrapalhar uma investigação."
- "Bases legais": legitimate interest (art. 7º, IX) for the scan; obrigação legal (art. 7º, II; art. 11, II, "a") to remove, preserve and report.
- A transfer paragraph (country, purpose, mechanism, rights; Res. 19 art. 17 §2) and an art. 20 / art. 18 §2 paragraph with the contest route and encarregado contact.

**(e) Questions for counsel.**
1. Is a PDQ hash "dado pessoal" for C3P, and is the call an art. 33 transfer? If so, which mechanism (IV, IX, or C3P accession to Annex II)?
2. Is the split (legitimate interest for the scan, art. 11 for the post-match step) sound? Does ECA Digital art. 27 or the STF "estado da técnica" make scanning a legal duty?
3. Is hide plus suspension an art. 20 "decisão"? What review suffices, what may we withhold, and does ECA Digital art. 30 apply?
4. Do we reach "alto risco" (RIPD, encarregado)?
5. Does sending a matched file abroad create ECA art. 241-A exposure?
6. Can an unincorporated controller use Shield, and who signs?

## Sources

- [L1] LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- [L2] Res. CD/ANPD 19/2024: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- [L3] Res. CD/ANPD 32/2026: https://www.in.gov.br/web/dou/-/resolucao-n-32-de-26-de-janeiro-de-2026-683334547
- [L4] ANPD transfer page: https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados
- [L5] ANPD legitimate-interest guide (read via a TCE-PB copy; gov.br original not retrieved): https://tce.pb.gov.br/wp-content/uploads/2025/03/guia_legitimo_interesse.pdf
- [L6] ANPD anonymisation study: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd___analise_juridica.pdf ; draft guide: https://www.gov.br/participamaisbrasil/blob/baixar/37060
- [L7] ANPD NT 17/2025: https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/ts-01-2025-nota-tecnica-17-de-abertura.pdf
- [L8] Res. CD/ANPD 2/2022: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- [L9] ANPD RIPD Q&A: https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/relatorio-de-impacto-a-protecao-de-dados-pessoais-ripd
- [L10] ANPD encarregado guide: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_da_atuacao_do_encarregado_anpd.pdf
- [L11] ECA Digital: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm
- [L12] Decreto 12.880/2026: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12880.htm
- [L13] Marco Civil: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- [L14] Shield OpenAPI: https://shield.projectarachnid.com/openapi.json
- [L15] C3P: https://projectarachnid.com/shield ; https://projectarachnid.com/en/terms-of-use/ ; https://projectarachnid.com/en/privacy-statement/ ; https://projectarachnid.com/en/best-practices/
- [L16] https://arxiv.org/abs/2406.00918 (Madden et al.) ; https://arxiv.org/abs/2412.06056 (Hawkes et al.) ; https://anishathalye.com/inverting-photodna/
- [L17] https://www.cliffordchance.com/insights/resources/blogs/talking-tech/en/articles/2025/09/pseudonymized-data-after-edps-v-srb.html
- [L18] https://agenceurope.eu/en/bulletin/article/13915/9/eu-council-formally-adopts-extension-of-derogation-from-eprivacy-until-3-april-2028 ; https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/an-uncertain-path-forward-the-eprivacy-derogation-and-child-safety-detection-102mopa

*Verification notes: statutes and ANPD resolutions were read in text. EUR-Lex and the Shield API-specific terms were not accessible. EU adequacy for Brazil is from ANPD sources only. The current notice is `apps/web/src/features/legal/privacy-page.tsx`.*
