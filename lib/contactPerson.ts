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

const FEMALE_FIRST_NAMES = new Set([
  "anna",
  "anne",
  "antje",
  "birgit",
  "carmen",
  "christine",
  "claudia",
  "daniela",
  "diana",
  "eva",
  "franziska",
  "gabriele",
  "heike",
  "ines",
  "julia",
  "kathrin",
  "katrin",
  "laura",
  "lena",
  "maria",
  "marie",
  "melanie",
  "petra",
  "nina",
  "sabine",
  "sandra",
  "sarah",
  "simone",
  "sophie",
  "susanne",
  "tanja",
  "theresa",
  "ute",
]);

const MALE_FIRST_NAMES = new Set([
  "alexander",
  "andreas",
  "andre",
  "christian",
  "daniel",
  "david",
  "dennis",
  "felix",
  "frank",
  "holger",
  "jan",
  "jens",
  "jonas",
  "kai",
  "kevin",
  "lars",
  "marcel",
  "marco",
  "markus",
  "martin",
  "michael",
  "mike",
  "paul",
  "oliver",
  "peter",
  "rene",
  "sebastian",
  "stefan",
  "thomas",
  "uwe",
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

function extractNameTokens(value: string) {
  const raw = String(value || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[|/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return [];

  const commaParts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedInput =
    commaParts.length === 2 && !/\s/.test(commaParts[0])
      ? `${commaParts[1]} ${commaParts[0]}`
      : raw;

  return normalizedInput
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token && isNameToken(token) && !isRoleWord(token))
    .map(toDisplayName);
}

function inferGenderFromFirstName(firstName: string) {
  const normalized = String(firstName || "").trim().toLocaleLowerCase("de-DE");
  if (!normalized) return "";
  if (FEMALE_FIRST_NAMES.has(normalized)) return "female";
  if (MALE_FIRST_NAMES.has(normalized)) return "male";
  return "";
}

function inferExplicitSalutation(value: string) {
  const normalized = String(value || "").toLocaleLowerCase("de-DE");
  if (/(^|\s)frau(\s|\.|,|$)/.test(normalized)) return "female";
  if (/(^|\s)herr(\s|\.|,|$)/.test(normalized)) return "male";
  return "";
}

function getContactGreetingParts(value: string) {
  const safeContactPerson = sanitizeContactPerson(value);
  const explicitGender = inferExplicitSalutation(value);

  if (!safeContactPerson) {
    const tokens = extractNameTokens(value);
    const lastName = tokens[tokens.length - 1] || "";

    if (explicitGender && lastName) {
      return {
        gender: explicitGender,
        lastName,
      };
    }

    return null;
  }

  const tokens = safeContactPerson.split(/\s+/).filter(Boolean);
  const firstName = tokens[0] || "";
  const lastName = tokens[tokens.length - 1] || "";
  const gender = explicitGender || inferGenderFromFirstName(firstName);

  return {
    gender,
    lastName,
  };
}

export function buildFormalContactGreeting(value: string) {
  const parts = getContactGreetingParts(value);
  if (!parts) {
    return "Guten Tag,";
  }

  if (parts.gender === "female" && parts.lastName) {
    return `Guten Tag Frau ${parts.lastName},`;
  }

  if (parts.gender === "male" && parts.lastName) {
    return `Guten Tag Herr ${parts.lastName},`;
  }

  return parts.lastName ? `Guten Tag Herr ${parts.lastName},` : "Guten Tag,";
}

export function buildFormalPreviewGreeting(value: string) {
  const parts = getContactGreetingParts(value);
  if (!parts) {
    return "Sehr geehrte Damen und Herren,";
  }

  if (parts.gender === "female" && parts.lastName) {
    return `Sehr geehrte Frau ${parts.lastName},`;
  }

  return parts.lastName
    ? `Sehr geehrter Herr ${parts.lastName},`
    : "Sehr geehrte Damen und Herren,";
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
