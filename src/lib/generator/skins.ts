type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

export type GeneratedSkin = {
  tokenId: number;
  name: string;
  rarity: Rarity;
  attributes: Record<string, unknown>;
  imageSvg: string;
};

function hashStringToUint32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function weightedPick<T>(
  rng: () => number,
  options: readonly { value: T; weight: number }[],
): T {
  const total = options.reduce((s, o) => s + o.weight, 0);
  const r = rng() * total;
  let acc = 0;
  for (const o of options) {
    acc += o.weight;
    if (r <= acc) return o.value;
  }
  return options[options.length - 1]!.value;
}

const ADJECTIVES = [
  "Neon",
  "Vanta",
  "Crimson",
  "Arctic",
  "Solar",
  "Phantom",
  "Abyss",
  "Chrome",
  "Nova",
  "Toxic",
] as const;

const NOUNS = [
  "Koi",
  "Shard",
  "Viper",
  "Spectre",
  "Drift",
  "Warden",
  "Mirage",
  "Pulse",
  "Raptor",
  "Grail",
] as const;

const THEMES = [
  { name: "Cyber", bg1: "#0B1020", bg2: "#1B2B6E", accent: "#2EE6A6" },
  { name: "Inferno", bg1: "#1A0B0B", bg2: "#7A1C0D", accent: "#FFB000" },
  { name: "Frost", bg1: "#06141B", bg2: "#0B5D6B", accent: "#B6F0FF" },
  { name: "Violet", bg1: "#0E051A", bg2: "#4B1C7A", accent: "#FF4FD8" },
  { name: "Toxic", bg1: "#081A0D", bg2: "#1F5A2A", accent: "#B6FF3B" },
] as const;

const PATTERNS = ["Grid", "Rings", "Stripes", "Shards", "Noise"] as const;
const EMBLEMS = ["Hex", "Crown", "Bolt", "Skull", "Wing"] as const;
const FINISHES = ["Matte", "Gloss", "Iridescent", "Carbon", "Anodized"] as const;
type Wear = "Factory New" | "Minimal Wear" | "Field-Tested" | "Well-Worn";

function rarityFor(rng: () => number): Rarity {
  return weightedPick(rng, [
    { value: "Common" as const, weight: 60 },
    { value: "Rare" as const, weight: 25 },
    { value: "Epic" as const, weight: 12 },
    { value: "Legendary" as const, weight: 3 },
  ]);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function wearOpacity(wear: Wear) {
  switch (wear) {
    case "Factory New":
      return 0.06;
    case "Minimal Wear":
      return 0.12;
    case "Field-Tested":
      return 0.2;
    case "Well-Worn":
      return 0.3;
  }
}

function buildSvg(params: {
  tokenId: number;
  theme: (typeof THEMES)[number];
  pattern: (typeof PATTERNS)[number];
  emblem: (typeof EMBLEMS)[number];
  finish: (typeof FINISHES)[number];
  wear: Wear;
  rarity: Rarity;
  rng: () => number;
}) {
  const { tokenId, theme, pattern, emblem, finish, wear, rarity, rng } = params;
  const w = 420;
  const h = 420;

  const accent2 =
    theme.accent === "#2EE6A6" ? "#7DF7D2" : theme.accent === "#FFB000" ? "#FF5A2A" : "#6DA8FF";

  const glow = rarity === "Legendary" ? 0.8 : rarity === "Epic" ? 0.55 : rarity === "Rare" ? 0.35 : 0.2;
  const noise = clamp01((rarity === "Common" ? 0.18 : 0.12) + rng() * 0.06);
  const wearOp = wearOpacity(wear);

  const patternId = `p-${tokenId}`;
  const glowId = `g-${tokenId}`;

  const emblemPath = (() => {
    switch (emblem) {
      case "Hex":
        return "M210 118 L278 158 L278 236 L210 276 L142 236 L142 158 Z";
      case "Crown":
        return "M142 252 L156 168 L190 212 L210 162 L230 212 L264 168 L278 252 Z";
      case "Bolt":
        return "M188 118 L246 118 L216 188 L262 188 L176 302 L206 220 L160 220 Z";
      case "Skull":
        return "M210 132 C174 132 154 158 154 192 C154 228 172 248 186 256 L186 278 L234 278 L234 256 C248 248 266 228 266 192 C266 158 246 132 210 132 Z";
      case "Wing":
        return "M146 216 C182 166 230 166 274 186 C254 212 230 230 198 242 C182 248 162 246 146 216 Z";
    }
  })();

  const finishOverlay = (() => {
    switch (finish) {
      case "Matte":
        return `<rect x="0" y="0" width="${w}" height="${h}" fill="#000" opacity="0.08"/>`;
      case "Gloss":
        return `<path d="M-20 60 C 120 10, 240 10, 440 120 L440 0 L-20 0 Z" fill="#fff" opacity="0.12"/>`;
      case "Iridescent":
        return `<linearGradient id="ir-${tokenId}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#FF4FD8" stop-opacity="0.25"/>
  <stop offset="50%" stop-color="#2EE6A6" stop-opacity="0.18"/>
  <stop offset="100%" stop-color="#6DA8FF" stop-opacity="0.22"/>
</linearGradient>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#ir-${tokenId})"/>`;
      case "Carbon":
        return `<pattern id="cb-${tokenId}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
  <rect width="16" height="16" fill="#0b0b0b" opacity="0.06"/>
  <path d="M0 8 H16" stroke="#fff" stroke-opacity="0.07" stroke-width="3"/>
</pattern>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#cb-${tokenId})"/>`;
      case "Anodized":
        return `<rect x="0" y="0" width="${w}" height="${h}" fill="${accent2}" opacity="0.08"/>`;
    }
  })();

  const patternDef = (() => {
    switch (pattern) {
      case "Grid":
        return `<pattern id="${patternId}" width="22" height="22" patternUnits="userSpaceOnUse">
  <path d="M0 0 H22 V22 H0 Z" fill="none" stroke="${theme.accent}" stroke-opacity="${0.08 + glow * 0.06}" stroke-width="1"/>
  <path d="M11 0 V22 M0 11 H22" stroke="${accent2}" stroke-opacity="${0.06 + glow * 0.05}" stroke-width="1"/>
</pattern>`;
      case "Rings":
        return `<pattern id="${patternId}" width="60" height="60" patternUnits="userSpaceOnUse">
  <circle cx="30" cy="30" r="10" fill="none" stroke="${theme.accent}" stroke-opacity="${0.10 + glow * 0.07}" stroke-width="2"/>
  <circle cx="30" cy="30" r="22" fill="none" stroke="${accent2}" stroke-opacity="${0.08 + glow * 0.05}" stroke-width="2"/>
</pattern>`;
      case "Stripes":
        return `<pattern id="${patternId}" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
  <rect width="18" height="18" fill="transparent"/>
  <path d="M0 0 H18" stroke="${theme.accent}" stroke-opacity="${0.12 + glow * 0.06}" stroke-width="6"/>
</pattern>`;
      case "Shards":
        return `<pattern id="${patternId}" width="120" height="120" patternUnits="userSpaceOnUse">
  <path d="M10 110 L55 15 L110 60 Z" fill="${theme.accent}" fill-opacity="${0.08 + glow * 0.06}"/>
  <path d="M20 35 L70 105 L110 25 Z" fill="${accent2}" fill-opacity="${0.06 + glow * 0.05}"/>
</pattern>`;
      case "Noise":
        return `<filter id="n-${tokenId}">
  <feTurbulence type="fractalNoise" baseFrequency="${noise}" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix type="matrix" values="
    1 0 0 0 0
    0 1 0 0 0
    0 0 1 0 0
    0 0 0 0.35 0"/>
</filter>`;
    }
  })();

  const patternFill = pattern === "Noise" ? `url(#n-${tokenId})` : `url(#${patternId})`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="${glowId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    ${patternDef}
    <filter id="gl-${tokenId}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${10 + glow * 12}" result="blur"/>
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 ${0.45 + glow * 0.35} 0"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect x="0" y="0" width="${w}" height="${h}" fill="url(#${glowId})"/>
  <rect x="0" y="0" width="${w}" height="${h}" fill="${patternFill}" opacity="${0.9}"/>

  <circle cx="210" cy="210" r="138" fill="${theme.bg1}" opacity="0.35"/>
  <circle cx="210" cy="210" r="118" fill="${theme.bg2}" opacity="0.35"/>

  <path d="${emblemPath}" fill="${theme.accent}" opacity="${0.7 + glow * 0.2}" filter="url(#gl-${tokenId})"/>
  <path d="${emblemPath}" fill="none" stroke="#fff" stroke-opacity="${0.14 + glow * 0.12}" stroke-width="2"/>

  ${finishOverlay}

  <g opacity="${wearOp}">
    <path d="M40 330 C120 300, 180 360, 260 320 C310 294, 350 310, 390 290" stroke="#000" stroke-opacity="0.65" stroke-width="10" fill="none"/>
    <path d="M70 110 C140 70, 210 120, 310 85" stroke="#000" stroke-opacity="0.45" stroke-width="8" fill="none"/>
  </g>

  <text x="24" y="52" font-family="ui-sans-serif, system-ui" font-weight="700" font-size="22" fill="#fff" opacity="0.85">SKIN</text>
  <text x="24" y="80" font-family="ui-sans-serif, system-ui" font-size="16" fill="#fff" opacity="0.72">#${String(tokenId).padStart(3, "0")}</text>
</svg>`;
}

export function generateSkin(tokenId: number): GeneratedSkin {
  const rng = mulberry32(hashStringToUint32(`skinsnft-v1:${tokenId}`));

  const rarity = rarityFor(rng);
  const theme = pick(rng, THEMES);
  const pattern = pick(rng, PATTERNS);
  const emblem = pick(rng, EMBLEMS);
  const finish = pick(rng, FINISHES);
  const wear = weightedPick<Wear>(rng, [
    { value: "Factory New", weight: rarity === "Legendary" ? 40 : 22 },
    { value: "Minimal Wear", weight: 35 },
    { value: "Field-Tested", weight: 28 },
    { value: "Well-Worn", weight: 15 },
  ]);

  const adjective = pick(rng, ADJECTIVES);
  const noun = pick(rng, NOUNS);
  const name = `${adjective} ${noun} #${String(tokenId).padStart(2, "0")}`;

  const attributes = {
    theme: theme.name,
    pattern,
    emblem,
    finish,
    wear,
    rarity,
  };

  const imageSvg = buildSvg({ tokenId, theme, pattern, emblem, finish, wear, rarity, rng });

  return { tokenId, name, rarity, attributes, imageSvg };
}


