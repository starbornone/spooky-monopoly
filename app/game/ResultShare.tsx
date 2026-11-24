"use client";

import { useState } from "react";

import "./ResultShare.css";

interface ResultShareProps {
  title: string;
  faction: string;
  money: number;
  properties: number;
  propertyValue: number;
  achievements: string[];
}

function formatPropertyCount(count: number): string {
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

async function createResultImage(result: ResultShareProps): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const inset = 52;
  const width = 720;
  const contentWidth = width - inset * 2;
  const text = [
    { value: "Spooky Monopoly", font: "bold 25px sans-serif", color: "#e7a677", spacing: 39 },
    { value: result.title, font: "bold 38px sans-serif", color: "#fffcf2", spacing: 49 },
    { value: result.faction, font: "25px sans-serif", color: "#f2ddd1", spacing: 44 },
    { value: `$${result.money} cash  ·  ${formatPropertyCount(result.properties)}`, font: "bold 25px sans-serif", color: "#fffcf2", spacing: 35 },
    { value: `$${result.propertyValue} total property value`, font: "24px sans-serif", color: "#f2ddd1", spacing: 42 }
  ];
  if (result.achievements.length) {
    text.push({ value: "Achievements", font: "bold 24px sans-serif", color: "#e7a677", spacing: 34 });
    for (const value of result.achievements) {
      text.push({ value: `• ${value}`, font: "22px sans-serif", color: "#fffcf2", spacing: 33 });
    }
  }
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
  const [status, setStatus] = useState("");
  const [showText, setShowText] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const summary = [
    "Spooky Monopoly",
    `${result.title} · ${result.faction}`,
    `$${result.money} cash · ${formatPropertyCount(result.properties)} · $${result.propertyValue} total property value`,
    ...result.achievements.map(achievement => `• ${achievement}`)
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setShowText(false);
      setStatus("Result copied.");
    } catch {
      setShowText(true);
      setStatus("Select and copy the result text below.");
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const url = URL.createObjectURL(await createResultImage(result));
      const link = document.createElement("a");
      link.href = url;
      link.download = "spooky-monopoly-result.png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Result image ready to save.");
    } catch {
      setStatus("The result image could not be created. You can still copy the result text.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="result-share" aria-labelledby="result-share-title">
      <h2 id="result-share-title" className="end-game__section-title">Share your result</h2>
      <div className="result-share__actions">
        <button type="button" onClick={copy}>Copy result text</button>
        <button type="button" onClick={download} disabled={downloading}>Download result image</button>
      </div>
      {status && <p role="status">{status}</p>}
      {showText && (
        <textarea aria-label="Result text" readOnly rows={5} value={summary}
          onFocus={event => event.currentTarget.select()} />
      )}
    </section>
  );
}
