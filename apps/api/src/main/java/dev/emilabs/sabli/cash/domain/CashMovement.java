package dev.emilabs.sabli.cash.domain;

import dev.emilabs.sabli.billing.domain.PaymentMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "cash_movements")
public class CashMovement {

  @Id
  private UUID id;

  @Column(name = "cash_session_id", nullable = false)
  private UUID cashSessionId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CashMovementType type;

  @Enumerated(EnumType.STRING)
  private PaymentMethod method;

  @Column(name = "amount_cents", nullable = false)
  private int amountCents;

  @Column(name = "payment_id")
  private UUID paymentId;

  @Column(name = "recorded_by_user_id", nullable = false)
  private UUID recordedByUserId;

  @Column(name = "recorded_by_name", nullable = false)
  private String recordedByName;

  @Column(nullable = false)
  private String notes;

  @Column(name = "recorded_at", nullable = false)
  private Instant recordedAt;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static CashMovement opening(
      UUID cashSessionId,
      UUID establishmentId,
      UUID organizationId,
      int amountCents,
      UUID recordedByUserId,
      String recordedByName) {
    return create(
        cashSessionId,
        establishmentId,
        organizationId,
        CashMovementType.OPENING,
        null,
        amountCents,
        null,
        recordedByUserId,
        recordedByName,
        "Fundo de troco");
  }

  public static CashMovement sale(
      UUID cashSessionId,
      UUID establishmentId,
      UUID organizationId,
      PaymentMethod method,
      int appliedCents,
      UUID paymentId,
      UUID recordedByUserId,
      String recordedByName) {
    return create(
        cashSessionId,
        establishmentId,
        organizationId,
        CashMovementType.SALE,
        method,
        appliedCents,
        paymentId,
        recordedByUserId,
        recordedByName,
        "Pagamento informado");
  }

  public static CashMovement supply(
      UUID cashSessionId,
      UUID establishmentId,
      UUID organizationId,
      int amountCents,
      UUID recordedByUserId,
      String recordedByName,
      String notes) {
    return create(
        cashSessionId,
        establishmentId,
        organizationId,
        CashMovementType.SUPPLY,
        null,
        amountCents,
        null,
        recordedByUserId,
        recordedByName,
        notes);
  }

  public static CashMovement bleed(
      UUID cashSessionId,
      UUID establishmentId,
      UUID organizationId,
      int amountCents,
      UUID recordedByUserId,
      String recordedByName,
      String notes) {
    return create(
        cashSessionId,
        establishmentId,
        organizationId,
        CashMovementType.BLEED,
        null,
        amountCents,
        null,
        recordedByUserId,
        recordedByName,
        notes);
  }

  private static CashMovement create(
      UUID cashSessionId,
      UUID establishmentId,
      UUID organizationId,
      CashMovementType type,
      PaymentMethod method,
      int amountCents,
      UUID paymentId,
      UUID recordedByUserId,
      String recordedByName,
      String notes) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    CashMovement movement = new CashMovement();
    movement.id = UUID.randomUUID();
    movement.cashSessionId = cashSessionId;
    movement.establishmentId = establishmentId;
    movement.organizationId = organizationId;
    movement.type = type;
    movement.method = method;
    movement.amountCents = amountCents;
    movement.paymentId = paymentId;
    movement.recordedByUserId = recordedByUserId;
    movement.recordedByName = recordedByName;
    movement.notes = notes == null ? "" : notes.trim();
    movement.recordedAt = now;
    return movement;
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

  public UUID cashSessionId() {
    return cashSessionId;
  }

  public CashMovementType type() {
    return type;
  }

  public PaymentMethod method() {
    return method;
  }

  public int amountCents() {
    return amountCents;
  }

  public UUID paymentId() {
    return paymentId;
  }

  public UUID recordedByUserId() {
    return recordedByUserId;
  }

  public String recordedByName() {
    return recordedByName;
  }

  public String notes() {
    return notes;
  }

  public Instant recordedAt() {
    return recordedAt;
  }
}
