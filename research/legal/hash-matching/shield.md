# Arachnid Shield: terms, eligibility, technical facts and alternatives

Research date: 2026-10-13. Read-only web research. Not legal advice. "[não verificado]" marks anything not confirmed or not found.

## 1. Terms, privacy, data handling

**No Shield-specific terms were found.**
- The OpenAPI spec (v1.1.0) names `https://projectarachnid.ca/en/terms-of-use/` as its termsOfService. That page is the general website licence, last updated 2018-05-14. It never mentions the API, Shield, hashes, media or retention. It is governed by Manitoba law, and s.16 lets C3P disclose information to satisfy any law or governmental request. https://shield.projectarachnid.com/openapi.json , https://projectarachnid.ca/en/terms-of-use/
- The registration form has no checkbox, consent text or link to terms. It asks for name, organisation, title, e-mail, "Location (jurisdiction for the purpose of data protection and privacy)" (EEA, UK, Québec, Other) and a password. https://projectarachnid.com/en/api/accounts/register/
- `/v1/media/submit` says submitted media is prioritised for analysts and "retained for future detection and removal efforts. See our Terms and Conditions of Use". The only terms found that cover submissions are the separate File Upload terms (updated 2024-12-04). They are written for survivors and their guardians:
  - s.11 shares submissions with partner organisations abroad.
  - s.12 requires C3P to contact police or child welfare if a person under 18 is at risk.
  - s.13 lets C3P share the hash, not the image, with police and data recipients.
  - s.31 makes organisations indemnify C3P.
  - s.45 sets Manitoba law and exclusive courts.
  - Whether these apply to the API is [não verificado]. https://projectarachnid.ca/en/fileupload/terms-of-use/
- The Project Arachnid privacy policy (2024-06-20) does not mention the API, Shield, accounts, logs, IP addresses or cookies. What it does say:
  - Each image or video gets a hash "retained for future use".
  - Retention is "not longer than necessary", with no periods given.
  - Data is stored in Manitoba, and non-Canadians "consent to the transfer" to Canada.
  - Hotlines and agencies "facilitate reporting to law enforcement" or issue removal requests.
  - C3P adheres to Canadian private-sector law, or "the spirit of PIPEDA" where that law does not apply.
  https://projectarachnid.ca/en/privacy-statement
- C3P's general policy says its websites collect IP and browser details, use session cookies only, and keep servers in Manitoba (service providers' servers may be elsewhere). It can disclose to police when a child needs protection or under a warrant or subpoena. https://protectchildren.ca/en/privacy-policy/
- **Not found anywhere:**
  - What happens to bytes sent to `/v1/media` (kept, discarded after hashing, logged).
  - What happens to PDQ hashes.
  - Request-metadata retention.
  - Whether C3P is told of, or tells anyone about, a client's match.
  - Client duties (report, preserve, delete).
  - Any use limitation.
- The best practices page covers prevention only. It says nothing on what to do after a match or on reporting duties. https://projectarachnid.ca/en/best-practices/
- Server location: my own whois of `shield.projectarachnid.com` (155.204.98.82) gives "Equinix Internet Access - Winnipeg". That is consistent with Manitoba but is not a C3P statement. A forum post claiming AWS and an MD5 database is unsourced. https://chevereto.com/community/threads/guide-combat-child-abuse-content-using-project-arachnid-api-free.13415/

## 2. Eligibility

- The homepage says Shield is "developed for use by ESPs" and for "companies that want to put a serious effort towards preventing" CSAM. It also says "There is no cost to using this tool." https://projectarachnid.ca/ , https://projectarachnid.com/shield
- No criteria, vetting rules or country restrictions are published.
- The registration page is a "Submit request" form, so approval is probably manual. A forum guide says "granted after reviewing your request to prevent abuse". Chevereto staff (2024-09) wrote it is "free for all after registration". Both are hearsay. https://chevereto.com/community/threads/project-arachnid-api-credentials.15585/
- The SDK READMEs say "obtain login credentials by contacting Project Arachnid". https://github.com/CdnCentreForChildProtection/arachnid-shield-sdk-python
- Whether individuals, non-profits, unincorporated projects or a new associação qualify: [não verificado]. Brazil is not named. It would fall under "Other".
- Contact: shield@projectarachnid.com (from the spec). The web contact form is generic.

## 3. Technical facts

- **Hash types.** The TS SDK documents `exact` as a SHA1 cryptographic match and `near` as "a visual near-match using PhotoDNA". The Python SDK documents `/v1/pdq` as a near match of a PDQ hash "to a known PDQ hash in our database". So the database holds PhotoDNA and PDQ, but whether the two sets are the same is [não verificado]. https://github.com/CdnCentreForChildProtection/arachnid-shield-sdk-ts , https://raw.githubusercontent.com/CdnCentreForChildProtection/arachnid-shield-sdk-python/main/arachnid_shield_sdk/models/scanned_pdq.py
- **Responses.** `/v1/media` returns size, sha1_base32, sha256_hex, classification, match_type and `near_match_details`. `/v1/pdq` takes base64 PDQ hashes (32 bytes each) and returns a result per hash. `/v1/version` returns the database `last_updated_at`.
- **Size.** Not published. The site gives crawler statistics (176 billion+ images processed, 126 million+ suspects, 141 million+ takedown notices, as of 2026-07-01), not a hash count. https://projectarachnid.com/shield
- **Rate limits, latency, uptime, SLA, upload size cap:** none found. The spec lists no 413 or 429. The Python SDK defaults to a 60 s timeout, with no write timeout for uploads.
- **Errors.** An unauthenticated GET to `/v1/version` (my probe) returned 401, `www-authenticate: Basic`, and `{"detail":"please supply your API username and password in the Authorization header"}`. `/v1/url` returns 400, 403 or 502; the SDK test expects "Hostname not authorized for this user".
- **`test` classification.** It appears only in the OpenAPI enum and is undocumented. The SDK enums (Python 0.2.2, TS, Rust, PHP) list only csam, harmful-abusive-material and no-known-match.
- **Test assets.** The Python SDK ships `tests/dog.jpg` (24,335 bytes, sha256 8C3B43FB...). It expects no-known-match, and its CI runs against live credentials. No official match test image or hash was found. A reserved `test` hash is plausible but [não verificado]. Never use real material for tests. https://github.com/CdnCentreForChildProtection/arachnid-shield-sdk-python/tree/main/tests
- **Video.** `/v1/media` accepts `video/*`. A video is classified by its frames, and the worst class wins (csam over harmful-abusive-material).
- **Classes.** `harmful-abusive-material` includes non-explicit images from the abusive incident, and nude or partly nude images of children used in a sexualised context. Plan for two severities.

## 4. Canadian law context

- C3P says it adheres to PIPEDA (or its spirit). Whether PIPEDA formally governs Shield is [não verificado]. The form's EEA, UK and Québec options suggest data-protection handling, but no statement was found.
- The Act is S.C. 2011, c. 4, now titled "...mandatory reporting of Internet child sexual abuse and exploitation material by persons who provide an Internet service" (in force 2011-12-08). Its duties:
  - s.2: report a URL or IP address to the designated organisation, which is C3P under SOR/2011-292.
  - s.3: notify police when there are reasonable grounds that the service was used for an offence.
  - s.4: preserve related data for 21 days.
  - s.6: no duty to search actively.
  - Penalties are summary fines, up to CAD 100,000 for entities.
- It applies to "persons who provide an Internet service" (access, hosting, e-mail). No in-force provision applies it extraterritorially, and s.9 treats a foreign-law report as compliance. A pending amendment would limit s.3 to Canadian computer systems. So it binds Canadian providers, not C3P as a Shield operator and not a Brazilian client (my reading, not legal advice). https://laws-lois.justice.gc.ca/eng/acts/I-20.7/FullText.html , https://laws-lois.justice.gc.ca/eng/regulations/SOR-2011-292/FullText.html
- No C3P statement on foreign Shield clients was found beyond privacy policy §8.

## 5. Who uses Shield; criticism

- Adopters on C3P's site: CIRA, SafeDNS, Friendly WiFi, SafeLabs, DNSFilter, Whalebone, PLDT Home, Smart, Check Step, Netsweeper, Safe Surfer, Icomera. Mostly DNS, network and ISP firms. It is not stated which use the API versus URL lists. https://projectarachnid.com/shield
- Chevereto (self-hosted image-host software) added Shield API v1.0 in v4.2.0 (2024-10). https://chevereto.com/community/threads/project-arachnid-api-credentials.15585/
- Latin America: no Shield user found.
  - Colombia's Te Protejo joined Project Arachnid as an analyst hotline in 2018. https://www.protectchildren.ca/en/press-and-media/news-releases/2018/more-international-tiplines-join-arachnid
  - SaferNet Brasil appears as a Google Content Safety API testimonial, not in Arachnid sources. https://protectingchildren.google/tools-for-partners/
- Criticism, false positives, outages, privacy complaints: nothing found (searches returned nothing). C3P's own report cites Shield as a free tool that could have caught known material. https://projectarachnid.ca/en/annual-report/

## 6. Alternatives

- **Cloudflare CSAM Scanning Tool** (free, no SLA).
  - It scans only content served through the Cloudflare cache of a zone, so pending, uncached photos are not screened.
  - The Service-Specific Terms have you "authorize Cloudflare to provide reports to NCMEC ... Cloudflare will use its NCMEC CyberTipline credentials ... on a third-party basis". They also authorise auditing and blocking, require internal use only, allow throttling or termination, and say the reports "do not relieve you" of local duties.
  - Current docs (updated 2026-05-01) only describe a daily e-mail of matched paths and a block.
  - I found no opt-out from NCMEC reporting. Older docs described the report as the notification e-mail, the URL and the detection time [não verificado]. https://www.cloudflare.com/service-specific-terms-application-services/ , https://developers.cloudflare.com/cache/reference/csam-scanning/ , https://blog.cloudflare.com/a-simpler-path-to-a-safer-internet-an-update-to-our-csam-scanning-tool/
- **Microsoft PhotoDNA Cloud Service:** "free for qualified organizations including technology companies, developers, and non-profit organizations". Apply online; criteria and terms are not published on the page. https://www.microsoft.com/en-us/photodna
- **Google Content Safety API:** free to "qualifying partners" (industry and civil society), by application, "subject to approval". It scores previously unseen content (it does not match hashes), and the partner must review and act under local law. CSAI Match is for known video. https://protectingchildren.google/tools-for-partners/
- **Thorn Safer:** commercial. Safer Match on AWS Marketplace is a 12-month contract, from about USD 30,720 per year for 1M queries a month, with 172.5M+ hashes. No free tier found. https://aws.amazon.com/marketplace/pp/prodview-dfwekn4bx4ake
- **Meta PDQ/TMK:** open-source algorithms. The repo gives no CSAM hash lists, suggests a Hamming distance of 31 or less as a start, and says to discard quality 49 or lower. https://github.com/facebook/ThreatExchange/tree/main/pdq
- **NCMEC Hash Sharing Platform:** hosts NCMEC, IWF and C3P CSAM hashes plus industry hashes, as MD5, SHA1 and PhotoDNA signatures. It is free to "ESPs and other industry partners". Eligibility for non-US projects and PDQ availability are [não verificado]. https://stellapolaris.childhood.se/natural-language-processing-datorlingvistik/verktyg-i-databasen-som-anvnder-ljud-ai/ncmec-hash-sharing-platform
- **Tech Coalition Lantern:** a member programme built on ThreatExchange. Eligibility for non-members [não verificado]. StopNCII: not researched.

## Implications for the Fala

**Endpoint.**
- Use `POST /v1/pdq`, from the São Paulo triagem service.
  - It sends 32-byte hashes, so no photo leaves Brazil, which fits the project's rule for triagem.
  - It avoids sending bytes to Canada (an LGPD international-transfer question).
  - Ask C3P first whether its PDQ index equals the PhotoDNA and SHA1 coverage of `/v1/media`.
- If C3P says PDQ coverage is lower, use `/v1/media`. It gives exact plus PhotoDNA near matches and handles video. Then disclose the transfer to Canada in the privacy policy.
- Never wire `/v1/media/submit` automatically. It uploads and retains material.
- Never use `/v1/url`, which needs authorised domains and has C3P fetch from your servers.
- On a match, hold the photo and show nothing to volunteers. Preserve it securely and escalate. Do not delete it on your own.
- Brazilian duties on a match (ECA, ECA Digital Lei 15.211/2025 in force 2026-03-17, the reporting channel such as SaferNet) were not researched here. A lawyer should confirm them.

**Ask C3P before registering (shield@projectarachnid.com).**
1. Are Shield API accounts open to a volunteer-run civic platform in Brazil, currently unincorporated and soon an associação? What evidence of identity or legitimacy do you need, and how long does approval take?
2. Where are the Shield-specific Terms and Conditions that govern API use? The OpenAPI links the 2018 website terms, which do not mention the API. Please send the binding text.
3. For `/v1/media`: is submitted media stored, logged or discarded after hashing? For how long? Are non-matching images ever added to a database, shown to analysts or shared?
4. For `/v1/pdq`: are submitted hashes stored, linked to our account, or shared?
5. What request metadata (IP, account, domain, timestamps, result) do you keep, for how long, and where?
6. Is a client's match, or the client's identity, ever reported or disclosed to police (RCMP, NCMEC, foreign police), hotlines or anyone else? Are we notified if you are told?
7. What duties does the client have after a match (report, preserve, delete, notify C3P)? Any restrictions on use, such as prevention only? Does a Brazilian client need a local reporting channel, and do you work with SaferNet Brasil?
8. Does the PDQ index cover the same set as `/v1/media` near-matching (PhotoDNA)? How large and how often updated? What Hamming threshold do you apply, and what is the expected false-positive rate? How do we dispute a match?
9. What are the rate limits, upload size limits, latency targets and uptime? Is there any SLA or status page? How will we hear of outages, terms changes or the end of the service?
10. What is the `test` classification? Are there official test images or hashes for integration tests?
11. Is there a data processing agreement? Which law governs transfers of account data from Brazil (LGPD)? Who are your sub-processors?
12. What are the liability, indemnity and termination terms? Do the Manitoba courts have exclusive jurisdiction?

**Watch in the terms.**
- Anything allowing retention or onward sharing of the photos.
- Unilateral changes without notice.
- Indemnity clauses like File Upload s.31.
- Exclusive Manitoba jurisdiction.
- Termination without notice.
- "ESP" definitions that exclude small or unincorporated projects.
- Duties to report or preserve.
- No SLA.
- Whether a match triggers disclosure of our identity to authorities.
- Get every answer in writing before the first production call.
