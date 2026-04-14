const ROLE_WORDS = new Set([
  "ansprechpartner",
  "ansprechpartnerin",
  "contactperson",
  "kontakt",
  "kontaktperson",
  "inhaber",
  "inhaberin",
  "geschaeftsfuehrer",
  "geschäftsführer",
  "geschaeftsfuehrerin",
  "geschäftsführerin",
  "leitung",
  "team",
  "recruiting",
  "hr",
  "personal",
  "karriere",
  "bewerbung",
  "office",
  "info",
  "frau",
  "herr",
  "dr",
  "prof",
]);

function normalizeToken(token: string) {
  return token
    .normalize("NFKC")
    .replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ]+$/g, "")
    .trim();
}

function isRoleWord(token: string) {
  return ROLE_WORDS.has(
    token
      .toLocaleLowerCase("de-DE")
      .replace(/\./g, "")
      .trim()
  );
}

function isNameToken(token: string) {
  return /^[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*$/.test(token);
}

function toDisplayName(token: string) {
  return token
    .split(/([-'])/)
    .map((part) =>
      part === "-" || part === "'"
        ? part
        : part
            .slice(0, 1)
            .toLocaleUpperCase("de-DE")
            .concat(part.slice(1).toLocaleLowerCase("de-DE"))
    )
    .join("");
}

export function sanitizeContactPerson(value: string) {
  const raw = String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const commaParts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedInput =
    commaParts.length === 2 && !/\s/.test(commaParts[0])
      ? `${commaParts[1]} ${commaParts[0]}`
      : raw;

  const tokens = normalizedInput
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token && isNameToken(token) && !isRoleWord(token));

  if (tokens.length < 2) return "";

  return `${toDisplayName(tokens[0])} ${toDisplayName(tokens[tokens.length - 1])}`;
}

export function sanitizeContactPersonOptions(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const sanitized = sanitizeContactPerson(value);
    const key = sanitized.toLocaleLowerCase("de-DE");
    if (!sanitized || seen.has(key)) continue;
    seen.add(key);
    result.push(sanitized);
    if (result.length >= 3) break;
  }

  return result;
}
