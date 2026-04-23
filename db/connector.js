import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
const createTableQueries = [];
createTableQueries.push(`CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT,
    importance INTEGER DEFAULT 0 CHECK (importance >= 0 AND importance <= 10),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
        `);
for await (const query of createTableQueries) {
    try {
        console.log(query.slice(0, query.indexOf('(')).trim() + "...")
        await pool.query(query);
    } catch (err) {
        console.error("query execution error: ", err.message);
    }
}

console.log("CONNECTED!!!!!✅ ")
      
export default pool;
