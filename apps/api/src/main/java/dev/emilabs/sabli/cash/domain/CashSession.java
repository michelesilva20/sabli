package dev.emilabs.sabli.cash.domain;

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
@Table(name = "cash_sessions")
public class CashSession {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CashScope scope;

  @Column(name = "opened_by_user_id", nullable = false)
  private UUID openedByUserId;

  @Column(name = "opened_by_name", nullable = false)
  private String openedByName;

  @Column(name = "opening_float_cents", nullable = false)
  private int openingFloatCents;

  @Column(nullable = false)
  private String notes;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CashSessionStatus status;

  @Column(name = "opened_at", nullable = false)
  private Instant openedAt;

  @Column(name = "closed_at")
  private Instant closedAt;

  @Column(name = "closed_by_user_id")
  private UUID closedByUserId;

  @Column(name = "closed_by_name")
  private String closedByName;

  @Column(name = "expected_cash_cents", nullable = false)
  private int expectedCashCents;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static CashSession open(
      UUID establishmentId,
      UUID organizationId,
      UUID openedByUserId,
      String openedByName,
      int openingFloatCents,
      String notes) {
    Instant now = Instant.now().truncatedTo(ChronoUnit.MICROS);
    CashSession session = new CashSession();
    session.id = UUID.randomUUID();
    session.establishmentId = establishmentId;
    session.organizationId = organizationId;
    session.scope = CashScope.ESTABLISHMENT;
    session.openedByUserId = openedByUserId;
    session.openedByName = openedByName;
    session.openingFloatCents = openingFloatCents;
    session.notes = notes == null ? "" : notes.trim();
    session.status = CashSessionStatus.OPEN;
    session.openedAt = now;
    session.expectedCashCents = openingFloatCents;
    return session;
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

  public void syncExpectedCash(int expectedCashCents) {
    this.expectedCashCents = expectedCashCents;
  }

  public void close(UUID closedByUserId, String closedByName, int expectedCashCents) {
    this.status = CashSessionStatus.CLOSED;
    this.closedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    this.closedByUserId = closedByUserId;
    this.closedByName = closedByName;
    this.expectedCashCents = expectedCashCents;
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

  public CashScope scope() {
    return scope;
  }

  public UUID openedByUserId() {
    return openedByUserId;
  }

  public String openedByName() {
    return openedByName;
  }

  public int openingFloatCents() {
    return openingFloatCents;
  }

  public String notes() {
    return notes;
  }

  public CashSessionStatus status() {
    return status;
  }

  public Instant openedAt() {
    return openedAt;
  }

  public Instant closedAt() {
    return closedAt;
  }

  public UUID closedByUserId() {
    return closedByUserId;
  }

  public String closedByName() {
    return closedByName;
  }

  public int expectedCashCents() {
    return expectedCashCents;
  }

  public int version() {
    return version;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public boolean isOpen() {
    return status == CashSessionStatus.OPEN;
  }
}
