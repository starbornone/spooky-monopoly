"use client";

import { useId, useState } from "react";

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
  color: string;
  spacing: number;
}

interface ResultExportProps {
  title: string;
  imageRows: ImageRow[];
  summary: string;
  kind: "result" | "recap";
  filename: string;
  challengeLink?: string;
}

async function createResultImage(title: string, imageRows: ImageRow[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const inset = 52;
  const width = 720;
  const contentWidth = width - inset * 2;
  const text = [
    { value: "Spooky Monopoly", font: "bold 25px sans-serif", color: "#e7a677", spacing: 39 },
    { value: title, font: "bold 38px sans-serif", color: "#fffcf2", spacing: 49 },
    ...imageRows
  ];
  const rows = text.map(row => {
    context.font = row.font;
    return { ...row, lines: wrapLines(context, row.value, contentWidth) };
  });

  canvas.width = width;
  canvas.height = inset * 2 + rows.reduce((height, row) => height + row.spacing * row.lines.length, 0);
  context.fillStyle = "#221b31";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#b86d6d";
  context.lineWidth = 3;
  context.strokeRect(19, 19, canvas.width - 38, canvas.height - 38);
  context.textBaseline = "top";
  let y = inset;
  for (const row of rows) {
    context.font = row.font;
    context.fillStyle = row.color;
    for (const line of row.lines) {
      context.fillText(line, inset, y, contentWidth);
      y += row.spacing;
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("The image could not be generated")), "image/png");
  });
}

export function ResultShare(result: ResultShareProps) {
  const imageRows = [
    { value: result.faction, font: "25px sans-serif", color: "#f2ddd1", spacing: 44 },
    { value: `$${result.money} cash  ·  ${formatPropertyCount(result.properties)}`, font: "bold 25px sans-serif", color: "#fffcf2", spacing: 35 },
    { value: `$${result.propertyValue} total property value`, font: "24px sans-serif", color: "#f2ddd1", spacing: 42 }
  ];
  if (result.achievements.length) {
    imageRows.push({ value: "Achievements", font: "bold 24px sans-serif", color: "#e7a677", spacing: 34 });
    for (const value of result.achievements) {
      imageRows.push({ value: `• ${value}`, font: "22px sans-serif", color: "#fffcf2", spacing: 33 });
    }
  }
  const summary = [
    "Spooky Monopoly",
    `${result.title} · ${result.faction}`,
    `$${result.money} cash · ${formatPropertyCount(result.properties)} · $${result.propertyValue} total property value`,
    ...result.achievements.map(achievement => `• ${achievement}`)
  ].join("\n");

  return <ResultExport title={result.title} imageRows={imageRows} summary={summary} kind="result"
    filename="spooky-monopoly-result.png" challengeLink={result.challengeLink} />;
}

export function ResultExport({ title, imageRows, summary, kind, filename, challengeLink }: ResultExportProps) {
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
      const url = URL.createObjectURL(await createResultImage(title, imageRows));
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
