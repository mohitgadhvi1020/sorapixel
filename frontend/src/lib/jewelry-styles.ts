export interface JewelryTypeOption {
  id: string;
  label: string;
  icon: string;
  image: string;
}

export const JEWELRY_TYPES: JewelryTypeOption[] = [
  { id: "ring", label: "Ring", icon: "💍", image: "/shot-previews/ring/hero.jpg" },
  { id: "necklace", label: "Necklace", icon: "📿", image: "/shot-previews/necklace/hero.jpg" },
  { id: "earring", label: "Earring", icon: "✨", image: "/shot-previews/earring/hero.jpg" },
  { id: "bracelet", label: "Bracelet", icon: "⭕", image: "/shot-previews/bracelet/hero.jpg" },
  { id: "bangle", label: "Bangle", icon: "🔵", image: "/shot-previews/bangle/hero.jpg" },
  { id: "pendant", label: "Pendant", icon: "💎", image: "/shot-previews/pendant/hero.jpg" },
  { id: "brooch", label: "Brooch", icon: "🌸", image: "/shot-previews/brooch/hero.jpg" },
  { id: "anklet", label: "Anklet", icon: "🦶", image: "/shot-previews/anklet/hero.jpg" },
  { id: "chain", label: "Chain", icon: "🔗", image: "/shot-previews/chain/hero.jpg" },
  { id: "set", label: "Set", icon: "👑", image: "/shot-previews/set/hero.jpg" },
];

export interface JewelryBackground {
  id: string;
  label: string;
  swatch: string;
}

export const JEWELRY_BACKGROUNDS: JewelryBackground[] = [
  { id: "black-velvet", label: "Black Velvet", swatch: "#1a1a1a" },
  { id: "burgundy-velvet", label: "Burgundy Velvet", swatch: "#5a1a2a" },
  { id: "emerald-velvet", label: "Emerald Velvet", swatch: "#1b5e3b" },
  { id: "navy-velvet", label: "Navy Velvet", swatch: "#1a2744" },
  { id: "pure-white", label: "Pure White", swatch: "#ffffff" },
  { id: "cream-silk", label: "Cream Silk", swatch: "#f5ead6" },
  { id: "white-marble", label: "White Marble", swatch: "#f0ece6" },
  { id: "neutral-gray", label: "Neutral Gray", swatch: "#9e9e9e" },
];
