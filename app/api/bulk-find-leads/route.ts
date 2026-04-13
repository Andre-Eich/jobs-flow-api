import { NextResponse } from "next/server";

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type GooglePlaceCandidate = {
  placeId: string;
  name: string;
  vicinity: string;
  businessStatus: string;
  types: string[];
};

type GooglePlaceDetail = {
  placeId: string;
  name: string;
  website: string;
  formattedAddress: string;
};

const BLOCKED_HOST_SNIPPETS = [
  "stepstone",
  "indeed",
  "linkedin",
  "facebook",
  "instagram",
  "xing",
  "kununu",
  "meinestadt",
  "stellenanzeigen",
  "jobrapido",
  "glassdoor",
  "gelbeseiten",
  "dasoertliche",
  "yelp",
  "wikipedia",
];

const FOCUS_QUERY_VARIANTS = [
  "{focus} in {location}",
  "{focus} {location}",
  "{focus} unternehmen {location}",
  "{focus} arbeitgeber {location}",
];

const GENERIC_QUERY_VARIANTS = [
  "unternehmen in {location}",
  "arbeitgeber in {location}",
  "firmen in {location}",
  "betriebe in {location}",
];

function normalizeWebsite(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url.trim();
  }
}

function normalizeRadiusMeters(radiusKm: string) {
  const parsed = Number(radiusKm);
  if (!Number.isFinite(parsed) || parsed <= 0) return 30000;
  return Math.max(1000, Math.min(50000, Math.round(parsed * 1000)));
}

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleInPlace<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomBytes = crypto.getRandomValues(new Uint32Array(1));
    const nextIndex = randomBytes[0] % (index + 1);
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
  }
  return items;
}

function urlLooksUseful(url: string) {
  const lowered = url.toLowerCase();
  return !BLOCKED_HOST_SNIPPETS.some((blocked) => lowered.includes(blocked));
}

function placeLooksUseful(place: GooglePlaceCandidate) {
  const loweredName = place.name.toLowerCase();
  const loweredAddress = place.vicinity.toLowerCase();

  if (BLOCKED_HOST_SNIPPETS.some((blocked) => loweredName.includes(blocked))) {
    return false;
  }

  if (
    place.types.some((type) =>
      ["travel_agency", "lodging", "tourist_attraction", "school", "university"].includes(type)
    )
  ) {
    return false;
  }

  return !BLOCKED_HOST_SNIPPETS.some((blocked) => loweredAddress.includes(blocked));
}

async function geocodeLocation(location: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?${new URLSearchParams({
    address: location,
    key: apiKey,
    language: "de",
    region: "de",
  })}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_message || "Geocoding-Fehler.");
  }

  if (data?.status !== "OK") {
    if (data?.status === "ZERO_RESULTS") {
      throw new Error("Fuer den Ort oder die PLZ wurden keine Koordinaten gefunden.");
    }
    throw new Error(data?.error_message || `Geocoding fehlgeschlagen (${data?.status || "unknown"}).`);
  }

  const firstResult = Array.isArray(data?.results) ? data.results[0] : null;
  const locationResult = firstResult?.geometry?.location;

  if (
    !locationResult ||
    typeof locationResult.lat !== "number" ||
    typeof locationResult.lng !== "number"
  ) {
    throw new Error("Leere Geocoding-Antwort.");
  }

  return {
    lat: locationResult.lat,
    lng: locationResult.lng,
    formattedAddress: safeString(firstResult?.formatted_address),
  } satisfies GeocodeResult;
}

async function runPlacesSearch(
  mode: "nearby" | "text",
  params: Record<string, string>,
  apiKey: string
) {
  const endpoint =
    mode === "nearby"
      ? "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
      : "https://maps.googleapis.com/maps/api/place/textsearch/json";

  const url = `${endpoint}?${new URLSearchParams({ ...params, key: apiKey, language: "de" })}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error_message || "Places-Fehler.");
  }

  if (!["OK", "ZERO_RESULTS"].includes(data?.status)) {
    throw new Error(data?.error_message || `Places-Fehler (${data?.status || "unknown"}).`);
  }

  const results = Array.isArray(data?.results) ? data.results : [];

  return results.map((item: Record<string, unknown>) => ({
    placeId: safeString(item.place_id),
    name: safeString(item.name),
    vicinity: safeString(item.vicinity) || safeString(item.formatted_address),
    businessStatus: safeString(item.business_status),
    types: Array.isArray(item.types)
      ? item.types.map((value) => safeString(value)).filter(Boolean)
      : [],
  })) satisfies GooglePlaceCandidate[];
}

async function loadPlaceDetail(placeId: string, apiKey: string) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({
    place_id: placeId,
    fields: "place_id,name,website,formatted_address",
    key: apiKey,
    language: "de",
  })}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    return null;
  }

  if (data?.status !== "OK") {
    return null;
  }

  const result = data?.result;
  if (!result) return null;

  return {
    placeId: safeString(result.place_id) || placeId,
    name: safeString(result.name),
    website: normalizeWebsite(safeString(result.website)),
    formattedAddress: safeString(result.formatted_address),
  } satisfies GooglePlaceDetail;
}

function buildTextQueries(location: string, focus: string) {
  const templates = focus.trim() ? FOCUS_QUERY_VARIANTS : GENERIC_QUERY_VARIANTS;
  const effectiveFocus = focus.trim();

  return templates.map((template) =>
    template
      .replaceAll("{location}", location)
      .replaceAll("{focus}", effectiveFocus)
      .trim()
  );
}

export async function POST(req: Request) {
  try {
    const { location, focus = "", count = 20, radius = "30" } = await req.json();

    const safeLocation = safeString(location);
    const safeFocus = safeString(focus);
    const safeCount = Math.max(1, Math.min(30, Number(count) || 20));
    const safeRadius = safeString(radius) || "30";
    const radiusMeters = normalizeRadiusMeters(safeRadius);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!safeLocation) {
      return NextResponse.json({ error: "Bitte Ort oder PLZ angeben." }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY fehlt." }, { status: 500 });
    }

    const geocode = await geocodeLocation(safeLocation, apiKey);
    const locationParam = `${geocode.lat},${geocode.lng}`;

    const nearbyCandidates = await runPlacesSearch(
      "nearby",
      {
        location: locationParam,
        radius: String(radiusMeters),
        keyword: safeFocus || "unternehmen",
      },
      apiKey
    );

    const textQueries = buildTextQueries(safeLocation, safeFocus);
    const textCandidates = [];
    for (const query of textQueries) {
      const results = await runPlacesSearch("text", { query }, apiKey);
      textCandidates.push(...results);
      if (textCandidates.length >= safeCount * 3) {
        break;
      }
      await sleep(60);
    }

    const candidateMap = new Map<string, GooglePlaceCandidate>();
    for (const candidate of shuffleInPlace([...nearbyCandidates, ...textCandidates])) {
      if (!candidate.placeId || !candidate.name || !placeLooksUseful(candidate)) continue;
      if (!candidateMap.has(candidate.placeId)) {
        candidateMap.set(candidate.placeId, candidate);
      }
    }

    const shortlisted = Array.from(candidateMap.values()).slice(0, Math.max(safeCount * 4, 24));
    const detailedCandidates: Array<GooglePlaceCandidate & { detail?: GooglePlaceDetail | null }> = [];

    for (const candidate of shortlisted) {
      const detail = await loadPlaceDetail(candidate.placeId, apiKey);
      detailedCandidates.push({ ...candidate, detail });
      if (detailedCandidates.length >= safeCount * 3 && detailedCandidates.filter((item) => item.detail?.website).length >= safeCount) {
        break;
      }
      await sleep(40);
    }

    const deduped = Array.from(
      new Map(
        detailedCandidates
          .filter((candidate) => {
            const website = candidate.detail?.website || "";
            return !website || urlLooksUseful(website);
          })
          .map((candidate) => {
            const websiteKey = candidate.detail?.website?.toLowerCase();
            const fallbackKey = `${candidate.name.toLowerCase()}|${candidate.vicinity.toLowerCase()}`;
            return [websiteKey || fallbackKey, candidate] as const;
          })
      ).values()
    );

    const prioritized = deduped
      .sort((a, b) => {
        const aHasWebsite = Number(Boolean(a.detail?.website));
        const bHasWebsite = Number(Boolean(b.detail?.website));
        return (
          bHasWebsite - aHasWebsite ||
          a.name.localeCompare(b.name, "de", { sensitivity: "base" })
        );
      })
      .slice(0, safeCount);

    return NextResponse.json({
      leads: prioritized.map((candidate) => ({
        id: crypto.randomUUID(),
        selected: true,
        company: candidate.detail?.name || candidate.name,
        city: safeLocation,
        website: candidate.detail?.website || "",
        analysisStatus: "idle",
        analysisStars: 0,
        analysisSummary: "",
        foundJobTitles: [],
        foundCareerUrls: [],
        contactStatus: "idle",
        email: "",
        emailOptions: [],
        emailNeedsReview: false,
        contactPerson: "",
        contactPersonOptions: [],
        phone: "",
        industry: "",
        qualityStatus: "idle",
        qualityStars: 0,
        qualitySummary: "",
        alreadyContacted: false,
        lastContactAt: "",
        sendStatus: "idle",
      })),
      requestedCount: safeCount,
      foundCount: prioritized.length,
      complete: prioritized.length >= safeCount,
      searchMeta: {
        location: safeLocation,
        radiusKm: safeRadius,
        geocodedAddress: geocode.formattedAddress,
      },
    });
  } catch (error: unknown) {
    console.error("BULK FIND LEADS GOOGLE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unternehmenssuche fehlgeschlagen." },
      { status: 500 }
    );
  }
}
