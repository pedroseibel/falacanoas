import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { letterbox, nms, unletterbox, type Box } from "./geometry";
import { MODELS } from "./models";

/**
 * The three detectors, each with the preprocessing its model was trained with. Inputs are image bytes
 * (JPEG or WebP, already stripped of metadata by the app); outputs are boxes in the image's pixels.
 */

const dir = fileURLToPath(new URL("../models/", import.meta.url));

/**
 * CPU threads per model and for sharp (TRIAGEM_THREADS): a container's vCPU count. Unset, ONNX opens a
 * thread per core it sees on the host, and under a CPU quota smaller than the host that throttles
 * hard (research/infra/containers: 40 s a photo at ½ vCPU).
 */
const requested = Number(process.env.TRIAGEM_THREADS);
const THREADS = Number.isInteger(requested) && requested > 0 ? requested : undefined;
if (THREADS) sharp.concurrency(THREADS);
const sessions = new Map<string, Promise<ort.InferenceSession>>();
const session = (file: string) => {
  let s = sessions.get(file);
  if (!s) {
    s = ort.InferenceSession.create(`${dir}${file}`, {
      logSeverityLevel: 3,
      ...(THREADS ? { intraOpNumThreads: THREADS, interOpNumThreads: 1 } : {}),
    });
    sessions.set(file, s);
  }
  return s;
};

/** Loads every model now, so the first photo doesn't pay for it and a missing file fails at start. */
export const warmUp = () => Promise.all(Object.values(MODELS).map((m) => session(m.file)));

/** Interleaved RGB bytes to a planar float tensor, [1, 3, h, w]. */
function planar(rgb: Buffer, w: number, h: number, f: (v: number) => number): ort.Tensor {
  const out = new Float32Array(3 * w * h);
  const plane = w * h;
  for (let i = 0; i < plane; i++) {
    out[i] = f(rgb[i * 3] ?? 0);
    out[plane + i] = f(rgb[i * 3 + 1] ?? 0);
    out[2 * plane + i] = f(rgb[i * 3 + 2] ?? 0);
  }
  return new ort.Tensor("float32", out, [1, 3, h, w]);
}

const unit = (v: number) => v / 255;

/** NudeNet's classes, in the model's order (nudenet.py, v3.4). */
const NUDENET_LABELS = [
  "FEMALE_GENITALIA_COVERED",
  "FACE_FEMALE",
  "BUTTOCKS_EXPOSED",
  "FEMALE_BREAST_EXPOSED",
  "FEMALE_GENITALIA_EXPOSED",
  "MALE_BREAST_EXPOSED",
  "ANUS_EXPOSED",
  "FEET_EXPOSED",
  "BELLY_COVERED",
  "FEET_COVERED",
  "ARMPITS_COVERED",
  "ARMPITS_EXPOSED",
  "FACE_MALE",
  "BELLY_EXPOSED",
  "MALE_GENITALIA_EXPOSED",
  "ANUS_COVERED",
  "FEMALE_BREAST_COVERED",
  "BUTTOCKS_COVERED",
];

/** What counts as nudity for the Fala: exposed genitals, breasts, buttocks or anus. */
const EXPOSED = new Set([
  "FEMALE_GENITALIA_EXPOSED",
  "MALE_GENITALIA_EXPOSED",
  "FEMALE_BREAST_EXPOSED",
  "BUTTOCKS_EXPOSED",
  "ANUS_EXPOSED",
]);
const FACE_LABELS = new Set(["FACE_FEMALE", "FACE_MALE"]);

export interface Labelled extends Box {
  label: string;
}

/**
 * NudeNet: the image padded to a square at the bottom and right, resized to 320, RGB in 0–1. The
 * output is [1, 22, N]: a centre-size box and 18 class scores per anchor.
 */
export async function nudenet(bytes: Uint8Array, width: number, height: number): Promise<Labelled[]> {
  const size = 320;
  const side = Math.max(width, height);
  const raw = await sharp(bytes)
    .removeAlpha()
    .extend({ right: side - width, bottom: side - height, background: { r: 0, g: 0, b: 0 } })
    .resize(size, size, { fit: "fill" })
    .raw()
    .toBuffer();
  const s = await session(MODELS.nudity.file);
  const out = (await s.run({ images: planar(raw, size, size, unit) }))["output0"];
  if (!out) return [];
  const data = out.data;
  if (!(data instanceof Float32Array)) return [];
  const n = out.dims[2] ?? 0;
  const scale = side / size;
  const found: Labelled[] = [];
  for (let i = 0; i < n; i++) {
    let best = 0;
    let cls = -1;
    for (let k = 0; k < NUDENET_LABELS.length; k++) {
      const v = data[(4 + k) * n + i] ?? 0;
      if (v > best) {
        best = v;
        cls = k;
      }
    }
    if (best < 0.2 || cls < 0) continue;
    const cx = data[i] ?? 0;
    const cy = data[n + i] ?? 0;
    const w = data[2 * n + i] ?? 0;
    const h = data[3 * n + i] ?? 0;
    found.push({
      x1: (cx - w / 2) * scale,
      y1: (cy - h / 2) * scale,
      x2: (cx + w / 2) * scale,
      y2: (cy + h / 2) * scale,
      score: best,
      label: NUDENET_LABELS[cls] ?? "",
    });
  }
  const labels = [...new Set(found.map((f) => f.label))];
  return labels.flatMap((l) => nms(found.filter((f) => f.label === l)));
}

export const isExposed = (l: Labelled) => EXPOSED.has(l.label);
export const isFace = (l: Labelled) => FACE_LABELS.has(l.label);

/**
 * Ultra-Light-Fast face detector (RFB, 640×480): the image stretched to the input, RGB normalised as
 * (v − 127) / 128; boxes come out decoded, as corners relative to the input.
 */
export async function ultraface(bytes: Uint8Array, width: number, height: number): Promise<Box[]> {
  const [w, h] = [640, 480];
  const raw = await sharp(bytes).removeAlpha().resize(w, h, { fit: "fill" }).raw().toBuffer();
  const s = await session(MODELS.faces.file);
  const out = await s.run({ input: planar(raw, w, h, (v) => (v - 127) / 128) });
  const scores = out["scores"]?.data;
  const boxes = out["boxes"]?.data;
  if (!(scores instanceof Float32Array) || !(boxes instanceof Float32Array)) return [];
  const found: Box[] = [];
  for (let i = 0; i < scores.length / 2; i++) {
    const score = scores[i * 2 + 1] ?? 0;
    if (score < 0.7) continue;
    found.push({
      x1: (boxes[i * 4] ?? 0) * width,
      y1: (boxes[i * 4 + 1] ?? 0) * height,
      x2: (boxes[i * 4 + 2] ?? 0) * width,
      y2: (boxes[i * 4 + 3] ?? 0) * height,
      score,
    });
  }
  return nms(found, 0.3);
}

/**
 * The plate detector (YOLOv9-t, 384, NMS inside the model): a centred letterbox padded with grey 114,
 * RGB in 0–1. Each output row is [batch, x1, y1, x2, y2, class, score] in letterbox space.
 */
export async function plates(bytes: Uint8Array, width: number, height: number): Promise<Box[]> {
  const size = 384;
  const l = letterbox(width, height, size);
  const grey = { r: 114, g: 114, b: 114 };
  const raw = await sharp(bytes)
    .removeAlpha()
    .resize(l.w, l.h, { fit: "fill" })
    .extend({
      top: Math.round(l.padY - 0.1),
      bottom: size - l.h - Math.round(l.padY - 0.1),
      left: Math.round(l.padX - 0.1),
      right: size - l.w - Math.round(l.padX - 0.1),
      background: grey,
    })
    .raw()
    .toBuffer();
  const s = await session(MODELS.plates.file);
  const out = (await s.run({ images: planar(raw, size, size, unit) }))["output0"];
  const data = out?.data;
  if (!out || !(data instanceof Float32Array)) return [];
  const rows = out.dims[0] ?? 0;
  const found: Box[] = [];
  for (let r = 0; r < rows; r++) {
    const score = data[r * 7 + 6] ?? 0;
    if (score < 0.4) continue;
    found.push(
      unletterbox(
        {
          x1: data[r * 7 + 1] ?? 0,
          y1: data[r * 7 + 2] ?? 0,
          x2: data[r * 7 + 3] ?? 0,
          y2: data[r * 7 + 4] ?? 0,
          score,
        },
        l,
      ),
    );
  }
  return found;
}
