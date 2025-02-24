// db.ts
import knex from "knex";
import knexConfig from "../knexfile";

// Select the proper config based on NODE_ENV, defaulting to 'development'
const environment = process.env.NODE_ENV || "development";
const config = knexConfig[environment];

const db = knex(config);

export default db;
