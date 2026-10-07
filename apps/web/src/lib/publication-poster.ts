import type { CalendarSheet } from "@/lib/calendar-sheet";

export const PUBLICATION_WIDTH = 675;
export const PUBLICATION_HEIGHT = 900;

export function publicationFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug === "" ? "publication" : slug}.png`;
}

export function containedFrame(
  frame: { x: number; y: number; width: number; height: number },
  image: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const scale = Math.min(frame.width / image.width, frame.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  return {
    x: frame.x + (frame.width - width) / 2,
    y: frame.y + (frame.height - height) / 2,
    width,
    height,
  };
}

export function wrapLine(text: string, maxWidth: number, measure: (value: string) => number): string[] {
  const words = text.split(/\s+/).filter((word) => word !== "");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current === "" ? word : `${current} ${word}`;

    if (measure(next) <= maxWidth) {
      current = next;
      continue;
    }

    if (current !== "") {
      lines.push(current);
    }

    current = word;
  }

  if (current !== "") {
    lines.push(current);
  }

  return lines.length === 0 ? [""] : lines;
}

export async function savePublication(sheet: CalendarSheet): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = PUBLICATION_WIDTH;
  canvas.height = PUBLICATION_HEIGHT;
  const context = canvas.getContext("2d");

  if (context === null) {
    throw new Error("canvas");
  }

  const picture = sheet.posterUrl === null ? null : await loadImage(sheet.posterUrl).catch(() => null);
  paintPublication(context, sheet, picture);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (blob === null) {
    throw new Error("blob");
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = publicationFileName(sheet.title);
  link.click();
  URL.revokeObjectURL(url);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(url));
    image.src = url;
  });
}

function paintPublication(
  context: CanvasRenderingContext2D,
  sheet: CalendarSheet,
  picture: HTMLImageElement | null,
): void {
  const width = PUBLICATION_WIDTH;
  const height = PUBLICATION_HEIGHT;
  const display = readDisplayFont();

  context.fillStyle = "#171310";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#80653b";
  context.lineWidth = 3;
  context.strokeRect(24, 24, width - 48, height - 48);
  context.lineWidth = 1;
  context.strokeRect(32, 32, width - 64, height - 64);

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#80653b";
  context.font = `16px ${display}`;
  let y = 64;
  context.fillText("MAIRIE DE VALENTINE", width / 2, y);
  y += 28;
  context.fillText(sheet.kindLabel.toUpperCase(), width / 2, y);
  y += 44;

  context.fillStyle = "#e0cfa8";
  context.font = `42px ${display}`;
  const titleLines = wrapLine(sheet.title, width - 140, (value) => context.measureText(value).width).slice(0, 3);

  for (const line of titleLines) {
    context.fillText(line, width / 2, y);
    y += 50;
  }

  y += 16;

  if (picture !== null) {
    const frame = { x: 72, y, width: width - 144, height: 360 };
    const fitted = containedFrame(frame, picture);
    context.drawImage(picture, fitted.x, fitted.y, fitted.width, fitted.height);
    y += frame.height + 28;
  }

  context.textAlign = "left";
  const textWidth = width - 144;

  for (const field of sheet.fields) {
    if (y > height - 88) {
      break;
    }

    context.fillStyle = "#9f917d";
    context.font = `14px ${display}`;
    context.fillText(field.label.toUpperCase(), 72, y);
    y += 22;
    context.fillStyle = "#c8b99e";
    context.font = `22px ${display}`;
    const lines = wrapLine(field.value, textWidth, (value) => context.measureText(value).width).slice(0, 6);

    for (const line of lines) {
      if (y > height - 56) {
        break;
      }

      context.fillText(line, 72, y);
      y += 30;
    }

    y += 18;
  }
}

function readDisplayFont(): string {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-rye").trim();

  return family === "" ? "Georgia, serif" : family;
}
