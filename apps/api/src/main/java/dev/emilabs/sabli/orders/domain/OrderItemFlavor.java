package dev.emilabs.sabli.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_item_pizza_flavors")
public class OrderItemFlavor {

  @Id
  private UUID id;

  @Column(name = "item_id", nullable = false)
  private UUID itemId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(nullable = false)
  private int position;

  @Column(name = "flavor_id")
  private UUID flavorId;

  @Column(name = "flavor_name", nullable = false)
  private String flavorName;

  @Column(name = "price_cents", nullable = false)
  private int priceCents;

  @Column(nullable = false)
  private int numerator;

  @Column(nullable = false)
  private int denominator;

  public static OrderItemFlavor snapshot(
      UUID itemId,
      UUID establishmentId,
      int position,
      UUID flavorId,
      String flavorName,
      int priceCents,
      int numerator,
      int denominator) {
    OrderItemFlavor flavor = new OrderItemFlavor();
    flavor.id = UUID.randomUUID();
    flavor.itemId = itemId;
    flavor.establishmentId = establishmentId;
    flavor.position = position;
    flavor.flavorId = flavorId;
    flavor.flavorName = flavorName;
    flavor.priceCents = priceCents;
    flavor.numerator = numerator;
    flavor.denominator = denominator;
    return flavor;
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

  public UUID flavorId() {
    return flavorId;
  }

  public String flavorName() {
    return flavorName;
  }

  public int priceCents() {
    return priceCents;
  }

  public int numerator() {
    return numerator;
  }

  public int denominator() {
    return denominator;
  }
}
