// Shared profanity filter for the public concern form.
//
// One list, two enforcements:
//   • frontend (src/routes/submit-concern.tsx) — instant inline error + live warning.
//   • backend (backend/src/validation.ts re-exports the same pattern) — 400 rejection
//     so the rule cannot be bypassed with curl/DevTools.
//
// Design notes:
//   • Word-boundary matching: "Scunthorpe problem" safe — "hell" does not match "shell".
//   • Leet/evasive normalization: a→4@, e→3, i→1!|, o→0, s→5$, etc., repeated
//     characters collapsed, zero-width chars stripped — so "sh1t", "f*ck", "b-i-t-c-h"
//     still match. This is a friction filter, not censorship-grade: determined
//     evasion (spaces between every letter, images) is an admin-moderation concern.

/**
 * Base word list. Kept deliberately short and unambiguous (no words that appear
 * inside innocent English/Tagalog words). Extend here — both sides pick it up.
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
 * map leet symbols to letters, drop remaining symbols WITHOUT inserting spaces
 * (so "f*ck"/"b-i-t-c-h" join back into the word), collapse repeats
 * ("shiiit" → "shit"). Symbols still act as boundaries only when they separate
 * two different words ("hello!world" keeps both words intact).
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
    .replace(/[\u200b-\u200d\ufeff]/g, "")
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
  // Doubled letters from natural spelling ("unggoy", "i.e.") collapse here —
  // EXCEPT "gg", which would merge "unggoy" into "ungoy" and miss the list.
  // Protect it with a placeholder through the collapse, then restore.
  const GG = String.fromCharCode(71, 71).toLowerCase();
  const SLOT = String.fromCharCode(1);
  return mapped.split(GG).join(SLOT).replace(/(.)\1+/g, "$1").split(SLOT).join(GG);
}

/**
 * Extra multi-word / spaced variants that the word-boundary pass misses.
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
 * Matching runs on the normalized form but reports the canonical list word.
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
