export interface JewelryTypeOption {
  id: string;
  label: string;
  icon: string;
}

export const JEWELRY_TYPES: JewelryTypeOption[] = [
  { id: "ring", label: "Ring", icon: "💍" },
  { id: "necklace", label: "Necklace", icon: "📿" },
  { id: "earring", label: "Earring", icon: "✨" },
  { id: "bracelet", label: "Bracelet", icon: "⭕" },
  { id: "bangle", label: "Bangle", icon: "🔵" },
  { id: "pendant", label: "Pendant", icon: "💎" },
  { id: "brooch", label: "Brooch", icon: "🌸" },
  { id: "anklet", label: "Anklet", icon: "🦶" },
  { id: "chain", label: "Chain", icon: "🔗" },
  { id: "set", label: "Set", icon: "👑" },
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
