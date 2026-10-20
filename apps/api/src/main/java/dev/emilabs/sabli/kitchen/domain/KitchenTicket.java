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
@Table(name = "kitchen_tickets")
public class KitchenTicket {

  @Id
  private UUID id;

  @Column(name = "order_id", nullable = false)
  private UUID orderId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private int number;

  @Column(nullable = false)
  private String origin;

  @Enumerated(EnumType.STRING)
  @Column(name = "production_status", nullable = false)
  private ProductionStatus productionStatus;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TicketPriority priority;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static KitchenTicket open(
      UUID orderId, UUID establishmentId, UUID organizationId, int number, String origin) {
    KitchenTicket ticket = new KitchenTicket();
    ticket.id = UUID.randomUUID();
    ticket.orderId = orderId;
    ticket.establishmentId = establishmentId;
    ticket.organizationId = organizationId;
    ticket.number = number;
    ticket.origin = origin;
    ticket.productionStatus = ProductionStatus.WAITING;
    ticket.priority = TicketPriority.NORMAL;
    return ticket;
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

  public UUID orderId() {
    return orderId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public int number() {
    return number;
  }

  public String origin() {
    return origin;
  }

  public ProductionStatus productionStatus() {
    return productionStatus;
  }

  public TicketPriority priority() {
    return priority;
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
