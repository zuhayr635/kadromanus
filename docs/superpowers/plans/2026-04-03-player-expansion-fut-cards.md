# Player Expansion & FUT-Style Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand player database to 500+ real players and redesign card UI to authentic FIFA Ultimate Team style with shield-shaped cards and holographic effects.

**Architecture:** Four independent phases: (1) Database expansion with 300+ real players, (2) React FutCard component rewrite with FUT shield shape, (3) OBS game-screen HTML update with card visuals, (4) Integration testing.

**Tech Stack:** TypeScript, React, Tailwind CSS, Drizzle ORM, MySQL, Wikipedia API, TheSportsDB API

**Reference Spec:** `docs/superpowers/specs/2026-04-03-player-expansion-fut-cards-design.md`

---

## Phase 1: Player Database Expansion (300+ Players)

### Task 1: Create Bronze Players Seed Script (150 players)

**Files:**
- Create: `server/seed-bronze-players-batch1.mjs`
- Reference: `server/seed-players-detailed.mjs` (pattern to follow)

- [ ] **Step 1: Create seed file structure**

Create `server/seed-bronze-players-batch1.mjs`:

```javascript
/**
 * BRONZE TIER PLAYERS (50-64 OVR)
 * Young prospects, squad players, lower-tier starters
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

const bronzePlayers = [
  // Premier League young prospects (20 players)
  { name: "Lewis Miley", team: "Newcastle", league: "Premier League", nation: "England", position: "CM", overall: 62, pace: 68, shooting: 54, passing: 66, dribbling: 70, defending: 60, physical: 58, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alfie Gilchrist", team: "Chelsea", league: "Premier League", nation: "England", position: "CB", overall: 60, pace: 66, shooting: 38, passing: 54, dribbling: 58, defending: 64, physical: 62, height: 185, weight: 78, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Amario Cozier-Duberry", team: "Arsenal", league: "Premier League", nation: "England", position: "RW", overall: 59, pace: 82, shooting: 52, passing: 56, dribbling: 68, defending: 28, physical: 52, height: 176, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Jarell Quansah", team: "Liverpool", league: "Premier League", nation: "England", position: "CB", overall: 63, pace: 68, shooting: 36, passing: 58, dribbling: 62, defending: 68, physical: 66, height: 193, weight: 85, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Fabio Carvalho", team: "Brentford", league: "Premier League", nation: "Portugal", position: "CAM", overall: 64, pace: 76, shooting: 62, passing: 68, dribbling: 74, defending: 36, physical: 58, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Lewis Hall", team: "Newcastle", league: "Premier League", nation: "England", position: "LB", overall: 62, pace: 76, shooting: 48, passing: 62, dribbling: 68, defending: 64, physical: 60, height: 183, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Joshua Acheampong", team: "Chelsea", league: "Premier League", nation: "England", position: "RB", overall: 58, pace: 78, shooting: 42, passing: 52, dribbling: 60, defending: 58, physical: 58, height: 178, weight: 70, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "James Beadle", team: "Brighton", league: "Premier League", nation: "England", position: "GK", overall: 61, diving: 62, handling: 60, kicking: 58, positioningGk: 63, reflexes: 62, pace: 44, physical: 60, height: 193, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Tyler Dibling", team: "Southampton", league: "Premier League", nation: "England", position: "RW", overall: 59, pace: 80, shooting: 54, passing: 58, dribbling: 70, defending: 32, physical: 54, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Archie Gray", team: "Tottenham", league: "Premier League", nation: "England", position: "CM", overall: 62, pace: 72, shooting: 54, passing: 66, dribbling: 68, defending: 62, physical: 64, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Callum Doyle", team: "Norwich", league: "Championship", nation: "England", position: "CB", overall: 63, pace: 70, shooting: 42, passing: 62, dribbling: 66, defending: 68, physical: 66, height: 185, weight: 78, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Liam Delap", team: "Ipswich", league: "Premier League", nation: "England", position: "ST", overall: 64, pace: 78, shooting: 68, passing: 54, dribbling: 64, defending: 32, physical: 72, height: 188, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Sam Amo-Ameyaw", team: "Southampton", league: "Premier League", nation: "England", position: "RW", overall: 58, pace: 82, shooting: 50, passing: 54, dribbling: 68, defending: 30, physical: 52, height: 175, weight: 66, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Harvey Vale", team: "Chelsea", league: "Premier League", nation: "England", position: "LW", overall: 60, pace: 74, shooting: 58, passing: 62, dribbling: 68, defending: 34, physical: 56, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Charlie Patino", team: "Arsenal", league: "Premier League", nation: "England", position: "CM", overall: 61, pace: 64, shooting: 58, passing: 68, dribbling: 70, defending: 56, physical: 58, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Carney Chukwuemeka", team: "Chelsea", league: "Premier League", nation: "England", position: "CM", overall: 64, pace: 72, shooting: 62, passing: 68, dribbling: 74, defending: 58, physical: 66, height: 185, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Luke Plange", team: "Crystal Palace", league: "Premier League", nation: "England", position: "ST", overall: 59, pace: 76, shooting: 60, passing: 50, dribbling: 62, defending: 30, physical: 64, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "James McAtee", team: "Manchester City", league: "Premier League", nation: "England", position: "CAM", overall: 64, pace: 70, shooting: 64, passing: 70, dribbling: 76, defending: 42, physical: 60, height: 175, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Rico Lewis", team: "Manchester City", league: "Premier League", nation: "England", position: "RB", overall: 64, pace: 74, shooting: 56, passing: 70, dribbling: 74, defending: 66, physical: 60, height: 169, weight: 65, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Shea Charles", team: "Southampton", league: "Premier League", nation: "Northern Ireland", position: "CDM", overall: 62, pace: 66, shooting: 52, passing: 66, dribbling: 66, defending: 68, physical: 64, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // La Liga canteranos (20 players)
  { name: "Marc Bernal", team: "Barcelona", league: "La Liga", nation: "Spain", position: "CDM", overall: 60, pace: 64, shooting: 48, passing: 64, dribbling: 66, defending: 64, physical: 60, height: 180, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Mika Faye", team: "Rennes", league: "Ligue 1", nation: "Senegal", position: "CB", overall: 62, pace: 72, shooting: 38, passing: 56, dribbling: 60, defending: 66, physical: 68, height: 189, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Ander Barrenetxea", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "LW", overall: 64, pace: 84, shooting: 62, passing: 64, dribbling: 76, defending: 34, physical: 60, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Pablo Torre", team: "Girona", league: "La Liga", nation: "Spain", position: "CAM", overall: 63, pace: 68, shooting: 62, passing: 70, dribbling: 74, defending: 40, physical: 58, height: 176, weight: 66, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Arnau Tenas", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Spain", position: "GK", overall: 62, diving: 63, handling: 61, kicking: 64, positioningGk: 64, reflexes: 62, pace: 46, physical: 60, height: 186, weight: 78, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Gabri Veiga", team: "Al-Ahli", league: "Saudi Pro League", nation: "Spain", position: "CM", overall: 64, pace: 72, shooting: 68, passing: 70, dribbling: 76, defending: 54, physical: 66, height: 182, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Sergio Gómez", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "LB", overall: 63, pace: 78, shooting: 58, passing: 70, dribbling: 74, defending: 66, physical: 62, height: 170, weight: 64, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Carlos Fernández", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "ST", overall: 62, pace: 70, shooting: 68, passing: 62, dribbling: 66, defending: 32, physical: 68, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Diego Rico", team: "Getafe", league: "La Liga", nation: "Spain", position: "LB", overall: 64, pace: 74, shooting: 54, passing: 68, dribbling: 70, defending: 70, physical: 66, height: 179, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Gonzalo Villar", team: "Getafe", league: "La Liga", nation: "Spain", position: "CM", overall: 63, pace: 66, shooting: 60, passing: 70, dribbling: 68, defending: 68, physical: 70, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Óscar Rodríguez", team: "Getafe", league: "La Liga", nation: "Spain", position: "CAM", overall: 64, pace: 68, shooting: 70, passing: 74, dribbling: 72, defending: 46, physical: 64, height: 173, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Choco Lozano", team: "Cádiz", league: "La Liga", nation: "Honduras", position: "ST", overall: 61, pace: 76, shooting: 64, passing: 56, dribbling: 64, defending: 32, physical: 66, height: 175, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Iván Azón", team: "Zaragoza", league: "Segunda División", nation: "Spain", position: "ST", overall: 60, pace: 72, shooting: 64, passing: 54, dribbling: 62, defending: 30, physical: 68, height: 184, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Manu Morlanes", team: "Mallorca", league: "La Liga", nation: "Spain", position: "CDM", overall: 63, pace: 64, shooting: 54, passing: 68, dribbling: 68, defending: 70, physical: 68, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Raúl García", team: "Osasuna", league: "La Liga", nation: "Spain", position: "CM", overall: 59, pace: 58, shooting: 62, passing: 64, dribbling: 62, defending: 58, physical: 74, height: 182, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Kike García", team: "Alavés", league: "La Liga", nation: "Spain", position: "ST", overall: 62, pace: 68, shooting: 68, passing: 58, dribbling: 62, defending: 34, physical: 74, height: 183, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Kike Saverio", team: "Alavés", league: "La Liga", nation: "Spain", position: "ST", overall: 60, pace: 70, shooting: 64, passing: 54, dribbling: 60, defending: 30, physical: 70, height: 181, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Rubén Alcaraz", team: "Cádiz", league: "La Liga", nation: "Spain", position: "CDM", overall: 64, pace: 62, shooting: 58, passing: 70, dribbling: 66, defending: 72, physical: 72, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Fali", team: "Cádiz", league: "La Liga", nation: "Spain", position: "CB", overall: 63, pace: 64, shooting: 38, passing: 58, dribbling: 58, defending: 72, physical: 74, height: 187, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Javi Hernández", team: "Cádiz", league: "La Liga", nation: "Spain", position: "LB", overall: 62, pace: 72, shooting: 52, passing: 64, dribbling: 66, defending: 68, physical: 66, height: 174, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },

  // Bundesliga (20 players)
  { name: "Frans Krätzig", team: "VfB Stuttgart", league: "Bundesliga", nation: "Germany", position: "LB", overall: 61, pace: 74, shooting: 48, passing: 62, dribbling: 66, defending: 64, physical: 60, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Jamie Leweling", team: "VfB Stuttgart", league: "Bundesliga", nation: "Germany", position: "RW", overall: 64, pace: 84, shooting: 66, passing: 64, dribbling: 72, defending: 36, physical: 64, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Rocco Reitz", team: "Borussia Mönchengladbach", league: "Bundesliga", nation: "Germany", position: "CDM", overall: 63, pace: 66, shooting: 58, passing: 68, dribbling: 66, defending: 70, physical: 70, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Luca Netz", team: "Borussia Mönchengladbach", league: "Bundesliga", nation: "Germany", position: "LB", overall: 62, pace: 78, shooting: 52, passing: 62, dribbling: 68, defending: 64, physical: 62, height: 181, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Brajan Gruda", team: "Brighton", league: "Premier League", nation: "Germany", position: "RW", overall: 63, pace: 82, shooting: 62, passing: 64, dribbling: 74, defending: 32, physical: 58, height: 176, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Anrie Chase", team: "Brighton", league: "Premier League", nation: "England", position: "CB", overall: 60, pace: 68, shooting: 36, passing: 56, dribbling: 58, defending: 64, physical: 64, height: 188, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Youssoufa Moukoko", team: "Nice", league: "Ligue 1", nation: "Germany", position: "ST", overall: 64, pace: 78, shooting: 68, passing: 58, dribbling: 70, defending: 30, physical: 62, height: 180, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Finn Ole Becker", team: "St. Pauli", league: "Bundesliga", nation: "Germany", position: "CM", overall: 61, pace: 66, shooting: 58, passing: 68, dribbling: 70, defending: 60, physical: 62, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Eric Smith", team: "St. Pauli", league: "Bundesliga", nation: "Sweden", position: "CDM", overall: 62, pace: 64, shooting: 54, passing: 68, dribbling: 66, defending: 70, physical: 68, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Jackson Irvine", team: "St. Pauli", league: "Bundesliga", nation: "Australia", position: "CM", overall: 63, pace: 64, shooting: 62, passing: 66, dribbling: 64, defending: 68, physical: 74, height: 184, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Umut Tohumcu", team: "Hoffenheim", league: "Bundesliga", nation: "Turkey", position: "CM", overall: 64, pace: 72, shooting: 62, passing: 70, dribbling: 72, defending: 64, physical: 66, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Maximilian Beier", team: "Hoffenheim", league: "Bundesliga", nation: "Germany", position: "ST", overall: 64, pace: 80, shooting: 68, passing: 60, dribbling: 68, defending: 32, physical: 66, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Marius Bülter", team: "Hoffenheim", league: "Bundesliga", nation: "Germany", position: "LW", overall: 63, pace: 82, shooting: 64, passing: 62, dribbling: 70, defending: 36, physical: 64, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Robert Skov", team: "Hoffenheim", league: "Bundesliga", nation: "Denmark", position: "RW", overall: 64, pace: 78, shooting: 68, passing: 66, dribbling: 70, defending: 40, physical: 66, height: 182, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Dennis Geiger", team: "Hoffenheim", league: "Bundesliga", nation: "Germany", position: "CM", overall: 62, pace: 64, shooting: 58, passing: 68, dribbling: 68, defending: 62, physical: 64, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Mërgim Berisha", team: "Hoffenheim", league: "Bundesliga", nation: "Germany", position: "ST", overall: 63, pace: 76, shooting: 66, passing: 58, dribbling: 66, defending: 30, physical: 66, height: 178, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lovro Majer", team: "Wolfsburg", league: "Bundesliga", nation: "Croatia", position: "CAM", overall: 64, pace: 70, shooting: 66, passing: 72, dribbling: 74, defending: 44, physical: 62, height: 180, weight: 70, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Patrick Wimmer", team: "Wolfsburg", league: "Bundesliga", nation: "Austria", position: "RW", overall: 63, pace: 80, shooting: 64, passing: 64, dribbling: 72, defending: 38, physical: 62, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Maximilian Arnold", team: "Wolfsburg", league: "Bundesliga", nation: "Germany", position: "CDM", overall: 64, pace: 62, shooting: 64, passing: 74, dribbling: 68, defending: 72, physical: 70, height: 180, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  { name: "Joakim Mæhle", team: "Wolfsburg", league: "Bundesliga", nation: "Denmark", position: "LB", overall: 64, pace: 80, shooting: 60, passing: 68, dribbling: 72, defending: 68, physical: 68, height: 185, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // Serie A (20 players)
  { name: "Giorgio Scalvini", team: "Atalanta", league: "Serie A", nation: "Italy", position: "CB", overall: 64, pace: 72, shooting: 48, passing: 64, dribbling: 68, defending: 72, physical: 70, height: 191, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Charles De Ketelaere", team: "Atalanta", league: "Serie A", nation: "Belgium", position: "CAM", overall: 64, pace: 76, shooting: 66, passing: 70, dribbling: 76, defending: 40, physical: 64, height: 192, weight: 80, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Matteo Ruggeri", team: "Atalanta", league: "Serie A", nation: "Italy", position: "LB", overall: 63, pace: 76, shooting: 54, passing: 66, dribbling: 68, defending: 68, physical: 64, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Sead Kolašinac", team: "Atalanta", league: "Serie A", nation: "Bosnia", position: "LB", overall: 62, pace: 68, shooting: 48, passing: 62, dribbling: 62, defending: 72, physical: 78, height: 183, weight: 85, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },
  { name: "Warren Bondo", team: "Monza", league: "Serie A", nation: "France", position: "CDM", overall: 63, pace: 70, shooting: 58, passing: 66, dribbling: 68, defending: 70, physical: 70, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Andrea Colpani", team: "Fiorentina", league: "Serie A", nation: "Italy", position: "CAM", overall: 64, pace: 72, shooting: 66, passing: 72, dribbling: 74, defending: 42, physical: 64, height: 180, weight: 72, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Danilo D'Ambrosio", team: "Monza", league: "Serie A", nation: "Italy", position: "CB", overall: 61, pace: 62, shooting: 48, passing: 62, dribbling: 60, defending: 72, physical: 74, height: 180, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Daniel Maldini", team: "Monza", league: "Serie A", nation: "Italy", position: "CAM", overall: 63, pace: 70, shooting: 64, passing: 70, dribbling: 74, defending: 40, physical: 62, height: 183, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Mattia Zaccagni", team: "Lazio", league: "Serie A", nation: "Italy", position: "LW", overall: 64, pace: 80, shooting: 68, passing: 70, dribbling: 76, defending: 38, physical: 66, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Niccolò Pisilli", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 60, pace: 68, shooting: 58, passing: 64, dribbling: 66, defending: 60, physical: 62, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Enzo Le Fée", team: "Roma", league: "Serie A", nation: "France", position: "CM", overall: 64, pace: 68, shooting: 62, passing: 72, dribbling: 74, defending: 62, physical: 64, height: 178, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Matías Soulé", team: "Roma", league: "Serie A", nation: "Argentina", position: "RW", overall: 64, pace: 80, shooting: 66, passing: 66, dribbling: 76, defending: 34, physical: 60, height: 175, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Alexis Saelemaekers", team: "Roma", league: "Serie A", nation: "Belgium", position: "RW", overall: 64, pace: 82, shooting: 64, passing: 68, dribbling: 74, defending: 56, physical: 66, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Samuel Gigot", team: "Lazio", league: "Serie A", nation: "France", position: "CB", overall: 63, pace: 66, shooting: 42, passing: 58, dribbling: 60, defending: 72, physical: 76, height: 186, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Valentín Castellanos", team: "Lazio", league: "Serie A", nation: "Argentina", position: "ST", overall: 64, pace: 78, shooting: 70, passing: 62, dribbling: 68, defending: 32, physical: 72, height: 182, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Boulaye Dia", team: "Lazio", league: "Serie A", nation: "Senegal", position: "ST", overall: 63, pace: 80, shooting: 68, passing: 60, dribbling: 68, defending: 32, physical: 68, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Mateo Retegui", team: "Atalanta", league: "Serie A", nation: "Italy", position: "ST", overall: 64, pace: 76, shooting: 70, passing: 60, dribbling: 66, defending: 32, physical: 72, height: 185, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Sebastiano Esposito", team: "Empoli", league: "Serie A", nation: "Italy", position: "ST", overall: 63, pace: 74, shooting: 68, passing: 58, dribbling: 68, defending: 30, physical: 66, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Nicolò Rovella", team: "Lazio", league: "Serie A", nation: "Italy", position: "CDM", overall: 64, pace: 68, shooting: 58, passing: 70, dribbling: 70, defending: 72, physical: 68, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Davide Frattesi", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CM", overall: 64, pace: 72, shooting: 68, passing: 68, dribbling: 72, defending: 66, physical: 70, height: 176, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // Ligue 1 (20 players)
  { name: "Hugo Ekitike", team: "Frankfurt", league: "Bundesliga", nation: "France", position: "ST", overall: 64, pace: 82, shooting: 68, passing: 60, dribbling: 70, defending: 30, physical: 66, height: 189, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Maghnes Akliouche", team: "Monaco", league: "Ligue 1", nation: "France", position: "RW", overall: 64, pace: 82, shooting: 64, passing: 66, dribbling: 76, defending: 36, physical: 60, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Eliesse Ben Seghir", team: "Monaco", league: "Ligue 1", nation: "Morocco", position: "LW", overall: 63, pace: 80, shooting: 62, passing: 64, dribbling: 74, defending: 34, physical: 58, height: 172, weight: 64, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Wilfried Singo", team: "Monaco", league: "Ligue 1", nation: "Ivory Coast", position: "RB", overall: 64, pace: 88, shooting: 58, passing: 64, dribbling: 70, defending: 66, physical: 70, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Soungoutou Magassa", team: "Monaco", league: "Ligue 1", nation: "Mali", position: "CDM", overall: 62, pace: 70, shooting: 54, passing: 64, dribbling: 64, defending: 68, physical: 70, height: 186, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Rayan Cherki", team: "Lyon", league: "Ligue 1", nation: "France", position: "CAM", overall: 64, pace: 74, shooting: 64, passing: 72, dribbling: 80, defending: 38, physical: 60, height: 180, weight: 70, preferredFoot: "left", weakFoot: 4, skillMoves: 5 },
  { name: "Saël Kumbedi", team: "Lyon", league: "Ligue 1", nation: "France", position: "RB", overall: 62, pace: 80, shooting: 50, passing: 60, dribbling: 68, defending: 64, physical: 62, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Saïd Benrahma", team: "Lyon", league: "Ligue 1", nation: "Algeria", position: "LW", overall: 64, pace: 80, shooting: 70, passing: 72, dribbling: 80, defending: 36, physical: 62, height: 173, weight: 67, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Corentin Tolisso", team: "Lyon", league: "Ligue 1", nation: "France", position: "CM", overall: 63, pace: 68, shooting: 66, passing: 72, dribbling: 72, defending: 68, physical: 72, height: 181, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Jordan Veretout", team: "Marseille", league: "Ligue 1", nation: "France", position: "CM", overall: 64, pace: 68, shooting: 66, passing: 74, dribbling: 72, defending: 70, physical: 72, height: 177, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Jonathan Clauss", team: "Marseille", league: "Ligue 1", nation: "France", position: "RB", overall: 64, pace: 82, shooting: 62, passing: 72, dribbling: 72, defending: 68, physical: 68, height: 176, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Azzedine Ounahi", team: "Marseille", league: "Ligue 1", nation: "Morocco", position: "CM", overall: 63, pace: 72, shooting: 60, passing: 68, dribbling: 72, defending: 66, physical: 66, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Faris Moumbagna", team: "Marseille", league: "Ligue 1", nation: "Cameroon", position: "ST", overall: 62, pace: 76, shooting: 66, passing: 56, dribbling: 64, defending: 30, physical: 70, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Bamo Meïté", team: "Marseille", league: "Ligue 1", nation: "Ivory Coast", position: "CB", overall: 63, pace: 70, shooting: 40, passing: 58, dribbling: 60, defending: 70, physical: 72, height: 188, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Aïssa Mandi", team: "Lille", league: "Ligue 1", nation: "Algeria", position: "CB", overall: 64, pace: 70, shooting: 42, passing: 62, dribbling: 64, defending: 74, physical: 74, height: 184, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Tiago Santos", team: "Lille", league: "Ligue 1", nation: "Portugal", position: "RB", overall: 63, pace: 80, shooting: 56, passing: 64, dribbling: 70, defending: 68, physical: 66, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Benjamin André", team: "Lille", league: "Ligue 1", nation: "France", position: "CDM", overall: 64, pace: 64, shooting: 58, passing: 70, dribbling: 68, defending: 74, physical: 74, height: 180, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Rémy Cabella", team: "Lille", league: "Ligue 1", nation: "France", position: "CAM", overall: 63, pace: 70, shooting: 66, passing: 74, dribbling: 76, defending: 42, physical: 64, height: 172, weight: 66, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Edon Zhegrova", team: "Lille", league: "Ligue 1", nation: "Kosovo", position: "RW", overall: 64, pace: 84, shooting: 68, passing: 66, dribbling: 78, defending: 36, physical: 62, height: 175, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Alexsandro Ribeiro", team: "Lille", league: "Ligue 1", nation: "Brazil", position: "CB", overall: 63, pace: 68, shooting: 40, passing: 62, dribbling: 62, defending: 72, physical: 72, height: 186, weight: 82, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },

  // Turkish Super League (20 players)
  { name: "Emre Mor", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "RW", overall: 64, pace: 86, shooting: 64, passing: 66, dribbling: 80, defending: 32, physical: 60, height: 169, weight: 65, preferredFoot: "left", weakFoot: 3, skillMoves: 5 },
  { name: "Mert Müldür", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "RB", overall: 64, pace: 78, shooting: 56, passing: 66, dribbling: 68, defending: 72, physical: 68, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Taylan Antalyalı", team: "Beşiktaş", league: "Süper Lig", nation: "Turkey", position: "CDM", overall: 63, pace: 64, shooting: 58, passing: 70, dribbling: 68, defending: 72, physical: 70, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Onur Bulut", team: "Beşiktaş", league: "Süper Lig", nation: "Austria", position: "RB", overall: 63, pace: 76, shooting: 56, passing: 64, dribbling: 66, defending: 70, physical: 68, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Milot Rashica", team: "Beşiktaş", league: "Süper Lig", nation: "Kosovo", position: "LW", overall: 64, pace: 84, shooting: 68, passing: 66, dribbling: 74, defending: 34, physical: 62, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Gabriel Sara", team: "Galatasaray", league: "Süper Lig", nation: "Brazil", position: "CM", overall: 64, pace: 70, shooting: 66, passing: 72, dribbling: 74, defending: 60, physical: 66, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Berkan Kutlu", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "CDM", overall: 63, pace: 66, shooting: 56, passing: 68, dribbling: 66, defending: 70, physical: 68, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Hakim Ziyech", team: "Galatasaray", league: "Süper Lig", nation: "Morocco", position: "RW", overall: 64, pace: 76, shooting: 72, passing: 76, dribbling: 80, defending: 36, physical: 62, height: 180, weight: 66, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Abdülkerim Bardakcı", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 64, pace: 66, shooting: 38, passing: 60, dribbling: 60, defending: 74, physical: 76, height: 191, weight: 88, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Eyüp Aydın", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "LW", overall: 62, pace: 80, shooting: 62, passing: 60, dribbling: 70, defending: 32, physical: 60, height: 176, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Poyraz Yıldırım", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "ST", overall: 61, pace: 74, shooting: 64, passing: 54, dribbling: 62, defending: 30, physical: 66, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Stefano Denswil", team: "Trabzonspor", league: "Süper Lig", nation: "Netherlands", position: "CB", overall: 63, pace: 68, shooting: 40, passing: 60, dribbling: 62, defending: 72, physical: 74, height: 183, weight: 80, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Enis Destan", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "ST", overall: 62, pace: 76, shooting: 66, passing: 56, dribbling: 64, defending: 30, physical: 68, height: 185, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Edin Višća", team: "Trabzonspor", league: "Süper Lig", nation: "Bosnia", position: "RW", overall: 64, pace: 78, shooting: 70, passing: 72, dribbling: 74, defending: 38, physical: 66, height: 178, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Dimitris Pelkas", team: "AEK Athens", league: "Super League", nation: "Greece", position: "CAM", overall: 64, pace: 72, shooting: 68, passing: 72, dribbling: 76, defending: 42, physical: 64, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Michy Batshuayi", team: "Fenerbahçe", league: "Süper Lig", nation: "Belgium", position: "ST", overall: 64, pace: 78, shooting: 74, passing: 60, dribbling: 68, defending: 32, physical: 72, height: 184, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Youssef En-Nesyri", team: "Fenerbahçe", league: "Süper Lig", nation: "Morocco", position: "ST", overall: 64, pace: 80, shooting: 74, passing: 58, dribbling: 66, defending: 32, physical: 76, height: 189, weight: 82, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Filip Kostić", team: "Fenerbahçe", league: "Süper Lig", nation: "Serbia", position: "LW", overall: 64, pace: 82, shooting: 66, passing: 74, dribbling: 76, defending: 52, physical: 68, height: 184, weight: 80, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Alexander Djiku", team: "Fenerbahçe", league: "Süper Lig", nation: "Ghana", position: "CB", overall: 64, pace: 72, shooting: 42, passing: 62, dribbling: 64, defending: 76, physical: 78, height: 188, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Çağlar Söyüncü", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 64, pace: 70, shooting: 40, passing: 60, dribbling: 62, defending: 76, physical: 76, height: 187, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // Eredivisie & Liga Portugal (30 players)
  { name: "Orkun Kökçü", team: "Benfica", league: "Liga Portugal", nation: "Turkey", position: "CM", overall: 64, pace: 70, shooting: 68, passing: 76, dribbling: 74, defending: 68, physical: 68, height: 182, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Fredrik Aursnes", team: "Benfica", league: "Liga Portugal", nation: "Norway", position: "CM", overall: 64, pace: 68, shooting: 62, passing: 72, dribbling: 70, defending: 70, physical: 70, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Florentino Luís", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CDM", overall: 63, pace: 66, shooting: 54, passing: 68, dribbling: 66, defending: 72, physical: 72, height: 183, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Arthur Cabral", team: "Benfica", league: "Liga Portugal", nation: "Brazil", position: "ST", overall: 64, pace: 74, shooting: 72, passing: 60, dribbling: 66, defending: 32, physical: 72, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Pavlidis", team: "Benfica", league: "Liga Portugal", nation: "Greece", position: "ST", overall: 64, pace: 76, shooting: 72, passing: 62, dribbling: 68, defending: 32, physical: 70, height: 185, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Tomás Araújo", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CB", overall: 63, pace: 72, shooting: 38, passing: 60, dribbling: 62, defending: 70, physical: 72, height: 188, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Pedro Gonçalves", team: "Sporting CP", league: "Liga Portugal", nation: "Portugal", position: "CAM", overall: 64, pace: 76, shooting: 74, passing: 74, dribbling: 78, defending: 42, physical: 64, height: 176, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Morten Hjulmand", team: "Sporting CP", league: "Liga Portugal", nation: "Denmark", position: "CDM", overall: 64, pace: 68, shooting: 60, passing: 72, dribbling: 70, defending: 74, physical: 72, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Conrad Harder", team: "Sporting CP", league: "Liga Portugal", nation: "Denmark", position: "RW", overall: 62, pace: 82, shooting: 60, passing: 60, dribbling: 70, defending: 32, physical: 58, height: 176, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Daniel Bragança", team: "Sporting CP", league: "Liga Portugal", nation: "Portugal", position: "CM", overall: 63, pace: 68, shooting: 58, passing: 70, dribbling: 70, defending: 68, physical: 66, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Gonçalo Inácio", team: "Sporting CP", league: "Liga Portugal", nation: "Portugal", position: "CB", overall: 64, pace: 72, shooting: 40, passing: 64, dribbling: 66, defending: 74, physical: 72, height: 185, weight: 78, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Samuel Lino", team: "Atletico Madrid", league: "La Liga", nation: "Brazil", position: "LW", overall: 64, pace: 84, shooting: 66, passing: 66, dribbling: 76, defending: 42, physical: 64, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Pepê", team: "Porto", league: "Liga Portugal", nation: "Brazil", position: "RW", overall: 64, pace: 82, shooting: 66, passing: 66, dribbling: 76, defending: 38, physical: 64, height: 176, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Galeno", team: "Porto", league: "Liga Portugal", nation: "Brazil", position: "LW", overall: 64, pace: 84, shooting: 70, passing: 68, dribbling: 78, defending: 36, physical: 66, height: 177, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Nico González", team: "Porto", league: "Liga Portugal", nation: "Spain", position: "CDM", overall: 64, pace: 66, shooting: 58, passing: 72, dribbling: 68, defending: 74, physical: 72, height: 184, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alan Varela", team: "Porto", league: "Liga Portugal", nation: "Argentina", position: "CDM", overall: 64, pace: 66, shooting: 56, passing: 72, dribbling: 68, defending: 74, physical: 70, height: 176, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Samu Omorodion", team: "Porto", league: "Liga Portugal", nation: "Spain", position: "ST", overall: 64, pace: 78, shooting: 70, passing: 54, dribbling: 64, defending: 30, physical: 76, height: 193, weight: 88, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Denzel Dumfries", team: "Inter Milan", league: "Serie A", nation: "Netherlands", position: "RB", overall: 64, pace: 82, shooting: 64, passing: 66, dribbling: 70, defending: 72, physical: 76, height: 188, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Steven Bergwijn", team: "Al-Ittihad", league: "Saudi Pro League", nation: "Netherlands", position: "LW", overall: 64, pace: 88, shooting: 70, passing: 68, dribbling: 80, defending: 36, physical: 64, height: 178, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Quilindschy Hartman", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "LB", overall: 63, pace: 78, shooting: 52, passing: 64, dribbling: 68, defending: 68, physical: 66, height: 175, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Santiago Giménez", team: "Feyenoord", league: "Eredivisie", nation: "Mexico", position: "ST", overall: 64, pace: 78, shooting: 74, passing: 60, dribbling: 68, defending: 32, physical: 70, height: 183, weight: 78, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Quinten Timber", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 64, pace: 72, shooting: 62, passing: 72, dribbling: 74, defending: 66, physical: 68, height: 179, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ramiz Zerrouki", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "CDM", overall: 63, pace: 64, shooting: 58, passing: 70, dribbling: 68, defending: 72, physical: 70, height: 183, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Calvin Stengs", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "RW", overall: 64, pace: 78, shooting: 70, passing: 72, dribbling: 78, defending: 38, physical: 64, height: 180, weight: 72, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Chuba Akpom", team: "Ajax", league: "Eredivisie", nation: "England", position: "ST", overall: 64, pace: 78, shooting: 72, passing: 62, dribbling: 70, defending: 32, physical: 72, height: 180, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Kian Fitz-Jim", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 62, pace: 70, shooting: 60, passing: 68, dribbling: 72, defending: 60, physical: 62, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Jorrel Hato", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CB", overall: 63, pace: 74, shooting: 40, passing: 62, dribbling: 68, defending: 70, physical: 68, height: 189, weight: 82, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Kenneth Taylor", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 64, pace: 70, shooting: 64, passing: 72, dribbling: 74, defending: 62, physical: 66, height: 185, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 3 },
  { name: "Branco van den Boomen", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 63, pace: 62, shooting: 64, passing: 76, dribbling: 72, defending: 60, physical: 64, height: 179, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Jorthy Mokio", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "RB", overall: 61, pace: 78, shooting: 48, passing: 58, dribbling: 64, defending: 62, physical: 60, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
];

async function seedBronzePlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    const enriched = bronzePlayers.map(p => ({
      ...p,
      cardQuality: getCardQuality(p.overall),
    }));

    console.log(`⚽ Importing ${enriched.length} BRONZE players...`);

    const batchSize = 50;
    for (let i = 0; i < enriched.length; i += batchSize) {
      const batch = enriched.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`  ${Math.min(i + batchSize, enriched.length)}/${enriched.length} inserted`);
    }

    console.log(`\n✅ Bronze players import complete!`);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedBronzePlayers();
```

- [ ] **Step 2: Run seed script**

Run:
```bash
cd C:\Users\Luana\Downloads\MultiCihanekspress\kadromanus
npx tsx server/seed-bronze-players-batch1.mjs
```

Expected output:
```
⚽ Importing 150 BRONZE players...
  50/150 inserted
  100/150 inserted
  150/150 inserted
✅ Bronze players import complete!
```

- [ ] **Step 3: Verify bronze players in database**

Run verification:
```bash
npx tsx -e "
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { players } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(conn);
  const [stats] = await conn.query('SELECT cardQuality, COUNT(*) as count FROM players GROUP BY cardQuality');
  console.table(stats);
  await conn.end();
}
check();
"
```

Expected: Bronze count should be ~150-180 (old + new)

- [ ] **Step 4: Commit bronze players seed**

```bash
git add server/seed-bronze-players-batch1.mjs
git commit -m "feat: add 150 bronze tier players seed script

Adds young prospects, squad players, and lower-tier starters
from Premier League, La Liga, Bundesliga, Serie A, Ligue 1,
Turkish Super League, Eredivisie, and Liga Portugal.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create Silver Players Seed Script (150 players)

[TRUNCATED - Plan continues with same pattern for Silver, Gold, Elite, then photo fetching, then React component rewrite, then OBS HTML update]

Would you like me to:
1. Continue writing the complete plan (it will be ~3000 lines with all tasks)
2. Generate a condensed version with key tasks only
3. Start the implementation directly using subagent-driven-development?
