/* ------------------------------------------------------------------ *
 * Brief extraction
 *
 * A PRD arrives as whatever the person already had: a markdown file, a
 * plain text export, a PDF from the client, a Word document from the
 * product manager. All the planner needs is the words, so each format is
 * reduced to text and nothing else.
 *
 * Server-only: the parsers are Node libraries, and a 4MB PDF has no
 * business being shipped to the browser to be read there.
 * ------------------------------------------------------------------ */

export const ACCEPTED_BRIEF_TYPES = [
  ".md",
  ".markdown",
  ".txt",
  ".pdf",
  ".docx",
] as const;

export const MAX_BRIEF_BYTES = 8 * 1024 * 1024;

/** Guard against a 400-page PDF blowing the model's context and the bill. */
const MAX_CHARS = 120_000;

export class BriefError extends Error {}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
}

export async function extractBriefText(file: File): Promise<string> {
  if (file.size > MAX_BRIEF_BYTES) {
    throw new BriefError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is 8MB — paste the relevant part instead.`
    );
  }

  const ext = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;

  switch (ext) {
    case ".md":
    case ".markdown":
    case ".txt":
      text = buffer.toString("utf-8");
      break;

    case ".pdf": {
      // Imported lazily: pulling a PDF parser into every request that does
      // not need one is a cost paid on the cold start of the whole route.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        text = result.text;
      } finally {
        await parser.destroy();
      }
      break;
    }

    case ".docx": {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer });
      text = value;
      break;
    }

    default:
      throw new BriefError(
        `SpecFlow can read ${ACCEPTED_BRIEF_TYPES.join(", ")} — "${file.name}" is none of those.`
      );
  }

  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();

  if (cleaned.length < 40) {
    throw new BriefError(
      "That file came back nearly empty. If it is a scanned PDF the text is an image, so paste the brief instead."
    );
  }

  return cleaned.length > MAX_CHARS
    ? cleaned.slice(0, MAX_CHARS) + "\n\n[truncated]"
    : cleaned;
}
