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
  { id: "white-marble", label: "White Marble", swatch: "#f0ece6" },
  { id: "pure-white", label: "Pure White", swatch: "#ffffff" },
  { id: "burgundy-velvet", label: "Burgundy Velvet", swatch: "#5a1a2a" },
  { id: "gold-gradient", label: "Gold Gradient", swatch: "#c9a961" },
];
