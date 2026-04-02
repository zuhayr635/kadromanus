import { describe, it, expect } from "vitest";
import { generateResultsHTML } from "./screenshot-service";

const sampleGameData = {
  sessionId: "test-session-01",
  tiktokUsername: "testuser",
  finalScores: [
    { teamName: "Fenerbahce", score: 100, players: 11 },
    { teamName: "Galatasaray", score: 85, players: 10 },
    { teamName: "Besiktas", score: 70, players: 9 },
    { teamName: "Trabzonspor", score: 60, players: 8 },
  ],
  statistics: {
    totalCardsOpened: 38,
    totalParticipants: 124,
    durationSeconds: 1845,
  },
};

describe("generateResultsHTML", () => {
  it("returns a valid HTML string", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
  });

  it("includes tiktok username", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("testuser");
  });

  it("includes all team names sorted by score descending", () => {
    const html = generateResultsHTML(sampleGameData);
    const fenIdx = html.indexOf("Fenerbahce");
    const galIdx = html.indexOf("Galatasaray");
    expect(fenIdx).toBeLessThan(galIdx); // higher score appears first
  });

  it("includes team scores", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("100");
    expect(html).toContain("85");
  });

  it("formats duration as mm:ss", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("30:45"); // 1845 seconds = 30m 45s
  });

  it("includes stats", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).toContain("38"); // totalCardsOpened
    expect(html).toContain("124"); // totalParticipants
  });

  it("contains no external resource URLs", () => {
    const html = generateResultsHTML(sampleGameData);
    expect(html).not.toMatch(/src=["']https?:\/\//);
    expect(html).not.toMatch(/href=["']https?:\/\//);
  });
});
