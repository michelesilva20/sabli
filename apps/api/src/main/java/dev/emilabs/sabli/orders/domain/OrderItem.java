package dev.emilabs.sabli.orders.domain;

import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import dev.emilabs.sabli.catalog.domain.ProductKind;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_items")
public class OrderItem {

  @Id
  private UUID id;

  @Column(name = "order_id", nullable = false)
  private UUID orderId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ProductKind kind;

  @Column(name = "product_id")
  private UUID productId;

  @Column(name = "product_name", nullable = false)
  private String productName;

  @Column(name = "variant_id")
  private UUID variantId;

  @Column(name = "variant_name", nullable = false)
  private String variantName;

  @Column(nullable = false)
  private int quantity;

  @Column(name = "unit_price_cents", nullable = false)
  private int unitPriceCents;

  @Column(name = "line_total_cents", nullable = false)
  private int lineTotalCents;

  @Column(nullable = false)
  private String notes;

  @Column(name = "pizza_size_id")
  private UUID pizzaSizeId;

  @Column(name = "pizza_size_code")
  private String pizzaSizeCode;

  @Column(name = "pizza_size_name")
  private String pizzaSizeName;

  @Enumerated(EnumType.STRING)
  @Column(name = "pizza_strategy")
  private PricingStrategy pizzaStrategy;

  @Column(name = "pizza_crust_id")
  private UUID pizzaCrustId;

  @Column(name = "pizza_crust_name")
  private String pizzaCrustName;

  @Column(name = "pizza_crust_cents")
  private Integer pizzaCrustCents;

  public static OrderItem standard(
      UUID orderId,
      UUID establishmentId,
      UUID organizationId,
      int sortOrder,
      UUID productId,
      String productName,
      UUID variantId,
      String variantName,
      int quantity,
      int unitPriceCents,
      String notes) {
    OrderItem item = base(orderId, establishmentId, organizationId, sortOrder, ProductKind.STANDARD);
    item.productId = productId;
    item.productName = productName;
    item.variantId = variantId;
    item.variantName = variantName;
    item.quantity = quantity;
    item.unitPriceCents = unitPriceCents;
    item.lineTotalCents = unitPriceCents * quantity;
    item.notes = notes == null ? "" : notes.trim();
    return item;
  }

  public static OrderItem pizza(
      UUID orderId,
      UUID establishmentId,
      UUID organizationId,
      int sortOrder,
      UUID productId,
      String productName,
      int quantity,
      int unitPriceCents,
      String notes,
      UUID sizeId,
      String sizeCode,
      String sizeName,
      PricingStrategy strategy,
      UUID crustId,
      String crustName,
      Integer crustCents) {
    OrderItem item = base(orderId, establishmentId, organizationId, sortOrder, ProductKind.PIZZA);
    item.productId = productId;
    item.productName = productName;
    item.variantName = sizeName;
    item.quantity = quantity;
    item.unitPriceCents = unitPriceCents;
    item.lineTotalCents = unitPriceCents * quantity;
    item.notes = notes == null ? "" : notes.trim();
    item.pizzaSizeId = sizeId;
    item.pizzaSizeCode = sizeCode;
    item.pizzaSizeName = sizeName;
    item.pizzaStrategy = strategy;
    item.pizzaCrustId = crustId;
    item.pizzaCrustName = crustName;
    item.pizzaCrustCents = crustCents;
    return item;
  }

  private static OrderItem base(
      UUID orderId, UUID establishmentId, UUID organizationId, int sortOrder, ProductKind kind) {
    OrderItem item = new OrderItem();
    item.id = UUID.randomUUID();
    item.orderId = orderId;
    item.establishmentId = establishmentId;
    item.organizationId = organizationId;
    item.sortOrder = sortOrder;
    item.kind = kind;
    return item;
  }

  public UUID id() {
    return id;
  }

  public UUID orderId() {
    return orderId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public int sortOrder() {
    return sortOrder;
  }

  public ProductKind kind() {
    return kind;
  }

  public UUID productId() {
    return productId;
  }

  public String productName() {
    return productName;
  }

  public UUID variantId() {
    return variantId;
  }

  public String variantName() {
    return variantName;
  }

  public int quantity() {
    return quantity;
  }

  public int unitPriceCents() {
    return unitPriceCents;
  }

  public int lineTotalCents() {
    return lineTotalCents;
  }

  public String notes() {
    return notes;
  }

  public UUID pizzaSizeId() {
    return pizzaSizeId;
  }

  public String pizzaSizeCode() {
    return pizzaSizeCode;
  }

  public String pizzaSizeName() {
    return pizzaSizeName;
  }

  public PricingStrategy pizzaStrategy() {
    return pizzaStrategy;
  }

  public UUID pizzaCrustId() {
    return pizzaCrustId;
  }

  public String pizzaCrustName() {
    return pizzaCrustName;
  }

  public Integer pizzaCrustCents() {
    return pizzaCrustCents;
  }
}
