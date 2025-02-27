exports.up = function(knex) {
  return knex.schema
    .createTable('user_active_deck', function(table) {
      table.text('user_id').primary();
      table.text('deck_id').notNullable();
    })
    .createTable('user_decks', function(table) {
      table.text('user_id').notNullable();
      table.text('deck_id').primary();
      table.text('deck_name').notNullable();
      // Use a JSON column for deck so it works with both SQLite and PostgreSQL.
      table.json('deck').notNullable();
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_decks')
    .dropTableIfExists('user_active_deck');
};
