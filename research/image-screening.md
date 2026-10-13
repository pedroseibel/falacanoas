# Automatic image screening: options compared

*Researched 2026-10-13 for DECISIONS round 20 (BUILD 5.7, 2.11). Prices are public list prices that day. "[não verificado]" means it could not be confirmed.*

**Need:** before a volunteer's first look, flag nudity (1) and find faces (3) and licence plates (4), with boxes, so the public copy can be blurred (round 6). Minors (2) and text in images (5) are optional. Volume: 50–500 photos/day at first, perhaps 2,000/day at peak.

**Finding:** no managed vendor covers 1, 3 and 4 while processing in Brazil.

| Option | Nudity | Faces (boxes) | Plates (boxes) | 500/day | 2,000/day | Where |
|---|---|---|---|---|---|---|
| [AWS Rekognition](https://docs.aws.amazon.com/general/latest/gr/rekognition.html) | yes | yes | not dedicated [não verificado] | ~US$39–58/mo | ~US$156–234/mo | sa-east-1 (São Paulo). But AWS [may store content elsewhere to improve services](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_ai-opt-out.html) unless an AI opt-out policy is set. JPEG/PNG only. |
| [Google Vision](https://cloud.google.com/vision/pricing) | SafeSearch (likelihood) | yes | "License plate" object, missed in some full-frame tests | ~US$74–95/mo | ~US$310–398/mo | No Brazil region found. [LGPD addendum](https://business.safety.google/processorterms/lgpd/); doesn't train on content. |
| [Azure Content Safety](https://learn.microsoft.com/en-us/azure/ai-services/content-safety/faq) | severity 0–6 | Face API is Limited Access | no | [não verificado] | [não verificado] | No standalone Brazil South for images. |
| [Sightengine](https://sightengine.com/pricing) | yes | yes | no | ~US$109/mo | ~US$379/mo | US/EU sub-processors. Has a `minor` score (Pro plan). |
| [Plate Recognizer Blur](https://guides.platerecognizer.com/docs/blur/api-reference) | no | yes | yes, returns a blurred image | ~US$75/mo | ~US$225/mo | Cloud in the US; on-prem SDK custom-priced. |
| [Workers AI](https://developers.cloudflare.com/workers-ai/models/) | no NSFW model | only via general vision models | only via general vision models | cents | cents | Inference location not stated. |
| **Self-hosted** (NudeNet, a CenterFace/YuNet face detector, a YOLO plate detector) | [NudeNet](https://pypi.org/project/nudenet/), MIT | [deface](https://github.com/ORB-HD/deface), MIT | [open-image-models](https://pypi.org/project/open-image-models/) (weights licence not stated) | US$0–22/mo | US$0–22/mo | Wherever it runs: a small container in São Paulo ([Fly `gru`](https://docs.fly.io/reference/regions), ~US$22/mo always on; [Cloudflare Containers](https://developers.cloudflare.com/containers/pricing/) bill only active CPU, Brazil placement [não verificado]). |

**Caveats:**
- Age estimation is unreliable: AWS AgeRange ranges overlap by design.
- No open plate detector has been verified on Mercosul plates; the [UFPR-ALPR](https://arxiv.org/pdf/1909.01754) dataset covers only the old grey ones.
- A missed plate or face is a privacy leak, so blur generously (pad boxes about 30%, as deface's `--mask-scale 1.3` does).

**Recommendation (adopted in round 20):**
1. A small self-hosted service in São Paulo running the open models. No photo leaves Brazil, no vendor processes residents' photos, and it costs almost nothing.
2. Volunteers keep the final say. The model only sorts the queue: it pre-hides likely nudity and marks photos with faces, plates or text.
3. Before trusting it to blur instead of a human removing the photo, label 200–300 real Canoas photos and measure recall on faces, grey plates and Mercosul plates. Fine-tune the plate detector if recall is under about 95%.
4. Minors: don't pay for an age signal. Blurring every face protects children better than guessing ages.
5. Fallback if there's no engineering time: AWS Rekognition in sa-east-1 with the AI opt-out set, plus a plate service.
