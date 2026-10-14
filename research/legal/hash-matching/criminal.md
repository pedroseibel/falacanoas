# Hash matching for known child abuse material: criminal-law and child-protection brief

*Researched 2026-10-13 for the Fala, Canoas. Not legal advice. The statutes, the Decreto, the Portaria, the STF thesis, the ANPD note and the Shield OpenAPI were read in full text. "[não verificado]" marks secondary sources or my own reading. It builds on `research/legal/abuso-infantil-e-imagens-intimas.md` and repeats only new findings.*

## Bottom line

- No text authorises or forbids sending a *suspected* image to a foreign NGO. Lei 15.487/2026, the ECA Digital, Decreto 12.880 and Portaria 1.312 add no safe harbour for detection tools.
- Hash-only (`/v1/pdq`) sits outside the wording of art. 241-A. Image bytes (`/v1/media`) and above all `/v1/media/submit` do not.
- Regulators lean toward proactive detection. The ANPD: a platform "não pode ... limitar sua atuação à recepção passiva de denúncias". No official text names hash matching.
- A hash match alone can start the reporting clock: the Portaria accepts detection "por meio automatizado". Removal and preservation are enforceable now; the 12 h / 72 h / 7-day clocks are not yet.
- A report to a foreign body does not replace the report to the PF's CNCA for a small Brazilian provider.

## 1. Sending a suspected image abroad: ECA arts. 241-A and 241-B §2

- **Verbs, as rewritten by Lei 15.487** (consolidated [ECA](https://www.planalto.gov.br/ccivil_03/leis/l8069.htm)): art. 241-A, "Oferecer, trocar, disponibilizar, transmitir, distribuir, publicar ou divulgar por qualquer meio, inclusive por meio de sistema de informática ou telemático, fotografia, vídeo ou outro registro que contenha violência sexual contra criança ou adolescente" (4–10 years). Art. 241-E now covers real or fictitious, AI-made material, including "situação, contexto, enquadramento ou pose que evidencie conotação sexual ou libidinosa, ainda que ... cobertos".
- **Reading:** sending a file that does contain such material to C3P is, literally, a "transmissão". The defences are not the verb but (i) *dolo* (CP art. 18, parágrafo único; 241-A has no culpable form) and (ii) the duty to detect and report (Lei 15.211 art. 27), which supports *estrito cumprimento de dever legal* (CP art. 23, III) [leitura própria; no decision found].
  - Scanning unknown uploads: the Fala doesn't know what a file holds and acts to block it. Intent is hard to attribute.
  - `/submit`: the Fala would send a file it *suspects* is abuse material. Intent is easiest to argue there.
- **New §1º III** punishes whoever "cria, administra, hospeda, modera ou é responsável por site, chat, fórum ... com o fim de armazenar, disponibilizar, compartilhar ou produzir material de violência sexual". The purposive clause shields a moderated civic map. The notice rule of §2 ("oficialmente notificado") covers §1º I–II only.
- **Art. 241-B §2 is untouched by Lei 15.487.** "Não há crime se a posse ou o armazenamento tem a finalidade de comunicar às autoridades competentes a ocorrência das condutas descritas nos arts. 240, 241, 241-A e 241-C ... quando a comunicação for feita por ... II – membro de entidade, legalmente constituída, que inclua, entre suas finalidades institucionais, o recebimento, o processamento e o encaminhamento de notícia dos crimes; III – representante legal e funcionários responsáveis de provedor ..., até o recebimento do material relativo à notícia feita à autoridade policial, ao Ministério Público ou ao Poder Judiciário." §3 requires secrecy.
  - It exempts **possession or storage** (241-B), not transmission (241-A).
  - Its addressees are Brazilian authorities. A Canadian NGO is not one, so nothing covers a transfer to C3P. Doctrine splits on whether §2 excludes unlawfulness or the offence type ([Juspodivm](https://meusitejuridico.editorajuspodivm.com.br/2017/12/14/ha-hipoteses-em-que-o-armazenamento-de-imagens-pornograficas-de-menores-nao-e-crime), [Migalhas](https://www.migalhas.com.br/depeso/261684/a-pornografia-infantil-e-os-grupos-de-whatsapp); secondary).
- **Closest recognition of foreign recipients:** Decreto 12.880 art. 39 §1 sends preserved material "ao Centro Nacional de Triagem de Notificações ou à autoridade internacional competente". That is a mandatory *report* to an authority, not a scan of unknown files. C3P is an NGO, so whether it is an "autoridade" is doubtful [não verificado].
- **Hash only:** a 256-bit PDQ hash is not a "fotografia, vídeo ou outro registro que contenha" the scene, so `/v1/pdq` falls outside 241-A [leitura própria]. Caveat: PDQ hashes can be partly inverted into coarse likenesses, and the authors say hashes of abuse images should be handled as sensitive ([arXiv 2412.06056](https://arxiv.org/pdf/2412.06056)). That matters for a *matched* hash, not for pothole hashes.
- **`/submit`** ([OpenAPI](https://shield.projectarachnid.com/openapi.json)): analysts classify the file and it is "retained for future detection and removal efforts". C3P keeps a copy abroad. That conflicts with deleting after validation (Portaria art. 23 §2; the carve-out "ressalvadas as obrigações legais internacionais" covers the provider's own obligations, not C3P's). Portaria art. 30 §4 even bars sending the content to child-protection bodies ("vedada a remessa").
- Shield's `termsOfService` link is the general [Project Arachnid terms](https://projectarachnid.ca/en/terms-of-use/) (2018, Manitoba law). I found no Shield-specific terms [não verificado]; the privacy track should read them.

## 2. Does Brazilian law require, encourage or limit proactive detection?

- **Requires, expressly:** nothing. "Hash", "detec", "proativ", "PhotoDNA" and "varredura" do not appear in Decreto 12.880 (only "falha reincidente nos mecanismos de moderação", art. 40). I found no MJSP, PF or ANPD text recommending PhotoDNA or hash banks.
- **Presupposes it:** Lei 15.211 art. 27 covers content "detectados ... direta ou indiretamente". ANPD [Nota Técnica 1/2026](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/nota_tecnica_1_versao_publica_discord-inc.pdf/@@display-file/file) (§5.17, Discord): the duty "pressupõe que a plataforma mantenha capacidade razoável de identificação das situações abrangidas pela norma". That concerns a service likely accessed by minors; it is not general guidance.
- **Portaria 1.312 assumes reference banks:** art. 2 XIII ("bancos de referência utilizados pelo fornecedor"), art. 4 VII ("mecanismos próprios de prevenção, detecção") and art. 10 I ("correspondência por hash" as a detection source).
- **Standard of care:** Decreto 8.771 art. 16-B §1 (added by [Decreto 12.975/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12975.htm)): "falha sistêmica" when a provider cannot show measures that "forneçam, conforme o estado da técnica, os níveis mais elevados de segurança para o tipo de serviço". The [STF thesis](https://noticias-stf-wp-prd.s3.sa-east-1.amazonaws.com/wp-content/uploads/wpallimport/uploads/2026/06/17180658/MCI_tese.pdf) item 5.3 says the same. The list names ECA arts. 240, 241-A, 241-C and 241-D, not 241-B. An isolated item is not systemic failure (16-B §3; thesis 5.4). That hash matching is the "estado da técnica" at upload is my inference. Art. 16-P allows lighter criteria for small providers; none found.
- **Limits:** Lei 15.211 arts. 34 §1 and 37 parágrafo único, and Portaria art. 5, bar *regulation* from imposing "vigilância massiva, genérica ou indiscriminada". They restrain the State's rules, not a provider's voluntary fingerprint check of photos submitted for publication.
- **Scope doubt:** art. 1 limits the whole Lei 15.211 to services "direcionado[s] a crianças e a adolescentes ... ou de acesso provável por eles", while art. 27 and Decreto arts. 36–40 say "disponíveis no território nacional". Whether an 18+ civic map falls under art. 27 is open [não verificado]. Decreto 8.771 art. 16-B and ECA 241-A §§1–2 apply either way.

## 3. Secrecy of communications (CF 5º XII; MCI 7º II–III)

- **Texts:** CF art. 5º XII, "é inviolável o sigilo da correspondência e das comunicações telegráficas, de dados e das comunicações telefônicas". MCI art. 7º II–III, "sigilo do fluxo de suas comunicações pela internet" and "de suas comunicações privadas armazenadas".
- **Public vs private:**
  - STF thesis 3.4 keeps the art. 19 court-order rule for email and private messaging only "no que diz respeito às comunicações interpessoais, resguardadas pelo sigilo das comunicações". A photo bound for a public map is outside that core.
  - STJ 6ª Turma (Min. Schietti, [30/10/2025](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2025/30102025-Sexta-Turma-valida-ronda-virtual-contra-pornografia-infantil-feita-por-software-da-policia.aspx)): police software in P2P networks is not interception, because it works in an "ambiente virtualmente público". That concerns the State; Lei 15.487 art. 190-F §§1 and 4 later wrote the idea into the ECA.
- **Recipient:** the upload is addressed to the Fala, and secrecy binds third parties and the State. By analogy, the STF lets a participant keep and use a communication (Tema 237, RE 583.937; [secondary](https://jus.com.br/artigos/89260/um-veto-as-gravacoes-ambientais)). RE 418.416 protects the *flow*, not stored data ([secondary](https://migalhas.com.br/arquivos/2024/9/F2680345C4BC9A_voto-gilmar.pdf); a later revision is mentioned, not verified).
- **No decision found** on a platform scanning public-bound uploads [não verificado]. Pending photos are not yet public, so frame them as addressed to the Fala, held for moderation, destined for publication.
- **The real exposure of `/v1/media` is not secrecy** but handing a third party the file and its personal data (MCI art. 7º VII, LGPD): the privacy track.

## 4. After a match

- **Knowledge:** Lei 15.211 art. 27 ("aparente ... detectados"); Decreto art. 39 I ("identificação de conteúdos que evidenciem infrações penais"); Portaria art. 8 §1: "Considera-se confirmada a detecção no momento em que o fornecedor, por meio automatizado ou mediante revisão humana, constatar a existência de indícios". Human review "não poderá ser utilizada como meio de postergar a notificação" (§2). So a match alone is detection, no person need confirm, and the report may state the source as hash matching (art. 10 I). Only *indícios* are needed.
- **Deadline tier (art. 8, calendar days from detection):** 12 h for imminent risk; 72 h for material recent (metadata shows creation within 90 days, art. 2 XII), not previously identified, or made with the provider's capture tool; 7 days otherwise. A hash hit is by definition previously catalogued. The browser strips metadata (`apps/web/src/features/report/photo.ts`), so recency cannot be shown. A match therefore probably falls in the 7-day tier unless a child is visibly at risk [leitura própria; counsel to confirm that the photo picker is not a provider "ferramenta de captura"].
- **Not yet running:** per art. 35, a PF act opening registration is due within 30 days of the 28/09/2026 publication (about 28 Oct). Providers then have 60 days to register, a second PF act follows within 90 days, and the deadlines bind 120 days after it: roughly late July 2027 on the maximum timetable (my arithmetic). Art. 35 §5: that schedule "não afasta, suspende, condiciona ou posterga" removal and preservation.
- **Now:** art. 23 requires "imediata remoção" and preservation, until the CNCA validates, of content, hashes, metadata, account data and records for the *cadeia de custódia* (§1), "observado ... o art. 241-B, § 2º". Lei 15.211 art. 27 §2 retains content and user metadata for the Marco Civil art. 15 period (6 months), extendable on an authority's request (§3; Portaria art. 23 §3).
- **Deletion trigger:** Decreto art. 39 §2 says "Confirmado o recebimento"; Portaria art. 23 §2 says "Após a validação", and art. 11 §1 says the receipt "não implica a validação". Delete only after *validation*; account data and logs stay.
- **Open points:** Lei 15.211 art. 30 II wants removed users told whether identification was "análise humana ou automatizada" (whether it applies to art. 27 removals, and how it fits investigation secrecy, is unclear). I found no express safe harbour for a mistaken report. Art. 35 penalties target non-compliance, excusing "falhas isoladas ou residuais" (Decreto art. 40 §2; Portaria art. 34 §1). CP art. 339 needs knowing falsity.

## 5. Reporting to a foreign body instead of the PF

- **The rules allow it in part.** Art. 27 speaks of "autoridades nacionais e internacionais competentes". Decreto art. 37 §2: providers that "por força de lei" send identical notifications to foreign screening centres "disponíveis para as autoridades brasileiras" are dispensed from the CNCA; §3 equates those reports "para todos os fins jurídicos e probatórios". Portaria art. 6 §2 repeats this (without "por força de lei") if the foreign centre handles these reports and the data are accessible to Brazilian authorities.
- **It does not fit the Fala.** The Decreto targets providers bound by a foreign reporting law (US providers and NCMEC). The Fala is not. That Brazilian authorities can reach what a foreign body holds is unproven.
- **Cloudflare:** its [tool](https://developers.cloudflare.com/cache/reference/csam-scanning/) scans content "served ... through the Cloudflare cache", emails the owner daily and, per [INHOPE](https://inhope.org/articles/cloudflare-simplifying-the-fight-against-csam) (secondary), reports to NCMEC as a third party. Its [blog](https://blog.cloudflare.com/a-simpler-path-to-a-safer-internet-an-update-to-our-csam-scanning-tool/): "site operators are still expected to continue to file their own reports with NCMEC or their regional equivalent". For the Fala that is the CNCA. A Cloudflare hit triggers duties; it is not our report.
- **C3P/Arachnid** is a detection API, not a tipline. Whether it forwards to Brazilian police is [não verificado]. It cannot satisfy art. 27.

## 6. Precedent and practice in Brazil

- **Platforms:** Discord is reported to combine "machine learning e o sistema PhotoDNA" with user reports ([SP Diário, 02/08/2026](https://spdiario.com.br/noticias/noticias-de-sp/operacoes-na-internet-reproduzem-estrutura-de-faccoes-para-cooptar-e-chantagear-criancas.html); the paper's paraphrase).
- **SaferNet:** the Brazilian INHOPE hotline, with the MPF since 2006. In 2024 it forwarded 38,051 pages to other hotlines using automated detection ([Folha PE](https://www.folhape.com.br/noticias/brasil-e-5o-pais-com-mais-denuncias-de-abuso-sexual-infantil-online/402354/)). No SaferNet, MPF or PF statement on hash banks for small platforms found.
- **Courts:** NCMEC reports, built on provider detection, already start Brazilian prosecutions ([MPF-PB, Ação Penal 0800202-48.2024.4.05.8205](https://www.mpf.mp.br/o-mpf/unidades/pr-pb/noticias/a-pedido-do-mpf-justica-condena-homem-por-pornografia-infantojuvenil-na-paraiba)). A ConJur opinion piece ([11/06/2026](https://www.conjur.com.br/2026-jun-11/a-ilegalidade-dos-relatorios-do-ncmec-no-brasil-e-a-jurisprudencia-do-stj/)) reports STJ 5ª Turma, AgRg nos EDcl no AREsp 3.091.178/SP (12/05/2026), treating such reports as "notícia-crime legítima" [não verificado at the STJ]. None addresses hash detection itself, and I found no Brazilian ruling on a provider's automated detection.

## Implications for the Fala

**(a) `/v1/media`, image bytes to Canada**
- It is defensible on intent and duty (art. 27; Decreto 8.771 art. 16-B) but has no safe harbour and no precedent. Get counsel's written view first.
- If used: server-to-server over TLS; keep only the verdict and SHA-256, never the bytes, in our logs.
- Never send a file that a person or a report has already flagged as suspected abuse. That is the `/submit` case.

**(b) `/v1/pdq`, hashes only: preferred**
- Compute the hash in São Paulo. No record leaves Brazil, so art. 241-A and the transfer questions fall away.
- Store the Shield database timestamp and verdict with each check, as evidence of "estado da técnica" and for the transparency report.
- Treat `near` matches and the `harmful-abusive-material` class as indícios: they are C3P classes, not the ECA 241-E definition.
- Videos need sampled frames; counsel should confirm the same reasoning holds.

**(c) `/v1/media/submit`**
- Don't use it. It is a knowing transfer of suspected material to a non-authority abroad, it leaves a retained foreign copy, and it conflicts with deletion after CNCA validation.
- If new-material suspicion arises, preserve it and report it to the CNCA or PF. Any sharing with C3P goes through PF international cooperation (Portaria arts. 4 VIII and 29).

**(d) After a match**
1. Withhold the photo automatically, before any volunteer sees it, and never serve it, even to moderators.
2. Preserve the bytes (quarantined, access-logged), SHA-256, Shield response, account id, timestamps and IP/port logs.
3. Report through the CNCA/Nidus. Until registration, use the PF and SaferNet as in the current procedure. State "fonte: correspondência por hash; sem revisão humana". Human review must not delay it (art. 8 §2).
4. Suspend the account, as the escalation already does.
5. Delete the bytes only after CNCA *validation*. Change the `escalation purge` rule from "received" to "validated". Keep account data and logs at least 6 months or as the authority asks.
6. Only the designated person (and a backup) may open the file, and only if the PF needs it classified. Volunteers never do.

**(e) Questions for counsel**
1. Is sending image bytes to C3P lawful without a safe harbour? Would a PF or MPF opinion, or an agreement with SaferNet, close the gap?
2. Does art. 27 reach an 18+ civic map given art. 1? Does art. 30 II oblige us to tell the user the method?
3. Who is the "representante legal e funcionário responsável" under 241-B §2 III before the associação exists? Do unpaid volunteers qualify?
4. Is C3P a "central de triagem" or "autoridade internacional" under Decreto arts. 37 §2 and 39?
5. Does a `harmful-abusive-material` match trigger art. 27, and in which tier?
6. May we suspend an account and report on an unreviewed match, including a `near` one, and what is our exposure for a false positive?

Other sources read: [Lei 15.487](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/L15487.htm), [Lei 15.211](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/L15211.htm), [Decreto 12.880](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/D12880.htm), [Portaria MJSP 1.312/2026, DOU 28/09/2026](https://www.in.gov.br/web/dou/-/portaria-mjsp-n-1.312-de-24-de-setembro-de-2026-735039189), [Marco Civil](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm), [CF](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm).
