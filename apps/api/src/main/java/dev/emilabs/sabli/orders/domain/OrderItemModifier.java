package dev.emilabs.sabli.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_item_modifiers")
public class OrderItemModifier {

  @Id
  private UUID id;

  @Column(name = "item_id", nullable = false)
  private UUID itemId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(nullable = false)
  private int position;

  @Column(name = "extra_id")
  private UUID extraId;

  @Column(name = "extra_name", nullable = false)
  private String extraName;

  @Column(name = "price_cents", nullable = false)
  private int priceCents;

  public static OrderItemModifier snapshot(
      UUID itemId, UUID establishmentId, int position, UUID extraId, String extraName, int priceCents) {
    OrderItemModifier modifier = new OrderItemModifier();
    modifier.id = UUID.randomUUID();
    modifier.itemId = itemId;
    modifier.establishmentId = establishmentId;
    modifier.position = position;
    modifier.extraId = extraId;
    modifier.extraName = extraName;
    modifier.priceCents = priceCents;
    return modifier;
  }

  public UUID id() {
    return id;
  }

  public UUID itemId() {
    return itemId;
  }

  public int position() {
    return position;
  }

  public UUID extraId() {
    return extraId;
  }

  public String extraName() {
    return extraName;
  }

  public int priceCents() {
    return priceCents;
  }
}
