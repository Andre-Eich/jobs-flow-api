import OpenAI from "openai";

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function fillTemplate(
  template: string,
  theme: string,
  properties: string,
  count: number
) {
  return template
    .replaceAll("{theme}", theme)
    .replaceAll(
      "{properties}",
      properties.trim() || "keine speziellen Eigenschaften"
    )
    .replaceAll("{count}", String(count));
}

const DEFAULT_TEMPLATE = `Erstelle einen natürlichen deutschen Text mit genau {count} Wörtern.

Vorgaben:
- Das Thema "{theme}" muss klar im Text erkennbar sein.
- Eigenschaften: {properties}
- Der Text soll flüssig und sinnvoll klingen.
- Keine Überschrift.
- Keine Erklärung.
- Gib nur den finalen Text aus.
- Genau {count} Wörter.`;

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY fehlt." },
        { status: 500 }
      );
    }

    const client = new OpenAI({
      apiKey,
    });

    const body = await req.json();

    const theme = String(body.theme || "").trim();
    const properties = String(body.properties || "").trim();
    const count = Number(body.count || 0);
    const taskTemplate = String(body.taskTemplate || DEFAULT_TEMPLATE).trim();

    if (!theme) {
      return Response.json(
        { error: "Bitte ein Thema eingeben." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(count) || count < 1 || count > 200) {
      return Response.json(
        { error: "Bitte eine Zahl zwischen 1 und 200 eingeben." },
        { status: 400 }
      );
    }

    const finalPrompt = fillTemplate(taskTemplate, theme, properties, count);

    const response = await client.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content:
            "Du schreibst natürliche, gut lesbare deutsche Texte. Halte dich so genau wie möglich an die gewünschte Aufgabe.",
        },
        {
          role: "user",
          content: finalPrompt,
        },
      ],
    });

    const text = response.output_text?.trim() || "";

    if (!text) {
      return Response.json(
        { error: "Es konnte kein Text generiert werden." },
        { status: 500 }
      );
    }

    return Response.json({
      text,
      actualCount: countWords(text),
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Beim Generieren ist ein Fehler aufgetreten." },
      { status: 500 }
    );
  }
}