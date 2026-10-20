package dev.emilabs.sabli.orders.domain;

import dev.emilabs.sabli.kitchen.domain.ProductionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "table_id")
  private UUID tableId;

  @Column(name = "table_service_id")
  private UUID tableServiceId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private OrderChannel channel;

  @Column(nullable = false)
  private int number;

  @Column(name = "placed_by_user_id", nullable = false)
  private UUID placedByUserId;

  @Column(name = "placed_by_name", nullable = false)
  private String placedByName;

  @Column(nullable = false)
  private String notes;

  @Column(name = "subtotal_cents", nullable = false)
  private int subtotalCents;

  @Column(name = "discount_cents", nullable = false)
  private int discountCents;

  @Column(name = "total_cents", nullable = false)
  private int totalCents;

  @Enumerated(EnumType.STRING)
  @Column(name = "commercial_status", nullable = false)
  private CommercialStatus commercialStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "production_status", nullable = false)
  private ProductionStatus productionStatus;

  @Column(name = "idempotency_key", nullable = false)
  private String idempotencyKey;

  @Column(name = "idempotency_hash", nullable = false)
  private String idempotencyHash;

  @Column(name = "placed_at", nullable = false)
  private Instant placedAt;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static Order confirm(
      UUID establishmentId,
      UUID organizationId,
      OrderChannel channel,
      UUID tableId,
      UUID tableServiceId,
      int number,
      UUID placedByUserId,
      String placedByName,
      String notes,
      int subtotalCents,
      String idempotencyKey,
      String idempotencyHash) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    Order order = new Order();
    order.id = UUID.randomUUID();
    order.establishmentId = establishmentId;
    order.organizationId = organizationId;
    order.channel = channel;
    order.tableId = tableId;
    order.tableServiceId = tableServiceId;
    order.number = number;
    order.placedByUserId = placedByUserId;
    order.placedByName = placedByName;
    order.notes = notes == null ? "" : notes.trim();
    order.subtotalCents = subtotalCents;
    order.discountCents = 0;
    order.totalCents = subtotalCents;
    order.commercialStatus = CommercialStatus.CONFIRMED;
    order.productionStatus = ProductionStatus.WAITING;
    order.idempotencyKey = idempotencyKey;
    order.idempotencyHash = idempotencyHash;
    order.placedAt = now;
    return order;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
  }

  public UUID id() {
    return id;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public UUID tableId() {
    return tableId;
  }

  public UUID tableServiceId() {
    return tableServiceId;
  }

  public OrderChannel channel() {
    return channel;
  }

  public int number() {
    return number;
  }

  public UUID placedByUserId() {
    return placedByUserId;
  }

  public String placedByName() {
    return placedByName;
  }

  public String notes() {
    return notes;
  }

  public int subtotalCents() {
    return subtotalCents;
  }

  public int discountCents() {
    return discountCents;
  }

  public int totalCents() {
    return totalCents;
  }

  public CommercialStatus commercialStatus() {
    return commercialStatus;
  }

  public ProductionStatus productionStatus() {
    return productionStatus;
  }

  public String idempotencyKey() {
    return idempotencyKey;
  }

  public String idempotencyHash() {
    return idempotencyHash;
  }

  public Instant placedAt() {
    return placedAt;
  }

  public int version() {
    return version;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public Instant updatedAt() {
    return updatedAt;
  }

  public void syncProduction(ProductionStatus status) {
    this.productionStatus = status;
  }
}
