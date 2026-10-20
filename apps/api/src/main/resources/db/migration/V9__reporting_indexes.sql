CREATE INDEX idx_bill_payments_est_recorded
  ON bill_payments (establishment_id, recorded_at);

CREATE INDEX idx_orders_est_channel_placed
  ON orders (establishment_id, channel, placed_at);

CREATE INDEX idx_bills_est_remaining
  ON bills (establishment_id)
  WHERE remaining_cents > 0;

CREATE INDEX idx_order_items_est_product
  ON order_items (establishment_id, product_id);
