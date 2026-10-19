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
@Table(name = "bill_payments")
public class BillPayment {

  @Id
  private UUID id;

  @Column(name = "bill_id", nullable = false)
  private UUID billId;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "cash_session_id", nullable = false)
  private UUID cashSessionId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PaymentMethod method;

  @Enumerated(EnumType.STRING)
  @Column(name = "capture_kind", nullable = false)
  private PaymentCaptureKind captureKind;

  @Column(name = "tendered_cents", nullable = false)
  private int tenderedCents;

  @Column(name = "applied_cents", nullable = false)
  private int appliedCents;

  @Column(name = "change_cents", nullable = false)
  private int changeCents;

  @Column(name = "recorded_by_user_id", nullable = false)
  private UUID recordedByUserId;

  @Column(name = "recorded_by_name", nullable = false)
  private String recordedByName;

  @Column(nullable = false)
  private String notes;

  @Column(name = "idempotency_key", nullable = false)
  private String idempotencyKey;

  @Column(name = "idempotency_hash", nullable = false)
  private String idempotencyHash;

  @Column(name = "recorded_at", nullable = false)
  private Instant recordedAt;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static BillPayment record(
      UUID billId,
      UUID establishmentId,
      UUID organizationId,
      UUID cashSessionId,
      PaymentMethod method,
      Tender.Result tender,
      UUID recordedByUserId,
      String recordedByName,
      String notes,
      String idempotencyKey,
      String idempotencyHash) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    BillPayment payment = new BillPayment();
    payment.id = UUID.randomUUID();
    payment.billId = billId;
    payment.establishmentId = establishmentId;
    payment.organizationId = organizationId;
    payment.cashSessionId = cashSessionId;
    payment.method = method;
    payment.captureKind = PaymentCaptureKind.MANUAL_DECLARED;
    payment.tenderedCents = tender.tenderedCents();
    payment.appliedCents = tender.appliedCents();
    payment.changeCents = tender.changeCents();
    payment.recordedByUserId = recordedByUserId;
    payment.recordedByName = recordedByName;
    payment.notes = notes == null ? "" : notes.trim();
    payment.idempotencyKey = idempotencyKey;
    payment.idempotencyHash = idempotencyHash;
    payment.recordedAt = now;
    return payment;
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

  public UUID billId() {
    return billId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID cashSessionId() {
    return cashSessionId;
  }

  public PaymentMethod method() {
    return method;
  }

  public PaymentCaptureKind captureKind() {
    return captureKind;
  }

  public int tenderedCents() {
    return tenderedCents;
  }

  public int appliedCents() {
    return appliedCents;
  }

  public int changeCents() {
    return changeCents;
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

  public String idempotencyKey() {
    return idempotencyKey;
  }

  public String idempotencyHash() {
    return idempotencyHash;
  }

  public Instant recordedAt() {
    return recordedAt;
  }

  public int version() {
    return version;
  }
}
