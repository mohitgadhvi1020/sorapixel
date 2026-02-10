export interface AspectRatio {
  id: string;
  label: string;
  platform: string;
  ratio: [number, number]; // [width, height]
  width: number;
  height: number;
  /** Composition hint appended to the generation prompt */
  compositionHint: string;
  /** If true the final image should be displayed as a circle (clipped round) */
  circular?: boolean;
}

export const ASPECT_RATIOS: AspectRatio[] = [
  {
    id: "square",
    label: "Square",
    platform: "Instagram Post",
    ratio: [1, 1],
    width: 1080,
    height: 1080,
    compositionHint:
      "Compose for a SQUARE (1:1) frame. Center the product with equal space on all sides. The composition must work perfectly as a square image.",
  },
  {
    id: "circle",
    label: "Circle",
    platform: "Profile / DP",
    ratio: [1, 1],
    width: 1080,
    height: 1080,
    circular: true,
    compositionHint:
      "Compose for a CIRCULAR crop. The product MUST be perfectly centered in a square frame with generous padding on all sides. Keep the product well within the center 70% of the frame so nothing gets clipped when a circular mask is applied. Use a clean, uncluttered background.",
  },
  {
    id: "portrait-4-5",
    label: "Portrait 4:5",
    platform: "Instagram Feed",
    ratio: [4, 5],
    width: 1080,
    height: 1350,
    compositionHint:
      "Compose for a VERTICAL PORTRAIT (4:5) frame. Leave slightly more space above and below the product than on the sides. The product should be centered in a tall frame.",
  },
  {
    id: "story-9-16",
    label: "Story 9:16",
    platform: "WhatsApp Status / Reels",
    ratio: [9, 16],
    width: 1080,
    height: 1920,
    compositionHint:
      "Compose for a TALL VERTICAL (9:16) frame like a phone screen. Place the product in the center-lower area with generous background space above. The scene should fill a tall narrow frame.",
  },
  {
    id: "landscape-16-9",
    label: "Landscape 16:9",
    platform: "YouTube / Facebook",
    ratio: [16, 9],
    width: 1280,
    height: 720,
    compositionHint:
      "Compose for a WIDE LANDSCAPE (16:9) frame. Place the product slightly off-center with the scene extending horizontally. Leave ample space on both sides for a cinematic wide composition.",
  },
  {
    id: "fb-post",
    label: "FB Post",
    platform: "Facebook Post",
    ratio: [191, 100],
    width: 1200,
    height: 628,
    compositionHint:
      "Compose for a WIDE LANDSCAPE (1.91:1) frame. The product should be centered in a wide horizontal composition with the background extending to both sides.",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    platform: "Pinterest Pin",
    ratio: [2, 3],
    width: 1000,
    height: 1500,
    compositionHint:
      "Compose for a TALL (2:3) frame. The product should be in the center with generous vertical space above and below. The scene should feel elongated vertically.",
  },
];

export function getRatioById(id: string): AspectRatio | undefined {
  return ASPECT_RATIOS.find((r) => r.id === id);
}

/** Default ratio when none selected */
export const DEFAULT_RATIO = ASPECT_RATIOS[0]; // square
