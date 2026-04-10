import { NextResponse } from "next/server";

type LeadSearchRequest = {
  location?: string;
  radiusKm?: number;
  limit?: number;
};

type LeadResult = {
  id: string;
  company: string;
  city: string;
  website: string;
  googleMapsUri?: string;
  placeId?: string;
  source: "google";
};

type GeocodeResponse = {
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    formatted_address?: string;
  }>;
  status?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
  googleMapsUri?: string;
};

type PlacesTextSearchResponse = {
  places?: GooglePlace[];
};

const GOOGLE_GEOCODING_API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";

const SEARCH_TERMS = [
  "pflegeheim",
  "verein",
  "sozialer träger",
  "krankenhaus",
  "kita",
  "bauunternehmen",
  "handwerksbetrieb",
  "logistikunternehmen",
  "steuerberater",
  "hausverwaltung",
];

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeLeads(leads: LeadResult[]) {
  const seen = new Set<string>();
  const result: LeadResult[] = [];

  for (const lead of leads) {
    const key =
      safeString(lead.website).toLowerCase() ||
      `${safeString(lead.company).toLowerCase()}|${safeString(lead.city).toLowerCase()}`;

    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(lead);
  }

  return result;
}

function extractCity(address: string) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return parts[0] || "";
}

async function geocodeLocation(location: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", location);
  url.searchParams.set("key", GOOGLE_GEOCODING_API_KEY);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Geocoding konnte nicht geladen werden.");
  }

  const data = (await response.json()) as GeocodeResponse;
  const first = data.results?.[0];
  const lat = first?.geometry?.location?.lat;
  const lng = first?.geometry?.location?.lng;

  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Ort oder PLZ konnte nicht aufgelöst werden.");
  }

  return { lat, lng };
}

async function searchPlacesForTerm(args: {
  term: string;
  location: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
}) {
  const body = {
    textQuery: `${args.term} in ${args.location}`,
    pageSize: 20,
    locationBias: {
      circle: {
        center: {
          latitude: args.latitude,
          longitude: args.longitude,
        },
        radius: args.radiusKm * 1000,
      },
    },
    languageCode: "de",
    regionCode: "DE",
  };

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.googleMapsUri",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Places API Fehler: ${text}`);
  }

  const data = (await response.json()) as PlacesTextSearchResponse;

  const leads: LeadResult[] = (data.places || []).map((place) => ({
    id: crypto.randomUUID(),
    company: safeString(place.displayName?.text) || "Unbekanntes Unternehmen",
    city: extractCity(safeString(place.formattedAddress || "")),
    website: safeString(place.websiteUri || ""),
    googleMapsUri: safeString(place.googleMapsUri || ""),
    placeId: safeString(place.id || ""),
    source: "google",
  }));

  return leads.filter((item) => item.company);
}

export async function POST(req: Request) {
  try {
    if (!GOOGLE_GEOCODING_API_KEY || !GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_GEOCODING_API_KEY und GOOGLE_PLACES_API_KEY (oder GOOGLE_MAPS_API_KEY) fehlen.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as LeadSearchRequest;

    const location = safeString(body.location);
    const radiusKm = Number(body.radiusKm || 30);
    const limit = Number(body.limit || 20);

    if (!location) {
      return NextResponse.json(
        { error: "location fehlt." },
        { status: 400 }
      );
    }

    const { lat, lng } = await geocodeLocation(location);

    const allResults = await Promise.all(
      SEARCH_TERMS.map((term) =>
        searchPlacesForTerm({
          term,
          location,
          latitude: lat,
          longitude: lng,
          radiusKm,
        })
      )
    );

    const merged = dedupeLeads(allResults.flat());

    const withWebsiteFirst = merged.sort((a, b) => {
      const aScore = a.website ? 1 : 0;
      const bScore = b.website ? 1 : 0;
      return bScore - aScore;
    });

    return NextResponse.json({
      leads: withWebsiteFirst.slice(0, limit),
      meta: {
        location,
        radiusKm,
        requested: limit,
        found: withWebsiteFirst.length,
      },
    });
  } catch (error: any) {
    console.error("BULK LEADS ERROR:", error);

    return NextResponse.json(
      { error: error?.message || "Server Fehler" },
      { status: 500 }
    );
  }
}