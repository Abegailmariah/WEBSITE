// Profanity filter for the API (server-side enforcement).
//
// NOTE: this list intentionally mirrors src/lib/profanity.ts (the frontend
// copy). The backend tsconfig pins `rootDir: src`, so a direct import of the
// frontend file fails the build — keep the two WORD lists and the normalization
// in sync when extending. A mismatch fails loudly via the sync test in
// backend/test-features.mjs ("profanity lists in sync").

/**
 * Base word list. Keep identical to PROFANITY_WORDS in src/lib/profanity.ts.
 */
export const PROFANITY_WORDS = [
  // English vulgarity
  "fuck",
  "shit",
  "bitch",
  "bastard",
  "dick",
  "pussy",
  "asshole",
  "motherfucker",
  "whore",
  "slut",
  // Common Tagalog/Taglish vulgarity
  "putangina",
  "putang",
  "tangina",
  "gago",
  "tanga",
  "bobo",
  "ulol",
  "leche",
  "peste",
  "hayop",
  "punyeta",
  "tarantado",
  // Tagalog sexual vulgarity (incl. common "pakyu" spelling of "fuck you")
  "pakyu",
  "kantot",
  "kantutan",
  "tite",
  "titi",
  "burat",
  "bayag",
  "betlog",
  "pekpek",
  "puke",
  "kiki",
  "suso",
  "dede",
  "jakol",
  "tamod",
  "tumbong",
  "puwet",
  // Tagalog insults / curses (mild + strong)
  "inutil",
  "unggoy",
  "buwisit",
  "buisit",
  "gagu",
  "ogag",
  "siraulo",
  "engot",
  "mangmang",
  "hangal",
  "lintik",
  "yawa",
] as const;

// Leet-speak / symbol substitutions, applied before matching.
const LEET_MAP: Record<string, string> = {
  "4": "a",
  "@": "a",
  "3": "e",
  "1": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "+": "t",
  "2": "z",
};

/**
 * Normalize text for matching: lowercase, strip zero-width/formatting chars,
 * map leet symbols to letters, drop non-letters (so "f*ck"/"b-i-t-c-h" join up),
 * collapse repeats ("shiiit" -> "shit").
 */
export function normalizeForProfanityCheck(input: string): string {
  // Masked vowels: a padding char standing in for a dropped vowel still leaves
  // the word recognizable ("f*ck", "sh_t"). Restore the word up front, before
  // padding chars are stripped below.
  const unmasked = input
    .toLowerCase()
    .replace(/\bf[\*\.\-_~^]+c[\*\.\-_~^]*k\b/g, "fuck")
    .replace(/\bsh[\*\.\-_~^]+t\b/g, "shit")
    .replace(/\bb[\*\.\-_~^]+tch\b/g, "bitch");
  const mapped = unmasked
    .split("")
    .map((ch) => {
      if (LEET_MAP[ch] !== undefined) return LEET_MAP[ch];
      if (/[a-z]/.test(ch)) return ch;
      // Remaining evasive padding inside a word: drop it so letters rejoin
      // ("-" too, so "b-i-t-c-h" collapses back to "bitch").
      if ("*-_.~^-".includes(ch)) return "";
      // True separators (spaces, punctuation between words): keep a boundary.
      return " ";
    })
    .join("");
  // Doubled letters from evasive repeats ("shiiit") collapse here — EXCEPT
  // "gg", which is natural spelling in "unggoy" (collapsing it would merge the
  // word into "ungoy" and miss the list). Protect it through the collapse.
  const GG = String.fromCharCode(71, 71).toLowerCase();
  const SLOT = String.fromCharCode(1);
  return mapped.split(GG).join(SLOT).replace(/(.)\1+/g, "$1").split(SLOT).join(GG);
}

/**
 * Extra multi-word / spaced variants that the word-boundary pass misses.
 * Keep identical to EXTRA_PATTERNS in src/lib/profanity.ts.
 */
const EXTRA_PATTERNS: { pattern: RegExp; label: string }[] = [
  // "sira ulo" written with a space still means "siraulo".
  { pattern: /\bsira\s+ulo\b/, label: "siraulo" },
  // "Fuck you" in latin letters collapses to "fuck"+"you" — catch the phrase
  // explicitly so the spaced variant is reported as fuck.
  { pattern: /\bfuck\s+you\b/, label: "fuck" },
];

/**
 * All listed words found in the text (deduplicated). Returns [] when clean.
 */
export function findProfanity(input: string): string[] {
  if (!input) return [];
  const normalized = ` ${normalizeForProfanityCheck(input)} `;
  const found = new Set<string>();
  for (const word of PROFANITY_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(normalized)) found.add(word);
  }
  for (const { pattern, label } of EXTRA_PATTERNS) {
    if (pattern.test(normalized)) found.add(label);
  }
  return [...found];
}

/** True when the text contains at least one listed word. */
export function containsProfanity(input: string): boolean {
  return findProfanity(input).length > 0;
}
