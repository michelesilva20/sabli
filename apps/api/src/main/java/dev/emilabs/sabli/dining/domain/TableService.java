package dev.emilabs.sabli.dining.domain;

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
@Table(name = "table_services")
public class TableService {

  @Id
  private UUID id;

  @Column(name = "table_id", nullable = false)
  private UUID tableId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "guest_count", nullable = false)
  private int guestCount;

  @Column(name = "opened_by_user_id", nullable = false)
  private UUID openedByUserId;

  @Column(name = "host_name", nullable = false)
  private String hostName;

  @Column(name = "opened_at", nullable = false)
  private Instant openedAt;

  @Column(name = "requested_bill_at")
  private Instant requestedBillAt;

  @Column(name = "closed_at")
  private Instant closedAt;

  @Column(name = "billing_started", nullable = false)
  private boolean billingStarted;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TableServiceStatus status;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static TableService open(
      UUID tableId,
      UUID establishmentId,
      UUID organizationId,
      int guestCount,
      UUID openedByUserId,
      String hostName) {
    Instant now = now();
    TableService service = new TableService();
    service.id = UUID.randomUUID();
    service.tableId = tableId;
    service.establishmentId = establishmentId;
    service.organizationId = organizationId;
    service.guestCount = guestCount;
    service.openedByUserId = openedByUserId;
    service.hostName = hostName;
    service.openedAt = now;
    service.status = TableServiceStatus.OPEN;
    service.billingStarted = false;
    return service;
  }

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = Instant.now();
  }

  public UUID id() {
    return id;
  }

  public UUID tableId() {
    return tableId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public int guestCount() {
    return guestCount;
  }

  public UUID openedByUserId() {
    return openedByUserId;
  }

  public String hostName() {
    return hostName;
  }

  public Instant openedAt() {
    return openedAt;
  }

  public Instant requestedBillAt() {
    return requestedBillAt;
  }

  public Instant closedAt() {
    return closedAt;
  }

  public TableServiceStatus status() {
    return status;
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

  public boolean isActive() {
    return status.isActive();
  }

  public void requestBill() {
    status = TableServiceStatus.AWAITING_BILL;
    requestedBillAt = now();
  }

  private static Instant now() {
    return Instant.now().truncatedTo(ChronoUnit.MICROS);
  }

  public void reopen() {
    status = TableServiceStatus.OPEN;
  }

  public boolean billingStarted() {
    return billingStarted;
  }

  public void markBillingStarted() {
    billingStarted = true;
  }

  public void close() {
    status = TableServiceStatus.CLOSED;
    closedAt = now();
  }
}
