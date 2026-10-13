/**
 * The open models the service runs, pinned by checksum (DECISIONS round 20; research/image-screening.md).
 * `bun run models` downloads them into models/ (gitignored); the service refuses to start without them.
 */
export interface ModelFile {
  file: string;
  url: string;
  /** GitHub release assets come through the API with this header; plain downloads otherwise. */
  accept?: string;
  sha256: string;
  licence: string;
  what: string;
}

export const MODELS = {
  nudity: {
    file: "nudenet-320n.onnx",
    url: "https://api.github.com/repos/notAI-tech/NudeNet/releases/assets/176831997",
    accept: "application/octet-stream",
    sha256: "c15d8273adad2d0a92f014cc69ab2d6c311a06777a55545f2c4eb46f51911f0f",
    licence: "NudeNet v3.4 (AGPL-3.0 repository, MIT package)",
    what: "nudity, with face classes, YOLOv8n at 320 px",
  },
  faces: {
    file: "ultraface-rfb-640.onnx",
    url: "https://github.com/Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB/raw/master/models/onnx/version-RFB-640.onnx",
    sha256: "8f4c659275977e7a3bfbfa339a9c769ad793df50f9c0baa8c14b11baa1646430",
    licence: "MIT",
    what: "faces, Ultra-Light-Fast RFB at 640×480",
  },
  plates: {
    file: "yolo-v9-t-384-plates.onnx",
    url: "https://github.com/ankandrew/open-image-models/releases/download/assets/yolo-v9-t-384-license-plates-end2end.onnx",
    sha256: "888397b96d761c89db40bc9c305838e8652660f5e282c2cadebbe8d2951a77a8",
    licence: "MIT (open-image-models; training data not stated)",
    what: "licence plates, YOLOv9-t at 384 px, NMS inside",
  },
} satisfies Record<string, ModelFile>;
