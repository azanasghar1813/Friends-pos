export default {
  version: '048',
  name: 'add_order_items_product_index',
  
  up: (db) => {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
      ON order_items(product_id);

      CREATE INDEX IF NOT EXISTS idx_order_timeline_order_created 
      ON order_timeline(order_id, created_at);

      CREATE INDEX IF NOT EXISTS idx_cashier_sessions_status 
      ON cashier_sessions(status);
    `);
  },

  down: (db) => {
    db.exec(`
      DROP INDEX IF EXISTS idx_order_items_product_id;
      DROP INDEX IF EXISTS idx_order_timeline_order_created;
      DROP INDEX IF EXISTS idx_cashier_sessions_status;
    `);
  }
};
