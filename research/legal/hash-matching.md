# Matching uploads against known child abuse material: is it lawful, and how

*2026-10-13. Not legal advice. A sourced brief so counsel can confirm the design. It merges three research briefs:*

- *[hash-matching/criminal.md](hash-matching/criminal.md): the ECA as rewritten by Lei 15.487/2026, the ECA Digital, Decreto 12.880/2026, Portaria MJSP 1.312/2026, the STF duty of care, communications secrecy.*
- *[hash-matching/lgpd.md](hash-matching/lgpd.md): legal basis, whether a fingerprint is personal data, transfer to Canada, art. 20, RIPD.*
- *[hash-matching/shield.md](hash-matching/shield.md): Arachnid Shield's terms, data handling, eligibility and technical facts, plus alternatives.*

*"[não verificado]" in the briefs marks what wasn't confirmed from a primary source.*

## Verdict

**Lawful and advisable, in one form only:** compute a PDQ fingerprint of each photo on our own server in São Paulo, and send only the fingerprint to Arachnid Shield (`POST /v1/pdq`). Never send the photo itself, and never upload suspected material to them.

| Option | Criminal law (ECA) | Data protection (LGPD) | Verdict |
|---|---|---|---|
| `/v1/pdq`: a 256-bit fingerprint, computed in São Paulo | A fingerprint isn't a "fotografia, vídeo ou outro registro" (art. 241-A), so nothing that could be abuse material leaves Brazil. | For C3P a bare fingerprint arguably isn't personal data, so arguably no international transfer. The Fala still treats it as personal data in its own records. Legitimate interest, documented. | **Use** |
| `/v1/media`: the photo's bytes sent to Canada | Sending a file that turns out to be abuse material is literally "transmitir". It is defensible on intent and on the duty to detect, but no safe harbour or precedent covers it. | Not defensible. Canada has no adequacy decision. The ANPD's standard clauses need a signed bilateral contract C3P is unlikely to sign. The art. 33 exceptions fit badly. Every pothole photo would export bystanders' faces and plates, and the fingerprint route makes it unnecessary (art. 6º III). | **Don't** |
| `/v1/media/submit`: suspected new material uploaded to C3P | A knowing transfer of suspected material to a foreign non-authority, which keeps a copy. Art. 241-B §2 covers possession for reporting to Brazilian authorities only. | Same transfer problems, aggravated. | **Never** |
| `/v1/url`: C3P fetches from our servers | Our photos are private until approved. | Same as the bytes. | **No** |

## Why scan at all

- **No law names hash matching, but the standard points to it.**
  - Lei 15.211 (ECA Digital) art. 27 covers content "detectados ... direta ou indiretamente".
  - The ANPD (Nota Técnica 1/2026, on Discord) says a platform can't limit itself to "recepção passiva de denúncias".
  - Portaria 1.312 lists "correspondência por hash" as a detection source and "bancos de referência".
  - Decreto 8.771 art. 16-B and the STF thesis judge "falha sistêmica" against the "estado da técnica".
- **The ECA Digital may not reach an 18+ civic map.** Its art. 1 limits it to services directed at, or likely accessed by, minors. ECA art. 241-A and Decreto 8.771 art. 16-B apply regardless.
- **Proactive scanning of photos addressed to us for publication isn't interception.** Communications secrecy (CF art. 5º XII; Marco Civil art. 7º II–III) protects interpersonal communications. A photo sent to a public map is addressed to the Fala.

## Conditions for the design

1. **Fingerprints only, from São Paulo.** Send the base64 PDQ hashes and nothing else: no account, time, place or file name.
2. **A gate, not a filter.** No photo enters the moderation queue until its fingerprint has been checked. If Shield is unreachable, the photo waits and the check retries, with an alert. It never passes unchecked.
3. **Two classes, two responses.**
   - `csam` is treated as detection: Portaria art. 8 §1 accepts detection "por meio automatizado", and human review mustn't delay the report (§2).
   - `harmful-abusive-material` is C3P's own class, which "may not necessarily meet a criminal law threshold". The photo is withheld, and the designated person decides from the match record.
   - Near matches are *indícios*, not proof.
4. **On a match:**
   1. The photo is withheld at once and never served, not even to moderators.
   2. Preserve the bytes (quarantined, access-logged), the hash, Shield's response and database version, the account id, the times and the IP/port logs. This is the cadeia de custódia (Portaria art. 23).
   3. The designated person reviews the match record (class, exact or near), never the image. Then the report goes to the PF (CNCA/Nidus, or SaferNet plus the PF until Nidus registration), saying "fonte: correspondência por hash".
   4. The account is suspended. No consequence then rests "unicamente" on the automatic match (LGPD art. 20), and the contest goes to the controller.
   5. Delete the bytes only after the authority **validates** the report, not on receipt (Portaria art. 23 §2, art. 11 §1). Keep account data and logs at least 6 months, or longer on request.
5. **Records.** Store each check's verdict and Shield's database timestamp. They show the state of the art and feed the transparency report.
6. **Never test with real material.** Use the `test` class if C3P provides test hashes, and stand-ins otherwise.

## What has to change before it's switched on

- **Escalation purge rule (code):** `escalation purge` is allowed once the authority confirms receipt. The Portaria says delete after **validation**. Add a "validada" step to the CLI and move the purge behind it. The same correction applies to step 6 of the draft procedure in `abuso-infantil-e-imagens-intimas.md`.
- **Privacy notice:** it says the screening service "não manda nada a outras empresas". With fingerprints going to C3P that stops being true. The LGPD brief has draft wording: what leaves Brazil (only the fingerprint, without the photo, the name or the account), why, what happens on a match, and the contest route. It also adds the bases (legitimate interest for the scan; arts. 7º II and 11 II "a" and "e" for removal, preservation and reporting). Bump the notice version so `/bem-vindo` asks again.
- **Documentation:**
  - a legitimate-interest assessment (the ANPD's 2024 model);
  - the art. 37 record;
  - a RIPD for the whole upload pipeline (nudity, faces, plates, fingerprints). Automated decisions plus child and sensitive data plausibly make it high risk under Res. 2/2022 art. 4, which also removes the small-agent exemption from naming an encarregado;
  - a vendor file with Shield's terms, C3P's written answers and a dated transfer analysis.

## Before registering: ask C3P in writing

The list of 12 questions is in [hash-matching/shield.md](hash-matching/shield.md). The essential ones:

1. **Eligibility:** is a Brazilian civic project eligible before its associação is incorporated?
2. **Terms:** what are the binding API terms? The OpenAPI links the 2018 website terms, which don't mention the API.
3. **Fingerprint handling:** are fingerprints sent to `/v1/pdq` stored, linked to the account, or shared?
4. **Coverage:** does the PDQ index cover the same material as photo scanning, which uses PhotoDNA?
5. **Disclosure:** is a client's match or identity ever disclosed to any police or hotline?
6. **Data processing agreement:** is there one, or would they accept the ANPD's standard clauses?
7. **Operations:** what are the rate limits, uptime and test hashes?
8. **Local hash lists:** C3P mentions letting high-volume services "scan content locally" with its hash list. Is that open to us? It would make even the fingerprint transfer unnecessary.

## Questions for counsel

1. Is a PDQ fingerprint personal data for C3P, and is the call an art. 33 transfer? If so, which mechanism applies?
2. Is the split of legal bases sound (legitimate interest for the scan; legal obligation and art. 11 for the post-match steps)? Does the ECA Digital's art. 27 reach an 18+ map at all?
3. Is "withhold, human check of the record, suspend, report" enough review under art. 20? What may be withheld from the user, given ECA Digital art. 30 II and investigation secrecy?
4. Who is the "representante legal e funcionário responsável" under art. 241-B §2 III before the associação exists, and do unpaid volunteers ever qualify?
5. Which Portaria tier does a hash match fall in? The fingerprint is of known material, and our client strips metadata, so recency can't be shown: probably 7 days unless a child is visibly at risk.
6. What is our exposure for a false positive, including reporting and suspending on a near match?
7. Do we reach "alto risco" (RIPD, encarregado)?

## Backstops and alternatives

- **Cloudflare CSAM Scanning Tool**, once the domain is live: free. It only sees cached, served content, so it never sees pending photos. It reports to NCMEC as a third party. That doesn't discharge our duty to report to the CNCA, and accepting it means accepting a report to a US body.
- **PhotoDNA Cloud** and **Google's Content Safety API**: free for approved organisations. Both receive images, so they share the bytes problem above.
- **Thorn Safer**: from about US$30k a year. Out of reach.
- **NCMEC Hash Sharing**: eligibility for non-US projects isn't confirmed.
