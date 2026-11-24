"use client";

import { useId, useState } from "react";
import { artworkPath, illustratedLabel, type ArtworkName } from "./Artwork";

import "./ResultShare.css";

interface ResultShareProps {
  title: string;
  faction: string;
  money: number;
  properties: number;
  propertyValue: number;
  achievements: string[];
  challengeLink?: string;
}

export function formatPropertyCount(count: number): string {
  return `${count} ${count === 1 ? "property" : "properties"}`;
}

function wrapLines(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

interface ImageRow {
  value: string;
  font: string;
  spacing: number;
  tone?: "copper" | "text-muted";
  artwork?: ArtworkName;
}

interface ResultExportProps {
  title: string;
  titleArtwork?: ArtworkName;
  imageRows: ImageRow[];
  summary: string;
  kind: "result" | "recap";
  filename: string;
  challengeLink?: string;
}

async function createResultImage(title: string, titleArtwork: ArtworkName | undefined, imageRows: ImageRow[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const inset = 52;
  const width = 720;
  const contentWidth = width - inset * 2;
  const styles = getComputedStyle(document.documentElement);
  const color = (name: string) => styles.getPropertyValue(`--color-${name}`).trim();
  const artworkSize = 26;
  const artworkGutter = 36;
  const text: ImageRow[] = [
    { value: "Spooky Monopoly", font: "bold 25px Georgia, serif", tone: "copper", artwork: "pumpkin", spacing: 39 },
    { value: title, font: "bold 38px Georgia, serif", artwork: titleArtwork, spacing: 49 },
    ...imageRows
  ];
  const rows = text.map(row => {
    context.font = row.font;
    const indent = row.artwork ? artworkGutter : 0;
    return { ...row, indent, lines: wrapLines(context, row.value, contentWidth - indent) };
  });
  const artwork = await Promise.all(rows.map(async row => {
    if (!row.artwork) return null;
    const image = new Image();
    image.src = artworkPath(row.artwork);
    return image.decode().then(() => image, () => null);
  }));

  canvas.width = width;
  canvas.height = inset * 2 + rows.reduce((height, row) => height + row.spacing * row.lines.length, 0);
  context.fillStyle = color("charcoal");
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = color("copper");
  context.lineWidth = 3;
  context.strokeRect(19, 19, canvas.width - 38, canvas.height - 38);
  context.textBaseline = "top";
  let y = inset;
  rows.forEach((row, index) => {
    context.font = row.font;
    context.fillStyle = color(row.tone ?? "text");
    const image = artwork[index];
    if (image) context.drawImage(image, inset, y, artworkSize, artworkSize);
    for (const line of row.lines) {
      context.fillText(line, inset + row.indent, y, contentWidth - row.indent);
      y += row.spacing;
    }
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The image could not be generated")), "image/png");
  });
}

export function ResultShare(result: ResultShareProps) {
  const title = illustratedLabel(result.title);
  const achievements = result.achievements.map(illustratedLabel);
  const imageRows: ImageRow[] = [
    { value: result.faction, font: "25px sans-serif", tone: "text-muted", spacing: 44 },
    { value: `$${result.money} cash  ·  ${formatPropertyCount(result.properties)}`, font: "bold 25px sans-serif", spacing: 35 },
    { value: `$${result.propertyValue} total property value`, font: "24px sans-serif", tone: "text-muted", spacing: 42 }
  ];
  if (result.achievements.length) {
    imageRows.push({ value: "Achievements", font: "bold 24px sans-serif", tone: "copper", spacing: 34 });
    for (const { text, artwork } of achievements) {
      imageRows.push({ value: text, artwork, font: "22px sans-serif", spacing: 33 });
    }
  }
  const summary = [
    "Spooky Monopoly",
    `${title.text} · ${result.faction}`,
    `$${result.money} cash · ${formatPropertyCount(result.properties)} · $${result.propertyValue} total property value`,
    ...achievements.map(({ text }) => `• ${text}`)
  ].join("\n");

  return <ResultExport title={title.text} titleArtwork={title.artwork} imageRows={imageRows} summary={summary} kind="result"
    filename="spooky-monopoly-result.png" challengeLink={result.challengeLink} />;
}

export function ResultExport({ title, titleArtwork, imageRows, summary, kind, filename, challengeLink }: ResultExportProps) {
  const headingId = useId();
  const label = kind === "result" ? "Result" : "Recap";
  const [status, setStatus] = useState("");
  const [showText, setShowText] = useState(false);
  const [manualText, setManualText] = useState("");
  const [downloading, setDownloading] = useState(false);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setShowText(false);
      setStatus(`${label} copied.`);
    } catch {
      setManualText(value);
      setShowText(true);
      setStatus(`Select and copy the ${label.toLowerCase()} below.`);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const url = URL.createObjectURL(await createResultImage(title, titleArtwork, imageRows));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(`${label} image ready to save.`);
    } catch {
      setStatus(`The ${kind} image could not be created. You can still copy the ${kind} text.`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="result-share" aria-labelledby={headingId}>
      <h2 id={headingId} className="end-game__section-title">{kind === "result" ? "Share your result" : "Share match recap"}</h2>
      <div className="result-share__actions">
        <button type="button" onClick={() => copy(summary, label)}>Copy {kind} text</button>
        <button type="button" onClick={download} disabled={downloading}>Download {kind} image</button>
        {challengeLink && (
          <button type="button" onClick={() => copy(new URL(challengeLink, window.location.href).href, "Challenge link")}>
            Copy challenge link
          </button>
        )}
      </div>
      {status && <p role="status">{status}</p>}
      {showText && (
        <textarea aria-label={manualText === summary ? `${label} text` : "Challenge link"} readOnly rows={5} value={manualText}
          onFocus={event => event.currentTarget.select()} />
      )}
    </section>
  );
}
