package dev.emilabs.sabli.kitchen.domain;

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
@Table(name = "kitchen_ticket_items")
public class KitchenTicketItem {

  @Id
  private UUID id;

  @Column(name = "ticket_id", nullable = false)
  private UUID ticketId;

  @Column(name = "order_item_id", nullable = false)
  private UUID orderItemId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Enumerated(EnumType.STRING)
  @Column(name = "production_status", nullable = false)
  private ProductionStatus productionStatus;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static KitchenTicketItem waiting(
      UUID ticketId, UUID orderItemId, UUID establishmentId, UUID organizationId) {
    KitchenTicketItem item = new KitchenTicketItem();
    item.id = UUID.randomUUID();
    item.ticketId = ticketId;
    item.orderItemId = orderItemId;
    item.establishmentId = establishmentId;
    item.organizationId = organizationId;
    item.productionStatus = ProductionStatus.WAITING;
    return item;
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

  public UUID ticketId() {
    return ticketId;
  }

  public UUID orderItemId() {
    return orderItemId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public ProductionStatus productionStatus() {
    return productionStatus;
  }

  public int version() {
    return version;
  }

  public void advance() {
    ProductionStatus next = productionStatus.next();
    if (next == null) {
      throw new IllegalStateException("O item já foi entregue.");
    }
    productionStatus = next;
  }
}
