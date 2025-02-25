import type { Knex } from "knex";

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './dev.sqlite3'
    },
    migrations: {
      directory: './migrations'
    },
    // For SQLite, this prevents warnings about default values
    useNullAsDefault: true,
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: './migrations'
    }
  }
};

export default knexConfig;