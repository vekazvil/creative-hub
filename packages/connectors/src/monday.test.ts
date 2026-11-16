import { describe, expect, it } from 'vitest';

import { assertNotDestructive } from './monday';

describe('Monday: never delete', () => {
  it.each([
    'mutation { delete_item(item_id: 1) { id } }',
    'mutation Clean($id: ID!) { archive_board(board_id: $id) { id } }',
    'mutation { clear_item_updates(item_id: 1) { id } }',
    'mutation{delete_group (board_id: 1, group_id: "x") { id }}',
    '# note\nmutation { remove_mock_app_subscription(app_id: 1, partial_signing_secret: "x") { id } }',
    'mutation { delete_column(board_id: 1, column_id: "x") { id } }',
  ])('refuses %s', (q) => {
    expect(() => assertNotDestructive(q)).toThrow(/never deletes/);
  });

  it.each([
    'query { me { name } boards(limit: 5) { id name } }',
    'mutation { create_item(board_id: 1, item_name: "LC.07") { id } }',
    'mutation { change_column_value(board_id: 1, item_id: 2, column_id: "status", value: "{}") { id } }',
  ])('allows %s', (q) => {
    expect(() => assertNotDestructive(q)).not.toThrow();
  });
});
