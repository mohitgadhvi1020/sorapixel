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
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be SQUARE (1:1 aspect ratio — equal width and height). Center the product with equal space on all sides. The composition must work perfectly as a square image.",
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
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be SQUARE (1:1 aspect ratio). The product MUST be perfectly centered with generous padding on all sides — keep the product well within the center 70% of the frame. Use a clean, uncluttered background.",
  },
  {
    id: "portrait-4-5",
    label: "Portrait 4:5",
    platform: "Instagram Feed",
    ratio: [4, 5],
    width: 1080,
    height: 1350,
    compositionHint:
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be a TALL VERTICAL rectangle with 4:5 aspect ratio (width is 80% of height). The image must be noticeably taller than it is wide. Place the product centered vertically with generous space above and below. Extend the background/scene vertically to fill the tall frame.",
  },
  {
    id: "story-9-16",
    label: "Story 9:16",
    platform: "WhatsApp Status / Reels",
    ratio: [9, 16],
    width: 1080,
    height: 1920,
    compositionHint:
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be a VERY TALL, NARROW VERTICAL rectangle with 9:16 aspect ratio (like a phone screen held upright — the height must be almost TWICE the width). This is critical: the image must be dramatically taller than wide. Place the product in the center with EXTENSIVE background space above and below the product. The background/scene must extend significantly in the vertical direction to fill the entire tall narrow frame. Think full-screen phone wallpaper proportions.",
  },
  {
    id: "landscape-16-9",
    label: "Landscape 16:9",
    platform: "YouTube / Facebook",
    ratio: [16, 9],
    width: 1280,
    height: 720,
    compositionHint:
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be a VERY WIDE, SHORT HORIZONTAL rectangle with 16:9 aspect ratio (like a cinema/TV screen — the width must be almost TWICE the height). This is critical: the image must be dramatically wider than tall. Place the product centered with EXTENSIVE background space to the left and right. The background/scene must extend significantly in the horizontal direction to fill the entire wide frame. Think widescreen cinematic proportions.",
  },
  {
    id: "fb-post",
    label: "FB Post",
    platform: "Facebook Post",
    ratio: [191, 100],
    width: 1200,
    height: 628,
    compositionHint:
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be a WIDE HORIZONTAL rectangle with approximately 1.91:1 aspect ratio (width is nearly double the height). The image must be noticeably wider than tall. Center the product with generous background space extending to both sides.",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    platform: "Pinterest Pin",
    ratio: [2, 3],
    width: 1000,
    height: 1500,
    compositionHint:
      "OUTPUT IMAGE DIMENSIONS: The output image MUST be a TALL VERTICAL rectangle with 2:3 aspect ratio (height is 1.5x the width). The image must be noticeably taller than wide. Place the product centered with generous vertical space above and below. Extend the background/scene vertically to fill the tall frame.",
  },
];

export function getRatioById(id: string): AspectRatio | undefined {
  return ASPECT_RATIOS.find((r) => r.id === id);
}

/** Default ratio when none selected */
export const DEFAULT_RATIO = ASPECT_RATIOS[0]; // square
