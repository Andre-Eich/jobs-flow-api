import { NextResponse } from "next/server";

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  types?: string[];
};

type PlacesTextSearchResponse = {
  places?: GooglePlace[];
  error?: {
    message?: string;
    status?: string;
  };
};

type GooglePlaceCandidate = {
  placeId: string;
  name: string;
  vicinity: string;
  website: string;
  googleMapsUri: string;
  businessStatus: string;
  types: string[];
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
  "{focus} firma {location}",
];

const GENERIC_QUERY_VARIANTS = [
  "unternehmen in {location}",
  "arbeitgeber in {location}",
  "firmen in {location}",
  "betriebe in {location}",
  "unternehmen {location}",
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

  const response = await fetch(url, { cache: "no-store" });
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

async function runPlacesTextSearch(args: {
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  apiKey: string;
}) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": args.apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri,places.businessStatus,places.types",
    },
    body: JSON.stringify({
      textQuery: args.query,
      pageSize: 20,
      languageCode: "de",
      regionCode: "DE",
      locationBias: {
        circle: {
          center: {
            latitude: args.latitude,
            longitude: args.longitude,
          },
          radius: args.radiusMeters,
        },
      },
    }),
  });

  const data = (await response.json()) as PlacesTextSearchResponse;

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `Places API (New) Fehler${data?.error?.status ? ` (${data.error.status})` : ""}.`
    );
  }

  const places = Array.isArray(data?.places) ? data.places : [];

  return places.map((place) => ({
    placeId: safeString(place.id),
    name: safeString(place.displayName?.text),
    vicinity: safeString(place.formattedAddress),
    website: normalizeWebsite(safeString(place.websiteUri)),
    googleMapsUri: safeString(place.googleMapsUri),
    businessStatus: safeString(place.businessStatus),
    types: Array.isArray(place.types)
      ? place.types.map((item) => safeString(item)).filter(Boolean)
      : [],
  })) satisfies GooglePlaceCandidate[];
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
    const textQueries = shuffleInPlace(buildTextQueries(safeLocation, safeFocus));
    const textCandidates: GooglePlaceCandidate[] = [];

    for (const query of textQueries) {
      const results = await runPlacesTextSearch({
        query,
        latitude: geocode.lat,
        longitude: geocode.lng,
        radiusMeters,
        apiKey,
      });
      textCandidates.push(...results);
      if (textCandidates.length >= safeCount * 3) {
        break;
      }
      await sleep(80);
    }

    const deduped = Array.from(
      new Map(
        shuffleInPlace(textCandidates)
          .filter((candidate) => {
            if (!candidate.placeId || !candidate.name || !placeLooksUseful(candidate)) {
              return false;
            }
            return !candidate.website || urlLooksUseful(candidate.website);
          })
          .map((candidate) => {
            const websiteKey = candidate.website?.toLowerCase();
            const fallbackKey = `${candidate.name.toLowerCase()}|${candidate.vicinity.toLowerCase()}`;
            return [websiteKey || fallbackKey, candidate] as const;
          })
      ).values()
    );

    const prioritized = deduped
      .sort((a, b) => {
        const aHasWebsite = Number(Boolean(a.website));
        const bHasWebsite = Number(Boolean(b.website));
        return (
          bHasWebsite - aHasWebsite ||
          a.name.localeCompare(b.name, "de", { sensitivity: "base" })
        );
      })
      .slice(0, safeCount);

    if (prioritized.length === 0) {
      return NextResponse.json({
        leads: [],
        requestedCount: safeCount,
        foundCount: 0,
        complete: false,
        searchMeta: {
          location: safeLocation,
          radiusKm: safeRadius,
          geocodedAddress: geocode.formattedAddress,
        },
        message: "Keine passenden Unternehmen im gewaehlten Gebiet gefunden.",
      });
    }

    return NextResponse.json({
      leads: prioritized.map((candidate) => ({
        id: crypto.randomUUID(),
        selected: true,
        company: candidate.name,
        city: safeLocation,
        website: candidate.website || "",
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
    console.error("BULK FIND LEADS GOOGLE NEW ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unternehmenssuche fehlgeschlagen." },
      { status: 500 }
    );
  }
}
