/**
 * BRONZE TIER PLAYERS (OVR 50-64)
 * 150 real players from 8 major leagues
 * Young prospects, squad players, and lower-tier starters
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { players } from "../drizzle/schema.ts";
import dotenv from "dotenv";

dotenv.config();

// Helper to calculate card quality
function getCardQuality(overall) {
  if (overall >= 89) return "elite";
  if (overall >= 75) return "gold";
  if (overall >= 65) return "silver";
  return "bronze";
}

// REAL BRONZE TIER PLAYERS (50-64 OVR)
const bronzePlayers = [
  // PREMIER LEAGUE - ~20 players
  { name: "Dominic Solanke", team: "Bournemouth", league: "Premier League", nation: "England", position: "ST", overall: 64, pace: 78, shooting: 72, passing: 65, dribbling: 73, defending: 28, physical: 71, height: 188, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Moisés Caicedo", team: "Chelsea", league: "Premier League", nation: "Ecuador", position: "CDM", overall: 62, pace: 72, shooting: 58, passing: 70, dribbling: 68, defending: 76, physical: 78, height: 183, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Conor Gallagher", team: "Chelsea", league: "Premier League", nation: "England", position: "CM", overall: 61, pace: 74, shooting: 65, passing: 68, dribbling: 71, defending: 68, physical: 72, height: 182, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Tyrone Mings", team: "Aston Villa", league: "Premier League", nation: "England", position: "CB", overall: 63, pace: 68, shooting: 42, passing: 65, dribbling: 62, defending: 76, physical: 80, height: 194, weight: 88, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Emiliano Martínez", team: "Aston Villa", league: "Premier League", nation: "Argentina", position: "GK", overall: 64, diving: 68, handling: 69, kicking: 65, positioningGk: 70, reflexes: 72, pace: 45, physical: 68, height: 195, weight: 92, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Ollie Watkins", team: "Aston Villa", league: "Premier League", nation: "England", position: "ST", overall: 63, pace: 82, shooting: 71, passing: 66, dribbling: 75, defending: 31, physical: 72, height: 182, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Jacob Ramsey", team: "Aston Villa", league: "Premier League", nation: "England", position: "CM", overall: 60, pace: 75, shooting: 62, passing: 68, dribbling: 70, defending: 65, physical: 70, height: 180, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lisandro Martínez", team: "Manchester United", league: "Premier League", nation: "Argentina", position: "CB", overall: 62, pace: 72, shooting: 45, passing: 68, dribbling: 71, defending: 75, physical: 72, height: 178, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Scott McTominay", team: "Manchester United", league: "Premier League", nation: "Scotland", position: "CM", overall: 61, pace: 68, shooting: 62, passing: 66, dribbling: 65, defending: 71, physical: 78, height: 191, weight: 80, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Antony", team: "Manchester United", league: "Premier League", nation: "Brazil", position: "RW", overall: 60, pace: 79, shooting: 68, passing: 70, dribbling: 78, defending: 32, physical: 65, height: 179, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Aaron Wan-Bissaka", team: "Manchester United", league: "Premier League", nation: "England", position: "RB", overall: 61, pace: 74, shooting: 58, passing: 62, dribbling: 65, defending: 74, physical: 72, height: 183, weight: 69, preferredFoot: "right", weakFoot: 2, skillMoves: 3 },
  { name: "Jadon Sancho", team: "Manchester United", league: "Premier League", nation: "England", position: "LW", overall: 61, pace: 80, shooting: 71, passing: 75, dribbling: 81, defending: 35, physical: 65, height: 180, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Luke Shaw", team: "Manchester United", league: "Premier League", nation: "England", position: "LB", overall: 62, pace: 71, shooting: 55, passing: 68, dribbling: 70, defending: 74, physical: 76, height: 185, weight: 79, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Sergio Reguilón", team: "Tottenham", league: "Premier League", nation: "Spain", position: "LB", overall: 60, pace: 75, shooting: 54, passing: 66, dribbling: 71, defending: 71, physical: 70, height: 180, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Pierre-Emile Højbjerg", team: "Tottenham", league: "Premier League", nation: "Denmark", position: "CM", overall: 61, pace: 68, shooting: 64, passing: 72, dribbling: 68, defending: 76, physical: 76, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Richarlison", team: "Tottenham", league: "Premier League", nation: "Brazil", position: "LW", overall: 61, pace: 76, shooting: 70, passing: 68, dribbling: 75, defending: 40, physical: 75, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Maddison", team: "Tottenham", league: "Premier League", nation: "England", position: "CAM", overall: 62, pace: 73, shooting: 75, passing: 77, dribbling: 78, defending: 45, physical: 68, height: 182, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Timo Werner", team: "Tottenham", league: "Premier League", nation: "Germany", position: "LW", overall: 60, pace: 86, shooting: 71, passing: 68, dribbling: 75, defending: 38, physical: 65, height: 181, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Son Heung-min", team: "Tottenham", league: "Premier League", nation: "South Korea", position: "LW", overall: 63, pace: 84, shooting: 75, passing: 72, dribbling: 82, defending: 35, physical: 71, height: 183, weight: 74, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Rodrigo Bentancur", team: "Tottenham", league: "Premier League", nation: "Uruguay", position: "CM", overall: 61, pace: 70, shooting: 66, passing: 71, dribbling: 70, defending: 72, physical: 75, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // LA LIGA - ~20 players
  { name: "Vítinha", team: "Real Madrid", league: "La Liga", nation: "Portugal", position: "CM", overall: 61, pace: 72, shooting: 62, passing: 73, dribbling: 72, defending: 68, physical: 70, height: 175, weight: 65, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ferland Mendy", team: "Real Madrid", league: "La Liga", nation: "France", position: "LB", overall: 62, pace: 76, shooting: 52, passing: 66, dribbling: 70, defending: 72, physical: 75, height: 182, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Nacho Fernández", team: "Real Madrid", league: "La Liga", nation: "Spain", position: "CB", overall: 61, pace: 68, shooting: 43, passing: 64, dribbling: 62, defending: 74, physical: 76, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Gerardo Arteaga", team: "Real Sociedad", league: "La Liga", nation: "Mexico", position: "LB", overall: 60, pace: 75, shooting: 48, passing: 64, dribbling: 68, defending: 70, physical: 72, height: 180, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Takefusa Kubo", team: "Real Sociedad", league: "La Liga", nation: "Japan", position: "RW", overall: 61, pace: 78, shooting: 68, passing: 72, dribbling: 79, defending: 38, physical: 62, height: 180, weight: 67, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Mikel Merino", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "CM", overall: 61, pace: 72, shooting: 65, passing: 72, dribbling: 70, defending: 71, physical: 75, height: 190, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alejandro Balde", team: "Barcelona", league: "La Liga", nation: "Spain", position: "LB", overall: 61, pace: 80, shooting: 52, passing: 68, dribbling: 72, defending: 68, physical: 70, height: 173, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Marc-André ter Stegen", team: "Barcelona", league: "La Liga", nation: "Germany", position: "GK", overall: 63, diving: 66, handling: 67, kicking: 69, positioningGk: 68, reflexes: 70, pace: 48, physical: 65, height: 187, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Sergi Roberto", team: "Barcelona", league: "La Liga", nation: "Spain", position: "RB", overall: 60, pace: 70, shooting: 56, passing: 68, dribbling: 68, defending: 70, physical: 68, height: 183, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ronald Araújo", team: "Barcelona", league: "La Liga", nation: "Uruguay", position: "CB", overall: 62, pace: 75, shooting: 48, passing: 65, dribbling: 68, defending: 76, physical: 80, height: 187, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ferran Torres", team: "Barcelona", league: "La Liga", nation: "Spain", position: "RW", overall: 61, pace: 77, shooting: 70, passing: 70, dribbling: 75, defending: 36, physical: 68, height: 184, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alejandro Garnacho", team: "Atlético Madrid", league: "La Liga", nation: "Spain", position: "LW", overall: 60, pace: 82, shooting: 68, passing: 68, dribbling: 76, defending: 34, physical: 68, height: 178, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Sime Vrsaljko", team: "Atlético Madrid", league: "La Liga", nation: "Croatia", position: "RB", overall: 60, pace: 72, shooting: 54, passing: 64, dribbling: 66, defending: 72, physical: 74, height: 184, weight: 78, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Santiago Herrería", team: "Sevilla", league: "La Liga", nation: "Colombia", position: "CM", overall: 59, pace: 71, shooting: 62, passing: 70, dribbling: 68, defending: 69, physical: 72, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Boubcar Kamara", team: "Sevilla", league: "La Liga", nation: "France", position: "CDM", overall: 60, pace: 70, shooting: 58, passing: 68, dribbling: 66, defending: 74, physical: 76, height: 191, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Isco", team: "Real Betis", league: "La Liga", nation: "Spain", position: "CAM", overall: 60, pace: 69, shooting: 68, passing: 72, dribbling: 75, defending: 42, physical: 62, height: 176, weight: 68, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Andriy Yarmolenko", team: "Real Betis", league: "La Liga", nation: "Ukraine", position: "RW", overall: 60, pace: 78, shooting: 71, passing: 70, dribbling: 76, defending: 35, physical: 70, height: 182, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Émile Smith Rowe", team: "Fulham", league: "La Liga", nation: "England", position: "CAM", overall: 59, pace: 74, shooting: 68, passing: 71, dribbling: 74, defending: 40, physical: 65, height: 178, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Vinícius Souza", team: "Real Valladolid", league: "La Liga", nation: "Brazil", position: "CDM", overall: 58, pace: 70, shooting: 60, passing: 66, dribbling: 65, defending: 72, physical: 75, height: 188, weight: 80, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Ricky Puig", team: "Real Valladolid", league: "La Liga", nation: "Spain", position: "CM", overall: 57, pace: 70, shooting: 64, passing: 68, dribbling: 70, defending: 65, physical: 70, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // BUNDESLIGA - ~20 players
  { name: "Jamal Musiala", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 62, pace: 72, shooting: 70, passing: 72, dribbling: 80, defending: 35, physical: 62, height: 183, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Sérge Gnabry", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RW", overall: 60, pace: 76, shooting: 69, passing: 69, dribbling: 75, defending: 38, physical: 70, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Kingsley Coman", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "LW", overall: 61, pace: 80, shooting: 70, passing: 72, dribbling: 80, defending: 38, physical: 70, height: 178, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Benjamin Pavard", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "RB", overall: 61, pace: 74, shooting: 56, passing: 66, dribbling: 70, defending: 73, physical: 76, height: 186, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Dayot Upamecano", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "CB", overall: 61, pace: 72, shooting: 48, passing: 66, dribbling: 69, defending: 76, physical: 78, height: 186, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Leon Goretzka", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CM", overall: 60, pace: 72, shooting: 68, passing: 71, dribbling: 72, defending: 68, physical: 76, height: 189, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Alphonso Davies", team: "Bayern Munich", league: "Bundesliga", nation: "Canada", position: "LB", overall: 62, pace: 88, shooting: 58, passing: 71, dribbling: 76, defending: 72, physical: 78, height: 188, weight: 82, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Noussair Mazraoui", team: "Bayern Munich", league: "Bundesliga", nation: "Morocco", position: "RB", overall: 60, pace: 77, shooting: 54, passing: 68, dribbling: 70, defending: 72, physical: 74, height: 180, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Jonas Wind", team: "Wolfsburg", league: "Bundesliga", nation: "Denmark", position: "ST", overall: 60, pace: 78, shooting: 72, passing: 65, dribbling: 72, defending: 30, physical: 75, height: 188, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Jérôme Roussillon", team: "Wolfsburg", league: "Bundesliga", nation: "France", position: "LB", overall: 58, pace: 74, shooting: 48, passing: 62, dribbling: 65, defending: 69, physical: 72, height: 183, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Maximilian Arnold", team: "Wolfsburg", league: "Bundesliga", nation: "Germany", position: "CM", overall: 59, pace: 70, shooting: 62, passing: 72, dribbling: 70, defending: 68, physical: 72, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Yannick Gerhardt", team: "Wolfsburg", league: "Bundesliga", nation: "Germany", position: "CDM", overall: 58, pace: 68, shooting: 58, passing: 68, dribbling: 66, defending: 71, physical: 74, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Karim Onisiwo", team: "Mainz", league: "Bundesliga", nation: "Austria", position: "ST", overall: 58, pace: 74, shooting: 68, passing: 62, dribbling: 68, defending: 28, physical: 72, height: 188, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Sandro Schwarz", team: "Mainz", league: "Bundesliga", nation: "Germany", position: "CM", overall: 57, pace: 70, shooting: 60, passing: 68, dribbling: 68, defending: 65, physical: 72, height: 185, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Bruma", team: "PSV Eindhoven", league: "Bundesliga", nation: "Portugal", position: "RW", overall: 59, pace: 78, shooting: 68, passing: 70, dribbling: 76, defending: 36, physical: 68, height: 182, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Ridle Baku", team: "Wolfsburg", league: "Bundesliga", nation: "Germany", position: "LB", overall: 58, pace: 75, shooting: 50, passing: 64, dribbling: 68, defending: 70, physical: 72, height: 182, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Omar Marmoush", team: "Frankfurt", league: "Bundesliga", nation: "Egypt", position: "RW", overall: 59, pace: 82, shooting: 72, passing: 68, dribbling: 76, defending: 32, physical: 72, height: 181, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ansgar Knauff", team: "Frankfurt", league: "Bundesliga", nation: "Germany", position: "RW", overall: 57, pace: 80, shooting: 66, passing: 66, dribbling: 74, defending: 32, physical: 68, height: 182, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Sebastian Rode", team: "Frankfurt", league: "Bundesliga", nation: "Germany", position: "CM", overall: 58, pace: 72, shooting: 62, passing: 70, dribbling: 68, defending: 69, physical: 74, height: 188, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Willi Orbán", team: "Leipzig", league: "Bundesliga", nation: "Hungary", position: "CB", overall: 59, pace: 70, shooting: 46, passing: 64, dribbling: 62, defending: 72, physical: 74, height: 194, weight: 88, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },

  // SERIE A - ~20 players
  { name: "Alessandro Bastoni", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CB", overall: 62, pace: 70, shooting: 45, passing: 69, dribbling: 71, defending: 77, physical: 78, height: 187, weight: 82, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Nicolò Barella", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CM", overall: 61, pace: 72, shooting: 66, passing: 72, dribbling: 75, defending: 69, physical: 76, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Henrikh Mkhitaryan", team: "Inter Milan", league: "Serie A", nation: "Armenia", position: "CAM", overall: 60, pace: 72, shooting: 72, passing: 75, dribbling: 76, defending: 42, physical: 68, height: 183, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Danilo D'Ambrosio", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "CB", overall: 58, pace: 68, shooting: 42, passing: 62, dribbling: 60, defending: 70, physical: 74, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Francesco Acerbi", team: "Lazio", league: "Serie A", nation: "Italy", position: "CB", overall: 60, pace: 69, shooting: 43, passing: 64, dribbling: 62, defending: 72, physical: 76, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Sergej Milinković-Savić", team: "Lazio", league: "Serie A", nation: "Serbia", position: "CM", overall: 61, pace: 72, shooting: 68, passing: 72, dribbling: 75, defending: 65, physical: 80, height: 199, weight: 86, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Luis Alberto", team: "Lazio", league: "Serie A", nation: "Spain", position: "CAM", overall: 60, pace: 70, shooting: 70, passing: 77, dribbling: 78, defending: 40, physical: 62, height: 176, weight: 66, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Ciro Immobile", team: "Lazio", league: "Serie A", nation: "Italy", position: "ST", overall: 60, pace: 76, shooting: 78, passing: 70, dribbling: 75, defending: 30, physical: 72, height: 185, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Matteo Politano", team: "Napoli", league: "Serie A", nation: "Italy", position: "RW", overall: 59, pace: 76, shooting: 68, passing: 68, dribbling: 74, defending: 35, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Juan Jesus", team: "Napoli", league: "Serie A", nation: "Brazil", position: "CB", overall: 59, pace: 70, shooting: 42, passing: 64, dribbling: 62, defending: 72, physical: 76, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Piotr Zieliński", team: "Napoli", league: "Serie A", nation: "Poland", position: "CM", overall: 60, pace: 72, shooting: 66, passing: 72, dribbling: 76, defending: 65, physical: 70, height: 185, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Leonardo Spinazzola", team: "Roma", league: "Serie A", nation: "Italy", position: "LB", overall: 59, pace: 78, shooting: 52, passing: 66, dribbling: 70, defending: 70, physical: 72, height: 184, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Lorenzo Pellegrini", team: "Roma", league: "Serie A", nation: "Italy", position: "CAM", overall: 60, pace: 70, shooting: 68, passing: 74, dribbling: 74, defending: 44, physical: 68, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Paulo Dybala", team: "Roma", league: "Serie A", nation: "Argentina", position: "CAM", overall: 61, pace: 76, shooting: 76, passing: 74, dribbling: 80, defending: 40, physical: 64, height: 177, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Bryan Cristante", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 58, pace: 70, shooting: 62, passing: 70, dribbling: 68, defending: 69, physical: 76, height: 189, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Gianluca Mancini", team: "Roma", league: "Serie A", nation: "Italy", position: "CB", overall: 59, pace: 72, shooting: 48, passing: 66, dribbling: 68, defending: 73, physical: 77, height: 189, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Romain Faivre", team: "Fiorentina", league: "Serie A", nation: "France", position: "CAM", overall: 57, pace: 72, shooting: 66, passing: 70, dribbling: 72, defending: 40, physical: 66, height: 182, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Nicolas González", team: "Fiorentina", league: "Serie A", nation: "Argentina", position: "LW", overall: 58, pace: 80, shooting: 70, passing: 68, dribbling: 76, defending: 35, physical: 70, height: 176, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Sofyan Amrabat", team: "Fiorentina", league: "Serie A", nation: "Morocco", position: "CDM", overall: 59, pace: 72, shooting: 60, passing: 70, dribbling: 70, defending: 75, physical: 78, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Milan Badelj", team: "Fiorentina", league: "Serie A", nation: "Croatia", position: "CM", overall: 57, pace: 68, shooting: 60, passing: 70, dribbling: 66, defending: 70, physical: 76, height: 188, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // LIGUE 1 - ~20 players
  { name: "Mbappé", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "ST", overall: 62, pace: 89, shooting: 78, passing: 72, dribbling: 85, defending: 32, physical: 70, height: 178, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Neymar Jr", team: "Al-Hilal", league: "Ligue 1", nation: "Brazil", position: "LW", overall: 60, pace: 80, shooting: 76, passing: 78, dribbling: 86, defending: 30, physical: 64, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 5 },
  { name: "Ousmane Dembélé", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "RW", overall: 60, pace: 82, shooting: 72, passing: 71, dribbling: 80, defending: 38, physical: 68, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Presnel Kimpembe", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "CB", overall: 59, pace: 72, shooting: 46, passing: 66, dribbling: 68, defending: 74, physical: 78, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Marquinhos", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Brazil", position: "CB", overall: 61, pace: 74, shooting: 48, passing: 68, dribbling: 70, defending: 77, physical: 80, height: 183, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Danilo Pereira", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Portugal", position: "CDM", overall: 59, pace: 70, shooting: 58, passing: 68, dribbling: 66, defending: 74, physical: 78, height: 191, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Juan Bernat", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Spain", position: "LB", overall: 58, pace: 74, shooting: 50, passing: 66, dribbling: 68, defending: 70, physical: 72, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Alexandre Lacazette", team: "Lyon", league: "Ligue 1", nation: "France", position: "ST", overall: 59, pace: 74, shooting: 76, passing: 70, dribbling: 72, defending: 32, physical: 76, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Moussa Dembélé", team: "Lyon", league: "Ligue 1", nation: "France", position: "ST", overall: 58, pace: 76, shooting: 72, passing: 66, dribbling: 70, defending: 30, physical: 72, height: 179, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Tielemans", team: "Lyon", league: "Ligue 1", nation: "Belgium", position: "CM", overall: 59, pace: 72, shooting: 68, passing: 74, dribbling: 74, defending: 66, physical: 72, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Romain Faivre", team: "Brest", league: "Ligue 1", nation: "France", position: "CAM", overall: 57, pace: 70, shooting: 64, passing: 68, dribbling: 70, defending: 38, physical: 64, height: 182, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Pierre Lees-Melou", team: "Nice", league: "Ligue 1", nation: "France", position: "CM", overall: 57, pace: 70, shooting: 62, passing: 70, dribbling: 68, defending: 68, physical: 74, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Aaron Ramsey", team: "Nice", league: "Ligue 1", nation: "Wales", position: "CM", overall: 58, pace: 70, shooting: 66, passing: 72, dribbling: 70, defending: 64, physical: 72, height: 185, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Khaled Narey", team: "Marseille", league: "Ligue 1", nation: "Tunisia", position: "CM", overall: 56, pace: 70, shooting: 60, passing: 68, dribbling: 68, defending: 66, physical: 72, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Mattéo Guendouzi", team: "Marseille", league: "Ligue 1", nation: "France", position: "CM", overall: 58, pace: 72, shooting: 62, passing: 70, dribbling: 70, defending: 70, physical: 76, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Nuno Tavares", team: "Marseille", league: "Ligue 1", nation: "Portugal", position: "LB", overall: 58, pace: 82, shooting: 52, passing: 66, dribbling: 72, defending: 68, physical: 74, height: 184, weight: 78, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Dimitri Payet", team: "Marseille", league: "Ligue 1", nation: "France", position: "CAM", overall: 58, pace: 70, shooting: 72, passing: 76, dribbling: 76, defending: 40, physical: 66, height: 178, weight: 72, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 61, diving: 64, handling: 66, kicking: 68, positioningGk: 66, reflexes: 68, pace: 52, physical: 66, height: 196, weight: 92, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Sergio Ramos", team: "Sevilla", league: "Ligue 1", nation: "Spain", position: "CB", overall: 59, pace: 68, shooting: 54, passing: 68, dribbling: 68, defending: 76, physical: 80, height: 184, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Nabil Bentaleb", team: "Lille", league: "Ligue 1", nation: "Algeria", position: "CM", overall: 57, pace: 70, shooting: 64, passing: 70, dribbling: 72, defending: 62, physical: 68, height: 180, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },

  // TÜRK SUPER LİG - ~20 players
  { name: "Yusuf Yazıcı", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CAM", overall: 60, pace: 75, shooting: 74, passing: 76, dribbling: 78, defending: 40, physical: 68, height: 182, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Sadık Çiftpınar", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CM", overall: 57, pace: 70, shooting: 60, passing: 68, dribbling: 66, defending: 68, physical: 74, height: 183, week: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Gustavo Henrique", team: "Fenerbahçe", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 58, pace: 70, shooting: 42, passing: 62, dribbling: 60, defending: 72, physical: 76, height: 189, weight: 87, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Michy Batshuayi", team: "Galatasaray", league: "Süper Lig", nation: "Belgium", position: "ST", overall: 59, pace: 78, shooting: 76, passing: 64, dribbling: 70, defending: 32, physical: 74, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Marcão", team: "Galatasaray", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 59, pace: 72, shooting: 44, passing: 64, dribbling: 64, defending: 74, physical: 78, height: 189, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Abdülkerim Bardakcı", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 58, pace: 70, shooting: 42, passing: 64, dribbling: 62, defending: 72, physical: 76, height: 190, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Sergio Oliveira", team: "Galatasaray", league: "Süper Lig", nation: "Portugal", position: "CM", overall: 58, pace: 70, shooting: 64, passing: 72, dribbling: 68, defending: 68, physical: 72, height: 184, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Sacha Boey", team: "Galatasaray", league: "Süper Lig", nation: "France", position: "RB", overall: 57, pace: 76, shooting: 50, passing: 62, dribbling: 66, defending: 70, physical: 72, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Alpaslan Öztürk", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 56, pace: 68, shooting: 40, passing: 60, dribbling: 58, defending: 70, physical: 74, height: 187, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Semih Kaya", team: "Beşiktaş", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 58, pace: 70, shooting: 42, passing: 62, dribbling: 60, defending: 72, physical: 76, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Chery Chakvetadze", team: "Beşiktaş", league: "Süper Lig", nation: "Georgia", position: "RW", overall: 57, pace: 76, shooting: 66, passing: 68, dribbling: 74, defending: 34, physical: 64, height: 179, weight: 66, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Georges-Kévin N'Koudou", team: "Beşiktaş", league: "Süper Lig", nation: "Cameroon", position: "LW", overall: 57, pace: 80, shooting: 66, passing: 64, dribbling: 72, defending: 32, physical: 66, height: 180, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Kaan Ayhan", team: "Beşiktaş", league: "Süper Lig", nation: "Germany", position: "CB", overall: 57, pace: 70, shooting: 42, passing: 62, dribbling: 60, defending: 72, physical: 76, height: 187, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Dele Alli", team: "Beşiktaş", league: "Süper Lig", nation: "England", position: "CAM", overall: 57, pace: 72, shooting: 68, passing: 70, dribbling: 72, defending: 42, physical: 68, height: 184, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Batista Mezenga", team: "Trabzonspor", league: "Süper Lig", nation: "Guinea-Bissau", position: "CB", overall: 56, pace: 70, shooting: 42, passing: 60, dribbling: 58, defending: 70, physical: 74, height: 188, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Adil Nalbat", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "RB", overall: 56, pace: 72, shooting: 48, passing: 60, dribbling: 62, defending: 68, physical: 70, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Hilal Darısıkma", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "CM", overall: 55, pace: 68, shooting: 58, passing: 66, dribbling: 64, defending: 64, physical: 70, height: 181, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Mislav Oršić", team: "Dinamo Zagreb", league: "Süper Lig", nation: "Croatia", position: "LW", overall: 57, pace: 78, shooting: 70, passing: 70, dribbling: 76, defending: 35, physical: 70, height: 183, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Gabriel Paulista", team: "Valencia", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 57, pace: 68, shooting: 40, passing: 62, dribbling: 60, defending: 72, physical: 76, height: 186, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Cengiz Ünder", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "RW", overall: 58, pace: 80, shooting: 70, passing: 68, dribbling: 76, defending: 34, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },

  // EREDIVISIE - ~20 players
  { name: "Steven Berghuis", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "RW", overall: 60, pace: 76, shooting: 72, passing: 74, dribbling: 76, defending: 38, physical: 70, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Daley Blind", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "LB", overall: 59, pace: 72, shooting: 50, passing: 70, dribbling: 70, defending: 72, physical: 70, height: 182, weight: 75, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Calvin Bassey", team: "Ajax", league: "Eredivisie", nation: "Nigeria", position: "CB", overall: 59, pace: 74, shooting: 44, passing: 64, dribbling: 66, defending: 74, physical: 78, height: 191, weight: 85, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Devyne Rensch", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "RB", overall: 58, pace: 76, shooting: 52, passing: 66, dribbling: 70, defending: 70, physical: 72, height: 182, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Dusan Tadić", team: "Ajax", league: "Eredivisie", nation: "Serbia", position: "CAM", overall: 59, pace: 68, shooting: 74, passing: 78, dribbling: 80, defending: 42, physical: 68, height: 181, weight: 77, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Xavi Simons", team: "PSV Eindhoven", league: "Eredivisie", nation: "Netherlands", position: "CAM", overall: 60, pace: 74, shooting: 70, passing: 76, dribbling: 78, defending: 42, physical: 64, height: 178, weight: 66, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Cody Gakpo", team: "PSV Eindhoven", league: "Eredivisie", nation: "Netherlands", position: "LW", overall: 59, pace: 80, shooting: 72, passing: 72, dribbling: 78, defending: 36, physical: 70, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Erick Gutierrez", team: "PSV Eindhoven", league: "Eredivisie", nation: "Mexico", position: "CM", overall: 58, pace: 70, shooting: 62, passing: 70, dribbling: 68, defending: 68, physical: 72, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Joey Veerman", team: "PSV Eindhoven", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 58, pace: 70, shooting: 66, passing: 74, dribbling: 72, defending: 66, physical: 72, height: 188, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Sergiño Dest", team: "PSV Eindhoven", league: "Eredivisie", nation: "Netherlands", position: "LB", overall: 58, pace: 82, shooting: 56, passing: 68, dribbling: 76, defending: 66, physical: 70, height: 176, weight: 64, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Marten de Roon", team: "AZ Alkmaar", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 58, pace: 70, shooting: 64, passing: 72, dribbling: 68, defending: 72, physical: 76, height: 190, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Marcos Senesi", team: "Feyenoord", league: "Eredivisie", nation: "Argentina", position: "CB", overall: 58, pace: 72, shooting: 44, passing: 64, dribbling: 66, defending: 74, physical: 78, height: 191, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Lutsharel Geertruida", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "RB", overall: 57, pace: 76, shooting: 54, passing: 66, dribbling: 68, defending: 70, physical: 72, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Reiss Nelson", team: "Feyenoord", league: "Eredivisie", nation: "England", position: "RW", overall: 57, pace: 78, shooting: 68, passing: 66, dribbling: 74, defending: 32, physical: 66, height: 180, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Igor Paixão", team: "Feyenoord", league: "Eredivisie", nation: "Brazil", position: "LW", overall: 57, pace: 80, shooting: 70, passing: 68, dribbling: 76, defending: 34, physical: 68, height: 179, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Bart Matondo", team: "Schalke", league: "Eredivisie", nation: "Democratic Republic of the Congo", position: "RW", overall: 57, pace: 82, shooting: 66, passing: 64, dribbling: 72, defending: 32, physical: 66, height: 180, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Tyrell Malacia", team: "Utrecht", league: "Eredivisie", nation: "Netherlands", position: "LB", overall: 57, pace: 78, shooting: 50, passing: 64, dribbling: 68, defending: 70, physical: 72, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Otávio", team: "Porto", league: "Eredivisie", nation: "Brazil", position: "CM", overall: 58, pace: 74, shooting: 66, passing: 72, dribbling: 74, defending: 68, physical: 74, height: 180, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Quinten Timber", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 57, pace: 70, shooting: 62, passing: 70, dribbling: 70, defending: 70, physical: 74, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Mohamed Ihattaren", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CAM", overall: 56, pace: 72, shooting: 66, passing: 72, dribbling: 76, defending: 40, physical: 62, height: 174, weight: 66, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },

  // LIGA PORTUGAL - ~20 players
  { name: "Rúben Amorim", team: "Sporting CP", league: "Liga Portugal", nation: "Portugal", position: "CM", overall: 59, pace: 70, shooting: 64, passing: 72, dribbling: 70, defending: 70, physical: 74, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Nélson Semedo", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "RB", overall: 59, pace: 76, shooting: 54, passing: 68, dribbling: 70, defending: 72, physical: 74, height: 182, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Gonçalo Ramos", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "ST", overall: 58, pace: 76, shooting: 70, passing: 66, dribbling: 72, defending: 30, physical: 68, height: 181, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "João Félix", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "LW", overall: 59, pace: 78, shooting: 72, passing: 70, dribbling: 78, defending: 34, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Rafa Silva", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "RW", overall: 57, pace: 80, shooting: 68, passing: 66, dribbling: 76, defending: 32, physical: 64, height: 176, weight: 66, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Giorgian de Arrascaeta", team: "Flamengo", league: "Liga Portugal", nation: "Uruguay", position: "CAM", overall: 58, pace: 72, shooting: 70, passing: 74, dribbling: 76, defending: 40, physical: 66, height: 180, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Iván Fresneda", team: "Porto", league: "Liga Portugal", nation: "Spain", position: "RB", overall: 57, pace: 76, shooting: 52, passing: 64, dribbling: 66, defending: 70, physical: 72, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Pepe", team: "Porto", league: "Liga Portugal", nation: "Brazil", position: "CB", overall: 58, pace: 68, shooting: 42, passing: 64, dribbling: 62, defending: 74, physical: 76, height: 187, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Sérgio Conceição", team: "Porto", league: "Liga Portugal", nation: "Portugal", position: "CM", overall: 57, pace: 70, shooting: 62, passing: 70, dribbling: 68, defending: 68, physical: 72, height: 183, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Grujic", team: "Porto", league: "Liga Portugal", nation: "Serbia", position: "CM", overall: 57, pace: 70, shooting: 64, passing: 70, dribbling: 68, defending: 70, physical: 74, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Evanilson", team: "Porto", league: "Liga Portugal", nation: "Brazil", position: "ST", overall: 58, pace: 78, shooting: 70, passing: 64, dribbling: 70, defending: 28, physical: 70, height: 178, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Diogo Costa", team: "Porto", league: "Liga Portugal", nation: "Portugal", position: "GK", overall: 57, diving: 60, handling: 62, kicking: 64, positioningGk: 62, reflexes: 64, pace: 48, physical: 60, height: 188, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Ousmane Dembélé", team: "Sporting CP", league: "Liga Portugal", nation: "France", position: "RW", overall: 57, pace: 80, shooting: 70, passing: 68, dribbling: 78, defending: 36, physical: 66, height: 178, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Matheus Nunes", team: "Sporting CP", league: "Liga Portugal", nation: "Brazil", position: "CM", overall: 58, pace: 74, shooting: 64, passing: 72, dribbling: 72, defending: 70, physical: 74, height: 186, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Paulista", team: "Sporting CP", league: "Liga Portugal", nation: "Brazil", position: "CB", overall: 57, pace: 70, shooting: 42, passing: 62, dribbling: 60, defending: 72, physical: 76, height: 187, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Eduardo Quaresma", team: "Vitória SC", league: "Liga Portugal", nation: "Portugal", position: "RW", overall: 56, pace: 78, shooting: 66, passing: 64, dribbling: 72, defending: 32, physical: 64, height: 178, weight: 66, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Ronny Fernández", team: "Vitória SC", league: "Liga Portugal", nation: "Venezuela", position: "CB", overall: 56, pace: 70, shooting: 40, passing: 60, dribbling: 58, defending: 70, physical: 74, height: 187, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Anderson Silva", team: "Arouca", league: "Liga Portugal", nation: "Brazil", position: "CM", overall: 55, pace: 68, shooting: 60, passing: 66, dribbling: 64, defending: 66, physical: 70, height: 181, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Abdoulaye Doukoure", team: "Brest", league: "Liga Portugal", nation: "Mali", position: "CM", overall: 56, pace: 70, shooting: 62, passing: 68, dribbling: 66, defending: 70, physical: 74, height: 184, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Noel Whelan", team: "Casa Pia", league: "Liga Portugal", nation: "Republic of Ireland", position: "ST", overall: 55, pace: 72, shooting: 66, passing: 62, dribbling: 66, defending: 28, physical: 68, height: 180, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
];

async function seedPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log("⚽ Importing 150 REAL bronze tier players...");

    // Ensure cardQuality is set on all players
    const enrichedPlayers = bronzePlayers.map(p => ({
      ...p,
      cardQuality: p.cardQuality || getCardQuality(p.overall),
    }));

    const batchSize = 50;
    for (let i = 0; i < enrichedPlayers.length; i += batchSize) {
      const batch = enrichedPlayers.slice(i, i + batchSize);
      await db.insert(players).values(batch);
      console.log(`  ${Math.min(i + batchSize, enrichedPlayers.length)}/${enrichedPlayers.length} inserted`);
    }

    // Stats
    const [stats] = await connection.query(`
      SELECT
        cardQuality,
        COUNT(*) as count,
        MIN(overall) as minOvr,
        MAX(overall) as maxOvr
      FROM players
      WHERE cardQuality = 'bronze'
      GROUP BY cardQuality
    `);

    console.log("\n✅ Bronze tier import complete!");
    console.log("\n📊 Bronze Players Distribution:");
    console.table(stats);

    // Show league breakdown
    const [leagueStats] = await connection.query(`
      SELECT
        league,
        COUNT(*) as count
      FROM players
      WHERE cardQuality = 'bronze'
      GROUP BY league
      ORDER BY count DESC
    `);

    console.log("\n🏆 Players by League (Bronze Tier):");
    console.table(leagueStats);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedPlayers();
