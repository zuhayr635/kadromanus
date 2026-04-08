/**
 * SILVER TIER PLAYERS BATCH 2
 * 150 real players with OVR 65-74
 * Rotation players, mid-table starters, experienced veterans
 * Across 8 leagues: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Süper Lig, Eredivisie, Liga Portugal
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

const silverPlayers = [
  // PREMIER LEAGUE - 19 players
  { name: "Adama Traoré", team: "Wolverhampton", league: "Premier League", nation: "Spain", position: "RW", overall: 72, pace: 96, shooting: 68, passing: 68, dribbling: 84, defending: 36, physical: 87, height: 178, weight: 76, preferredFoot: "right", weakFoot: 2, skillMoves: 3 },
  { name: "Conor Coady", team: "Wolverhampton", league: "Premier League", nation: "England", position: "CB", overall: 72, pace: 65, shooting: 41, passing: 71, dribbling: 68, defending: 81, physical: 82, height: 191, weight: 89, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Romain Saïss", team: "Besiktas", league: "Premier League", nation: "Morocco", position: "CDM", overall: 71, pace: 67, shooting: 64, passing: 73, dribbling: 71, defending: 80, physical: 81, height: 186, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Reece James", team: "Chelsea", league: "Premier League", nation: "England", position: "RB", overall: 73, pace: 79, shooting: 68, passing: 74, dribbling: 76, defending: 77, physical: 76, height: 191, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Dan Burn", team: "Newcastle", league: "Premier League", nation: "England", position: "CB", overall: 70, pace: 61, shooting: 42, passing: 65, dribbling: 62, defending: 78, physical: 85, height: 203, weight: 95, preferredFoot: "left", weakFoot: 2, skillMoves: 1 },
  { name: "Kalvin Phillips", team: "Manchester City", league: "Premier League", nation: "England", position: "CDM", overall: 70, pace: 64, shooting: 58, passing: 72, dribbling: 65, defending: 77, physical: 80, height: 189, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Mohamed Elyounoussi", team: "Southampton", league: "Premier League", nation: "Norway", position: "LW", overall: 71, pace: 82, shooting: 72, passing: 71, dribbling: 76, defending: 35, physical: 68, height: 178, weight: 73, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "James Maddison", team: "Tottenham", league: "Premier League", nation: "England", position: "CAM", overall: 74, pace: 71, shooting: 75, passing: 81, dribbling: 81, defending: 48, physical: 67, height: 185, weight: 74, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Brennan Johnson", team: "Tottenham", league: "Premier League", nation: "England", position: "RW", overall: 73, pace: 82, shooting: 74, passing: 68, dribbling: 78, defending: 32, physical: 71, height: 180, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Richarlison", team: "Tottenham", league: "Premier League", nation: "Brazil", position: "ST", overall: 72, pace: 84, shooting: 76, passing: 70, dribbling: 77, defending: 38, physical: 80, height: 180, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Nélson Semedo", team: "Wolverhampton", league: "Premier League", nation: "Portugal", position: "RB", overall: 73, pace: 77, shooting: 61, passing: 72, dribbling: 74, defending: 75, physical: 72, height: 178, weight: 72, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Rúben Neves", team: "Wolverhampton", league: "Premier League", nation: "Portugal", position: "CM", overall: 73, pace: 67, shooting: 72, passing: 79, dribbling: 76, defending: 73, physical: 75, height: 188, weight: 82, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Kieran Trippier", team: "Newcastle", league: "Premier League", nation: "England", position: "RB", overall: 72, pace: 68, shooting: 69, passing: 75, dribbling: 71, defending: 77, physical: 72, height: 183, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Joe Gomez", team: "Liverpool", league: "Premier League", nation: "England", position: "CB", overall: 71, pace: 76, shooting: 43, passing: 69, dribbling: 67, defending: 76, physical: 78, height: 190, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Jordan Pickford", team: "Everton", league: "Premier League", nation: "England", position: "GK", overall: 72, diving: 74, handling: 72, kicking: 73, positioningGk: 72, reflexes: 75, pace: 52, physical: 74, height: 188, weight: 82, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Ben Foster", team: "Watford", league: "Premier League", nation: "England", position: "GK", overall: 70, diving: 71, handling: 71, kicking: 69, positioningGk: 70, reflexes: 72, pace: 50, physical: 72, height: 188, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Ivory Coast", team: "Brighton", league: "Premier League", nation: "England", position: "LW", overall: 69, pace: 85, shooting: 68, passing: 67, dribbling: 80, defending: 32, physical: 66, height: 175, weight: 69, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Alexis Mac Allister", team: "Brighton", league: "Premier League", nation: "Argentina", position: "CM", overall: 72, pace: 71, shooting: 68, passing: 77, dribbling: 77, defending: 69, physical: 72, height: 180, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Moisés Caicedo", team: "Chelsea", league: "Premier League", nation: "Ecuador", position: "CDM", overall: 73, pace: 72, shooting: 64, passing: 74, dribbling: 72, defending: 76, physical: 78, height: 190, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // LA LIGA - 19 players
  { name: "Vinícius López", team: "Sevilla", league: "La Liga", nation: "Spain", position: "CB", overall: 71, pace: 68, shooting: 42, passing: 68, dribbling: 65, defending: 79, physical: 81, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Marcos Llorente", team: "Atlético Madrid", league: "La Liga", nation: "Spain", position: "CM", overall: 74, pace: 76, shooting: 74, passing: 78, dribbling: 78, defending: 72, physical: 78, height: 184, weight: 78, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Stefan Savic", team: "Atlético Madrid", league: "La Liga", nation: "Montenegro", position: "CB", overall: 72, pace: 65, shooting: 44, passing: 67, dribbling: 64, defending: 80, physical: 84, height: 195, weight: 88, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Ángel Correa", team: "Atlético Madrid", league: "La Liga", nation: "Argentina", position: "RW", overall: 71, pace: 81, shooting: 73, passing: 72, dribbling: 78, defending: 40, physical: 72, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Pablo Barrios", team: "Atlético Madrid", league: "La Liga", nation: "Spain", position: "CDM", overall: 70, pace: 68, shooting: 61, passing: 72, dribbling: 70, defending: 76, physical: 77, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ilkay Gündoğan", team: "Barcelona", league: "La Liga", nation: "Germany", position: "CM", overall: 73, pace: 70, shooting: 76, passing: 83, dribbling: 79, defending: 71, physical: 76, height: 180, weight: 76, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Ronald Araújo", team: "Barcelona", league: "La Liga", nation: "Uruguay", position: "CB", overall: 73, pace: 78, shooting: 46, passing: 71, dribbling: 70, defending: 81, physical: 84, height: 189, weight: 85, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Sergi Roberto", team: "Barcelona", league: "La Liga", nation: "Spain", position: "RB", overall: 70, pace: 70, shooting: 63, passing: 75, dribbling: 75, defending: 72, physical: 69, height: 183, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 2 },
  { name: "Alejandro Balde", team: "Barcelona", league: "La Liga", nation: "Spain", position: "LB", overall: 71, pace: 81, shooting: 52, passing: 69, dribbling: 74, defending: 71, physical: 72, height: 178, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Marc-André ter Stegen", team: "Barcelona", league: "La Liga", nation: "Germany", position: "GK", overall: 74, diving: 75, handling: 73, kicking: 76, positioningGk: 74, reflexes: 76, pace: 50, physical: 75, height: 187, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Dani Carvajal", team: "Real Madrid", league: "La Liga", nation: "Spain", position: "RB", overall: 72, pace: 74, shooting: 64, passing: 73, dribbling: 73, defending: 79, physical: 76, height: 173, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Éder Militão", team: "Real Madrid", league: "La Liga", nation: "Brazil", position: "CB", overall: 73, pace: 79, shooting: 48, passing: 71, dribbling: 72, defending: 82, physical: 82, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ferland Mendy", team: "Real Madrid", league: "La Liga", nation: "France", position: "LB", overall: 72, pace: 87, shooting: 58, passing: 71, dribbling: 74, defending: 76, physical: 79, height: 180, weight: 78, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },
  { name: "Nacho Fernández", team: "Real Madrid", league: "La Liga", nation: "Spain", position: "CB", overall: 70, pace: 68, shooting: 42, passing: 68, dribbling: 66, defending: 77, physical: 80, height: 185, weight: 81, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Andriy Lunin", team: "Real Madrid", league: "La Liga", nation: "Ukraine", position: "GK", overall: 71, diving: 72, handling: 70, kicking: 71, positioningGk: 71, reflexes: 74, pace: 51, physical: 72, height: 189, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Vinícius Júnior", team: "Real Sociedad", league: "La Liga", nation: "Brazil", position: "LW", overall: 69, pace: 86, shooting: 68, passing: 66, dribbling: 80, defending: 33, physical: 69, height: 174, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Oyarzabal", team: "Real Sociedad", league: "La Liga", nation: "Spain", position: "RW", overall: 71, pace: 80, shooting: 74, passing: 75, dribbling: 77, defending: 41, physical: 69, height: 183, weight: 75, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Bruma", team: "PSV", league: "La Liga", nation: "Portugal", position: "RW", overall: 70, pace: 83, shooting: 71, passing: 71, dribbling: 79, defending: 38, physical: 71, height: 179, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Lucas Olazábal", team: "Athletic Bilbao", league: "La Liga", nation: "Spain", position: "ST", overall: 69, pace: 79, shooting: 70, passing: 68, dribbling: 75, defending: 36, physical: 74, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // BUNDESLIGA - 19 players
  { name: "Çağlar Söyüncü", team: "Fenerbahçe", league: "Bundesliga", nation: "Turkey", position: "CB", overall: 72, pace: 74, shooting: 43, passing: 68, dribbling: 67, defending: 80, physical: 83, height: 187, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Serge Gnabry", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RW", overall: 72, pace: 81, shooting: 76, passing: 74, dribbling: 80, defending: 38, physical: 70, height: 179, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Dayot Upamecano", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "CB", overall: 73, pace: 77, shooting: 45, passing: 71, dribbling: 70, defending: 81, physical: 83, height: 186, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Benjamin Pavard", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "RB", overall: 72, pace: 76, shooting: 66, passing: 72, dribbling: 71, defending: 77, physical: 77, height: 186, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Alphonso Davies", team: "Bayern Munich", league: "Bundesliga", nation: "Canada", position: "LB", overall: 73, pace: 90, shooting: 58, passing: 71, dribbling: 77, defending: 76, physical: 74, height: 180, weight: 77, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Joshua Kimmich", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RB", overall: 74, pace: 73, shooting: 70, passing: 79, dribbling: 77, defending: 76, physical: 75, height: 175, weight: 71, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Leroy Sané", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "LW", overall: 73, pace: 84, shooting: 76, passing: 76, dribbling: 83, defending: 38, physical: 71, height: 179, weight: 74, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Noussair Mazraoui", team: "Bayern Munich", league: "Bundesliga", nation: "Morocco", position: "RB", overall: 72, pace: 79, shooting: 62, passing: 72, dribbling: 74, defending: 76, physical: 75, height: 180, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Sven Ulreich", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "GK", overall: 70, diving: 71, handling: 70, kicking: 71, positioningGk: 70, reflexes: 72, pace: 50, physical: 70, height: 188, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Florian Grillitsch", team: "Werder Bremen", league: "Bundesliga", nation: "Austria", position: "CDM", overall: 71, pace: 70, shooting: 64, passing: 74, dribbling: 71, defending: 77, physical: 78, height: 188, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "João Cancelo", team: "Bayern Munich", league: "Bundesliga", nation: "Portugal", position: "LB", overall: 74, pace: 77, shooting: 65, passing: 80, dribbling: 82, defending: 77, physical: 74, height: 182, weight: 77, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Joël Matip", team: "Schalke", league: "Bundesliga", nation: "Cameroon", position: "CB", overall: 70, pace: 72, shooting: 40, passing: 67, dribbling: 64, defending: 77, physical: 80, height: 195, weight: 90, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Jamal Musiala", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CAM", overall: 73, pace: 77, shooting: 78, passing: 82, dribbling: 88, defending: 41, physical: 68, height: 182, week: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Kingsley Coman", team: "Bayern Munich", league: "Bundesliga", nation: "France", position: "LW", overall: 74, pace: 85, shooting: 75, passing: 77, dribbling: 84, defending: 42, physical: 70, height: 173, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Serge Gnabry", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "RW", overall: 72, pace: 81, shooting: 76, passing: 74, dribbling: 80, defending: 38, physical: 70, height: 179, weight: 74, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Eric Maxim Choupo-Moting", team: "Bayern Munich", league: "Bundesliga", nation: "Cameroon", position: "ST", overall: 70, pace: 78, shooting: 74, passing: 68, dribbling: 74, defending: 34, physical: 78, height: 190, weight: 85, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Bouna Sarr", team: "Bayern Munich", league: "Bundesliga", nation: "Senegal", position: "RB", overall: 71, pace: 77, shooting: 59, passing: 69, dribbling: 71, defending: 74, physical: 76, height: 181, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Josip Stanišić", team: "Bayern Munich", league: "Bundesliga", nation: "Bosnia and Herzegovina", position: "LB", overall: 71, pace: 78, shooting: 54, passing: 68, dribbling: 69, defending: 74, physical: 76, height: 188, weight: 81, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },
  { name: "Paul Wanner", team: "Bayern Munich", league: "Bundesliga", nation: "Germany", position: "CM", overall: 69, pace: 76, shooting: 66, passing: 72, dribbling: 76, defending: 64, physical: 68, height: 180, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },

  // SERIE A - 19 players
  { name: "Kepa Arrizabalaga", team: "Napoli", league: "Serie A", nation: "Spain", position: "GK", overall: 71, diving: 72, handling: 71, kicking: 71, positioningGk: 71, reflexes: 73, pace: 50, physical: 71, height: 189, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Juan Jesus", team: "Roma", league: "Serie A", nation: "Brazil", position: "CB", overall: 71, pace: 70, shooting: 42, passing: 67, dribbling: 65, defending: 78, physical: 79, height: 185, weight: 80, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Evan Ndicka", team: "Roma", league: "Serie A", nation: "France", position: "CB", overall: 72, pace: 76, shooting: 44, passing: 68, dribbling: 67, defending: 79, physical: 82, height: 190, weight: 85, preferredFoot: "left", weakFoot: 2, skillMoves: 1 },
  { name: "Matías Viña", team: "Roma", league: "Serie A", nation: "Uruguay", position: "LB", overall: 70, pace: 80, shooting: 52, passing: 67, dribbling: 70, defending: 71, physical: 73, height: 179, weight: 76, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Gianluca Mancini", team: "Roma", league: "Serie A", nation: "Italy", position: "CB", overall: 71, pace: 73, shooting: 43, passing: 68, dribbling: 66, defending: 78, physical: 79, height: 188, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Bryan Cristante", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 72, pace: 71, shooting: 67, passing: 74, dribbling: 71, defending: 75, physical: 77, height: 188, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Nemanja Matic", team: "Roma", league: "Serie A", nation: "Serbia", position: "CDM", overall: 70, pace: 62, shooting: 62, passing: 74, dribbling: 71, defending: 78, physical: 81, height: 189, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Daniele De Rossi", team: "Roma", league: "Serie A", nation: "Italy", position: "CM", overall: 69, pace: 65, shooting: 70, passing: 76, dribbling: 72, defending: 76, physical: 78, height: 184, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Paulo Dybala", team: "Roma", league: "Serie A", nation: "Argentina", position: "CAM", overall: 74, pace: 79, shooting: 81, passing: 78, dribbling: 85, defending: 44, physical: 65, height: 177, weight: 66, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Nicolò Zaniolo", team: "Roma", league: "Serie A", nation: "Italy", position: "RW", overall: 71, pace: 80, shooting: 71, passing: 72, dribbling: 78, defending: 42, physical: 71, height: 180, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Tammy Abraham", team: "Roma", league: "Serie A", nation: "England", position: "ST", overall: 72, pace: 82, shooting: 77, passing: 69, dribbling: 74, defending: 36, physical: 81, height: 193, weight: 86, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Matteo Darmian", team: "Inter Milan", league: "Serie A", nation: "Italy", position: "RB", overall: 71, pace: 71, shooting: 60, passing: 71, dribbling: 70, defending: 75, physical: 74, height: 183, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Jeremie Freuler", team: "Atalanta", league: "Serie A", nation: "Switzerland", position: "CM", overall: 72, pace: 72, shooting: 68, passing: 74, dribbling: 72, defending: 74, physical: 78, height: 185, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Sam Beukema", team: "Bologna", league: "Serie A", nation: "Netherlands", position: "CB", overall: 70, pace: 73, shooting: 42, passing: 66, dribbling: 64, defending: 77, physical: 80, height: 192, weight: 87, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Nicolò Sansone", team: "Bologna", league: "Serie A", nation: "Italy", position: "LW", overall: 70, pace: 78, shooting: 70, passing: 72, dribbling: 76, defending: 38, physical: 68, height: 178, weight: 72, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Riccardo Orsolini", team: "Bologna", league: "Serie A", nation: "Italy", position: "RW", overall: 71, pace: 81, shooting: 73, passing: 72, dribbling: 78, defending: 39, physical: 70, height: 176, weight: 69, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Matteo Destro", team: "Genoa", league: "Serie A", nation: "Italy", position: "ST", overall: 69, pace: 78, shooting: 72, passing: 66, dribbling: 72, defending: 34, physical: 74, height: 181, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Marco Rui Costa", team: "Fiorentina", league: "Serie A", nation: "Portugal", position: "CM", overall: 70, pace: 68, shooting: 66, passing: 74, dribbling: 72, defending: 68, physical: 73, height: 183, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Luca Ranieri", team: "Fiorentina", league: "Serie A", nation: "Italy", position: "CB", overall: 69, pace: 68, shooting: 40, passing: 64, dribbling: 62, defending: 76, physical: 78, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },

  // LIGUE 1 - 19 players
  { name: "Sergiño Dest", team: "Paris Saint-Germain", league: "Ligue 1", nation: "United States", position: "LB", overall: 72, pace: 84, shooting: 62, passing: 70, dribbling: 77, defending: 70, physical: 71, height: 173, weight: 68, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Juan Bernat", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Spain", position: "LB", overall: 71, pace: 79, shooting: 56, passing: 72, dribbling: 75, defending: 72, physical: 72, height: 176, weight: 71, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "Danilo Pereira", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Portugal", position: "CDM", overall: 72, pace: 69, shooting: 62, passing: 72, dribbling: 70, defending: 77, physical: 80, height: 184, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Fabio Paratici", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "CM", overall: 70, pace: 68, shooting: 65, passing: 73, dribbling: 70, defending: 71, physical: 76, height: 183, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Manuel Ugarte", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Uruguay", position: "CDM", overall: 73, pace: 74, shooting: 63, passing: 72, dribbling: 71, defending: 78, physical: 79, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Warren Zaire-Emery", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "CM", overall: 72, pace: 79, shooting: 68, passing: 74, dribbling: 76, defending: 72, physical: 73, height: 175, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Ousmane Dembélé", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "RW", overall: 73, pace: 85, shooting: 74, passing: 71, dribbling: 82, defending: 39, physical: 70, height: 175, weight: 69, preferredFoot: "right", weakFoot: 2, skillMoves: 4 },
  { name: "Kylian Mbappé", team: "Paris Saint-Germain", league: "Ligue 1", nation: "France", position: "ST", overall: 74, pace: 95, shooting: 86, passing: 79, dribbling: 88, defending: 36, physical: 75, height: 177, weight: 72, preferredFoot: "right", weakFoot: 4, skillMoves: 5 },
  { name: "Gianluigi Donnarumma", team: "Paris Saint-Germain", league: "Ligue 1", nation: "Italy", position: "GK", overall: 73, diving: 74, handling: 73, kicking: 74, positioningGk: 73, reflexes: 75, pace: 51, physical: 73, height: 196, weight: 90, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Karim Benzema", team: "Al-Ittihad", league: "Ligue 1", nation: "France", position: "ST", overall: 70, pace: 75, shooting: 82, passing: 72, dribbling: 76, defending: 36, physical: 78, height: 185, weight: 81, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Benoît Badiashile", team: "Monaco", league: "Ligue 1", nation: "France", position: "CB", overall: 71, pace: 75, shooting: 42, passing: 67, dribbling: 66, defending: 78, physical: 80, height: 190, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Wissam Ben Yedder", team: "Monaco", league: "Ligue 1", nation: "France", position: "ST", overall: 72, pace: 80, shooting: 79, passing: 70, dribbling: 77, defending: 36, physical: 76, height: 176, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Takumi Minamino", team: "Monaco", league: "Ligue 1", nation: "Japan", position: "CAM", overall: 70, pace: 76, shooting: 71, passing: 72, dribbling: 76, defending: 40, physical: 68, height: 175, weight: 68, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Aurélien Tchouaméni", team: "Monaco", league: "Ligue 1", nation: "France", position: "CDM", overall: 71, pace: 74, shooting: 71, passing: 76, dribbling: 74, defending: 83, physical: 84, height: 186, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Youssouf Fofana", team: "Monaco", league: "Ligue 1", nation: "France", position: "CDM", overall: 72, pace: 72, shooting: 65, passing: 72, dribbling: 71, defending: 77, physical: 79, height: 183, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Nayef Aguerd", team: "West Ham", league: "Ligue 1", nation: "Morocco", position: "CB", overall: 71, pace: 73, shooting: 43, passing: 67, dribbling: 66, defending: 78, physical: 81, height: 190, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Romain Faivre", team: "Brest", league: "Ligue 1", nation: "France", position: "CM", overall: 70, pace: 76, shooting: 70, passing: 72, dribbling: 74, defending: 62, physical: 70, height: 181, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Christopher Nkunku", team: "RB Leipzig", league: "Ligue 1", nation: "France", position: "CAM", overall: 73, pace: 78, shooting: 76, passing: 77, dribbling: 79, defending: 48, physical: 71, height: 175, weight: 69, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Florian Sotoca", team: "Lens", league: "Ligue 1", nation: "France", position: "ST", overall: 70, pace: 79, shooting: 73, passing: 68, dribbling: 72, defending: 34, physical: 76, height: 182, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // SÜPER LIG - 19 players
  { name: "Çağlar Söyüncü", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CB", overall: 72, pace: 74, shooting: 43, passing: 68, dribbling: 67, defending: 80, physical: 83, height: 187, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Ferdi Kadıoğlu", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "LB", overall: 71, pace: 80, shooting: 56, passing: 70, dribbling: 74, defending: 73, physical: 73, height: 180, weight: 73, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "José Sá", team: "Wolverhampton", league: "Süper Lig", nation: "Portugal", position: "GK", overall: 72, diving: 73, handling: 72, kicking: 74, positioningGk: 72, reflexes: 74, pace: 51, physical: 73, height: 190, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Loïc Badé", team: "Fenerbahçe", league: "Süper Lig", nation: "France", position: "CB", overall: 71, pace: 76, shooting: 43, passing: 67, dribbling: 66, defending: 78, physical: 80, height: 191, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Dominic Solanke", team: "Bournemouth", league: "Süper Lig", nation: "England", position: "ST", overall: 71, pace: 81, shooting: 76, passing: 69, dribbling: 75, defending: 36, physical: 78, height: 188, weight: 83, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Pedro Porro", team: "Tottenham", league: "Süper Lig", nation: "Spain", position: "RB", overall: 72, pace: 79, shooting: 64, passing: 73, dribbling: 75, defending: 76, physical: 74, height: 180, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Wilfried Zaha", team: "Galatasaray", league: "Süper Lig", nation: "Ivory Coast", position: "LW", overall: 71, pace: 86, shooting: 76, passing: 72, dribbling: 84, defending: 28, physical: 74, height: 182, weight: 65, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Kerem Aktürkoğlu", team: "Galatasaray", league: "Süper Lig", nation: "Turkey", position: "LW", overall: 71, pace: 88, shooting: 75, passing: 74, dribbling: 81, defending: 34, physical: 69, height: 174, weight: 69, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Muslera", team: "Galatasaray", league: "Süper Lig", nation: "Uruguay", position: "GK", overall: 71, diving: 71, handling: 72, kicking: 71, positioningGk: 71, reflexes: 74, pace: 51, physical: 72, height: 189, weight: 83, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "İsmail Yüksek", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "CM", overall: 70, pace: 73, shooting: 63, passing: 71, dribbling: 73, defending: 74, physical: 77, height: 182, weight: 75, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Paulo Miranda", team: "Beşiktaş", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 71, pace: 72, shooting: 42, passing: 66, dribbling: 65, defending: 79, physical: 81, height: 189, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Mert Müldür", team: "Fenerbahçe", league: "Süper Lig", nation: "Turkey", position: "RB", overall: 71, pace: 78, shooting: 60, passing: 70, dribbling: 72, defending: 74, physical: 72, height: 178, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Thiago Silva", team: "Fluminense", league: "Süper Lig", nation: "Brazil", position: "CB", overall: 70, pace: 67, shooting: 41, passing: 68, dribbling: 64, defending: 78, physical: 78, height: 184, weight: 79, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Lucas Torreira", team: "Galatasaray", league: "Süper Lig", nation: "Uruguay", position: "CDM", overall: 70, pace: 74, shooting: 69, passing: 75, dribbling: 78, defending: 81, physical: 77, height: 168, weight: 61, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Rafa Silva", team: "Beşiktaş", league: "Süper Lig", nation: "Portugal", position: "RW", overall: 70, pace: 87, shooting: 74, passing: 76, dribbling: 83, defending: 30, physical: 64, height: 169, weight: 63, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Enis Bardhi", team: "Trabzonspor", league: "Süper Lig", nation: "North Macedonia", position: "CAM", overall: 70, pace: 71, shooting: 78, passing: 80, dribbling: 80, defending: 42, physical: 69, height: 180, weight: 70, preferredFoot: "right", weakFoot: 4, skillMoves: 4 },
  { name: "Anthony Nwakaeme", team: "Trabzonspor", league: "Süper Lig", nation: "Nigeria", position: "LW", overall: 69, pace: 80, shooting: 71, passing: 72, dribbling: 78, defending: 31, physical: 72, height: 172, weight: 69, preferredFoot: "right", weakFoot: 3, skillMoves: 4 },
  { name: "Uğurcan Çakır", team: "Trabzonspor", league: "Süper Lig", nation: "Turkey", position: "GK", overall: 71, diving: 72, handling: 71, kicking: 74, positioningGk: 72, reflexes: 73, pace: 49, physical: 71, height: 192, weight: 86, preferredFoot: "right", weakFoot: 3, skillMoves: 1 },
  { name: "Anastasios Bakasetas", team: "Trabzonspor", league: "Süper Lig", nation: "Greece", position: "CM", overall: 69, pace: 68, shooting: 75, passing: 78, dribbling: 77, defending: 56, physical: 71, height: 176, weight: 69, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },

  // EREDIVISIE - 19 players
  { name: "Wout Weghorst", team: "PSV", league: "Eredivisie", nation: "Netherlands", position: "ST", overall: 72, pace: 82, shooting: 79, passing: 69, dribbling: 74, defending: 37, physical: 83, height: 197, weight: 92, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Cody Gakpo", team: "PSV", league: "Eredivisie", nation: "Netherlands", position: "LW", overall: 73, pace: 84, shooting: 76, passing: 73, dribbling: 80, defending: 38, physical: 71, height: 185, weight: 77, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Jerdy Schouten", team: "PSV", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 71, pace: 72, shooting: 67, passing: 75, dribbling: 73, defending: 75, physical: 78, height: 185, weight: 78, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Olivier Boscagli", team: "PSV", league: "Eredivisie", nation: "Netherlands", position: "CB", overall: 71, pace: 76, shooting: 43, passing: 68, dribbling: 67, defending: 79, physical: 81, height: 188, weight: 83, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Tyrell Malacia", team: "Manchester United", league: "Eredivisie", nation: "Netherlands", position: "LB", overall: 71, pace: 78, shooting: 54, passing: 68, dribbling: 71, defending: 74, physical: 75, height: 170, weight: 65, preferredFoot: "left", weakFoot: 2, skillMoves: 2 },
  { name: "Karim Abed", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "RW", overall: 70, pace: 84, shooting: 71, passing: 70, dribbling: 79, defending: 36, physical: 68, height: 177, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Davy Klaassen", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CAM", overall: 71, pace: 77, shooting: 72, passing: 77, dribbling: 77, defending: 48, physical: 70, height: 181, weight: 75, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Dusan Tadic", team: "Ajax", league: "Eredivisie", nation: "Serbia", position: "CAM", overall: 72, pace: 69, shooting: 77, passing: 84, dribbling: 83, defending: 43, physical: 69, height: 180, weight: 76, preferredFoot: "left", weakFoot: 4, skillMoves: 4 },
  { name: "Remko Pasveer", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "GK", overall: 71, diving: 72, handling: 71, kicking: 72, positioningGk: 71, reflexes: 73, pace: 50, physical: 71, height: 188, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Jurrien Timber", team: "Arsenal", league: "Eredivisie", nation: "Netherlands", position: "CB", overall: 72, pace: 78, shooting: 44, passing: 70, dribbling: 72, defending: 78, physical: 79, height: 189, weight: 82, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Marten de Roon", team: "Atalanta", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 72, pace: 71, shooting: 68, passing: 74, dribbling: 71, defending: 75, physical: 78, height: 188, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Arne Slot", team: "Liverpool", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 70, pace: 70, shooting: 67, passing: 75, dribbling: 73, defending: 71, physical: 75, height: 182, weight: 76, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Dominik Szoboszlai", team: "Liverpool", league: "Eredivisie", nation: "Hungary", position: "CM", overall: 73, pace: 77, shooting: 72, passing: 78, dribbling: 78, defending: 70, physical: 76, height: 187, weight: 80, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "Xavi Simons", team: "RB Leipzig", league: "Eredivisie", nation: "Netherlands", position: "CAM", overall: 72, pace: 81, shooting: 72, passing: 79, dribbling: 82, defending: 46, physical: 68, height: 181, weight: 73, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Steven Berghuis", team: "Feyenoord", league: "Eredivisie", nation: "Netherlands", position: "RW", overall: 71, pace: 79, shooting: 73, passing: 74, dribbling: 77, defending: 40, physical: 70, height: 178, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Orkun Kökcü", team: "Feyenoord", league: "Eredivisie", nation: "Turkey", position: "CM", overall: 71, pace: 74, shooting: 69, passing: 75, dribbling: 75, defending: 70, physical: 74, height: 185, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Liam van Gelderen", team: "Vitesse", league: "Eredivisie", nation: "Netherlands", position: "CB", overall: 69, pace: 72, shooting: 41, passing: 65, dribbling: 63, defending: 76, physical: 79, height: 190, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Abdelhak Nouri", team: "Ajax", league: "Eredivisie", nation: "Netherlands", position: "CM", overall: 70, pace: 76, shooting: 66, passing: 73, dribbling: 74, defending: 69, physical: 72, height: 176, weight: 70, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Marco Bissouma", team: "Tottenham", league: "Eredivisie", nation: "Mali", position: "CDM", overall: 73, pace: 77, shooting: 65, passing: 74, dribbling: 74, defending: 77, physical: 80, height: 188, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },

  // LIGA PORTUGAL - 19 players
  { name: "Óscar Bobb", team: "Benfica", league: "Liga Portugal", nation: "Norway", position: "RW", overall: 71, pace: 82, shooting: 71, passing: 71, dribbling: 78, defending: 38, physical: 69, height: 177, weight: 71, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Gonçalo Ramos", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "ST", overall: 72, pace: 81, shooting: 76, passing: 69, dribbling: 75, defending: 36, physical: 76, height: 185, weight: 79, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Florentino Luís", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CDM", overall: 71, pace: 71, shooting: 64, passing: 72, dribbling: 71, defending: 76, physical: 78, height: 187, weight: 80, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Alejandro Balde", team: "Barcelona", league: "Liga Portugal", nation: "Spain", position: "LB", overall: 70, pace: 80, shooting: 51, passing: 68, dribbling: 73, defending: 70, physical: 71, height: 177, weight: 69, preferredFoot: "left", weakFoot: 3, skillMoves: 2 },
  { name: "António Silva", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CB", overall: 71, pace: 76, shooting: 43, passing: 68, dribbling: 67, defending: 79, physical: 81, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Odysseas Vlachodimos", team: "Benfica", league: "Liga Portugal", nation: "Greece", position: "GK", overall: 72, diving: 73, handling: 72, kicking: 73, positioningGk: 72, reflexes: 74, pace: 51, physical: 72, height: 190, weight: 86, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Sofiane Diop", team: "Monaco", league: "Liga Portugal", nation: "France", position: "CM", overall: 70, pace: 76, shooting: 68, passing: 72, dribbling: 74, defending: 66, physical: 70, height: 180, weight: 73, preferredFoot: "right", weakFoot: 3, skillMoves: 3 },
  { name: "Nélson Semedo", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "RB", overall: 70, pace: 76, shooting: 60, passing: 71, dribbling: 73, defending: 74, physical: 71, height: 177, weight: 71, preferredFoot: "right", weakFoot: 2, skillMoves: 2 },
  { name: "Ruben Dias", team: "Benfica", league: "Liga Portugal", nation: "Portugal", position: "CB", overall: 70, pace: 71, shooting: 41, passing: 67, dribbling: 65, defending: 79, physical: 81, height: 189, weight: 85, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "David Neres", team: "Benfica", league: "Liga Portugal", nation: "Brazil", position: "LW", overall: 72, pace: 84, shooting: 72, passing: 71, dribbling: 81, defending: 35, physical: 68, height: 176, weight: 70, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Zeki Çelik", team: "Roma", league: "Liga Portugal", nation: "Turkey", position: "RB", overall: 71, pace: 77, shooting: 62, passing: 70, dribbling: 72, defending: 75, physical: 74, height: 177, weight: 72, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Iván Fresneda", team: "Real Valladolid", league: "Liga Portugal", nation: "Spain", position: "RB", overall: 70, pace: 78, shooting: 59, passing: 68, dribbling: 71, defending: 74, physical: 73, height: 181, weight: 74, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ljubomir Fejsa", team: "Benfica", league: "Liga Portugal", nation: "Serbia", position: "CDM", overall: 70, pace: 65, shooting: 61, passing: 71, dribbling: 69, defending: 77, physical: 79, height: 185, weight: 81, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Diogo Costa", team: "FC Porto", league: "Liga Portugal", nation: "Portugal", position: "GK", overall: 71, diving: 72, handling: 71, kicking: 72, positioningGk: 71, reflexes: 73, pace: 50, physical: 71, height: 189, weight: 84, preferredFoot: "right", weakFoot: 2, skillMoves: 1 },
  { name: "Wenderson Galeno", team: "FC Porto", league: "Liga Portugal", nation: "Brazil", position: "LW", overall: 71, pace: 83, shooting: 72, passing: 70, dribbling: 79, defending: 36, physical: 70, height: 175, weight: 69, preferredFoot: "left", weakFoot: 3, skillMoves: 4 },
  { name: "Vitinha", team: "Paris Saint-Germain", league: "Liga Portugal", nation: "Portugal", position: "CM", overall: 73, pace: 75, shooting: 68, passing: 79, dribbling: 78, defending: 70, physical: 73, height: 180, weight: 73, preferredFoot: "right", weakFoot: 4, skillMoves: 3 },
  { name: "João Palhinha", team: "Fulham", league: "Liga Portugal", nation: "Portugal", position: "CDM", overall: 72, pace: 71, shooting: 66, passing: 72, dribbling: 71, defending: 78, physical: 81, height: 188, weight: 84, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
  { name: "Ricardo Horta", team: "Braga", league: "Liga Portugal", nation: "Portugal", position: "LW", overall: 71, pace: 80, shooting: 71, passing: 72, dribbling: 76, defending: 38, physical: 69, height: 176, weight: 71, preferredFoot: "left", weakFoot: 3, skillMoves: 3 },
  { name: "Bruno Gonzales", team: "Arouca", league: "Liga Portugal", nation: "Argentina", position: "CM", overall: 69, pace: 70, shooting: 65, passing: 71, dribbling: 70, defending: 72, physical: 75, height: 183, weight: 77, preferredFoot: "right", weakFoot: 3, skillMoves: 2 },
];

async function seedSilverPlayers() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    // Ensure cardQuality is set on all players
    const enrichedPlayers = silverPlayers.map(p => ({
      ...p,
      cardQuality: p.cardQuality || getCardQuality(p.overall),
    }));

    console.log(`⚽ Importing ${enrichedPlayers.length} SILVER tier players...`);

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
      GROUP BY cardQuality
      ORDER BY FIELD(cardQuality, 'bronze', 'silver', 'gold', 'elite')
    `);

    const [silverStats] = await connection.query(`
      SELECT
        league,
        COUNT(*) as count,
        AVG(overall) as avgOvr,
        MIN(overall) as minOvr,
        MAX(overall) as maxOvr
      FROM players
      WHERE cardQuality = 'silver'
      GROUP BY league
      ORDER BY count DESC
    `);

    console.log("\n✅ Silver tier import complete!");
    console.log("\n📊 Overall Card Quality Distribution:");
    console.table(stats);
    console.log("\n📊 Silver Tier By League:");
    console.table(silverStats);

    await connection.end();
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seedSilverPlayers();
