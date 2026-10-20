package dev.emilabs.sabli.billing.domain;

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
@Table(name = "bills")
public class Bill {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BillKind kind;

  @Column(name = "table_id")
  private UUID tableId;

  @Column(name = "table_service_id")
  private UUID tableServiceId;

  @Column(name = "order_id")
  private UUID orderId;

  @Column(name = "subtotal_cents", nullable = false)
  private int subtotalCents;

  @Column(name = "discount_cents", nullable = false)
  private int discountCents;

  @Column(name = "total_cents", nullable = false)
  private int totalCents;

  @Column(name = "paid_cents", nullable = false)
  private int paidCents;

  @Column(name = "remaining_cents", nullable = false)
  private int remainingCents;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BillStatus status;

  @Column(name = "settled_at")
  private Instant settledAt;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static Bill openTable(
      UUID establishmentId,
      UUID organizationId,
      UUID tableId,
      UUID tableServiceId,
      int subtotalCents,
      int discountCents,
      int totalCents) {
    Bill bill = base(establishmentId, organizationId, BillKind.TABLE, subtotalCents, discountCents, totalCents);
    bill.tableId = tableId;
    bill.tableServiceId = tableServiceId;
    return bill;
  }

  public static Bill openCounter(
      UUID establishmentId, UUID organizationId, UUID orderId, int subtotalCents, int discountCents, int totalCents) {
    Bill bill = base(establishmentId, organizationId, BillKind.COUNTER, subtotalCents, discountCents, totalCents);
    bill.orderId = orderId;
    return bill;
  }

  private static Bill base(
      UUID establishmentId,
      UUID organizationId,
      BillKind kind,
      int subtotalCents,
      int discountCents,
      int totalCents) {
    Bill bill = new Bill();
    bill.id = UUID.randomUUID();
    bill.establishmentId = establishmentId;
    bill.organizationId = organizationId;
    bill.kind = kind;
    bill.replaceTotals(subtotalCents, discountCents, totalCents, 0);
    return bill;
  }

  @PrePersist
  void onCreate() {
    Instant now = now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    updatedAt = now();
  }

  public void refreshTotals(int subtotalCents, int discountCents, int totalCents) {
    if (paidCents > 0) {
      return;
    }
    replaceTotals(subtotalCents, discountCents, totalCents, paidCents);
  }

  public void applyPaid(int paidCents) {
    replaceTotals(subtotalCents, discountCents, totalCents, paidCents);
  }

  private void replaceTotals(int subtotalCents, int discountCents, int totalCents, int paidCents) {
    this.subtotalCents = subtotalCents;
    this.discountCents = discountCents;
    this.totalCents = totalCents;
    this.paidCents = paidCents;
    this.remainingCents = totalCents - paidCents;
    if (remainingCents == 0) {
      status = BillStatus.SETTLED;
      if (settledAt == null) {
        settledAt = now();
      }
    } else if (paidCents > 0) {
      status = BillStatus.PARTIALLY_PAID;
      settledAt = null;
    } else {
      status = BillStatus.OPEN;
      settledAt = null;
    }
  }

  private static Instant now() {
    return Instant.now().truncatedTo(ChronoUnit.MICROS);
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

  public BillKind kind() {
    return kind;
  }

  public UUID tableId() {
    return tableId;
  }

  public UUID tableServiceId() {
    return tableServiceId;
  }

  public UUID orderId() {
    return orderId;
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

  public int paidCents() {
    return paidCents;
  }

  public int remainingCents() {
    return remainingCents;
  }

  public BillStatus status() {
    return status;
  }

  public Instant settledAt() {
    return settledAt;
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

  public boolean paymentStarted() {
    return paidCents > 0;
  }

  public boolean isSettled() {
    return status.isSettled();
  }
}
