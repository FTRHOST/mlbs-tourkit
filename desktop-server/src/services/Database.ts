import DatabaseConstructor, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'fs-extra';
import path from 'path';

export interface PlayerData {
    hero_id: number;
    name: string;
    kills: number;
    deaths: number;
    assists: number;
    gold: number;
    team: number;
}

export interface MatchData {
    timestamp: string;
    duration: number;
    winner_team: number;
    players: PlayerData[];
}

export class Database {
    private db: DatabaseType;

    constructor() {
        const dbPath = path.join(process.cwd(), 'database.sqlite');
        this.db = new DatabaseConstructor(dbPath);
        this.init();
    }

    private init(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                duration INTEGER,
                winner_team INTEGER
            );

            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                match_id INTEGER,
                hero_id INTEGER,
                name TEXT,
                kills INTEGER,
                deaths INTEGER,
                assists INTEGER,
                gold INTEGER,
                team INTEGER,
                FOREIGN KEY(match_id) REFERENCES matches(id)
            );
        `);
        console.log('Database initialized');
    }

    public saveMatch(data: any): void {
        // Adapt input data to MatchData structure if necessary
        // Assuming data structure matches what's needed or extracting it here

        // This relies on the JSON structure from the game.
        // Based on previous logs:
        // {"debug":{"game_state":...}, "data": { "room_info": ..., "battle_stats": ..., "logic_players": ... }}

        // We need to extract winner, duration, etc.
        // Since we don't have the exact mapping of "winner_team" from the provided JSON examples yet,
        // I will implement a basic extraction and try-catch block.

        try {
            const timestamp = new Date().toISOString();
            const duration = data.data?.battle_stats?.time || 0;
            // Placeholder for winner team logic
            const winner_team = 0;

            const insertMatch = this.db.prepare(`
                INSERT INTO matches (timestamp, duration, winner_team)
                VALUES (@timestamp, @duration, @winner_team)
            `);

            const insertPlayer = this.db.prepare(`
                INSERT INTO players (match_id, hero_id, name, kills, deaths, assists, gold, team)
                VALUES (@match_id, @hero_id, @name, @kills, @deaths, @assists, @gold, @team)
            `);

            const transaction = this.db.transaction((match, players) => {
                const info = insertMatch.run(match);
                const matchId = info.lastInsertRowid;

                for (const player of players) {
                    insertPlayer.run({
                        match_id: matchId,
                        hero_id: player.heroId || 0, // Mapping from logic_players/room_info
                        name: player.name || "Unknown",
                        kills: player.kill || 0,
                        deaths: player.death || 0,
                        assists: player.assist || 0,
                        gold: player.totalGold || 0,
                        team: player.camp || 0
                    });
                }
            });

            // Extract players from data.data.battle_players (if available) or logic_players
            // The previous C++ code populates `battlePlayers` which has kill/death/assist/gold
            const playersList = data.data?.battle_players || [];

            transaction({
                timestamp,
                duration,
                winner_team
            }, playersList);

            console.log('Match saved to database');

        } catch (err) {
            console.error('Failed to save match:', err);
        }
    }
}
