package dev.emilabs.sabli.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_sessions")
public class RefreshSession {

  @Id
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(name = "token_hash", nullable = false, length = 64)
  private String tokenHash;

  @Column(name = "family_id", nullable = false)
  private UUID familyId;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "replaced_by")
  private UUID replacedBy;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Transient
  private String rawToken;

  public static RefreshSession create(UUID userId, String tokenHash, UUID familyId, Instant expiresAt) {
    RefreshSession session = new RefreshSession();
    session.id = UUID.randomUUID();
    session.userId = userId;
    session.tokenHash = tokenHash;
    session.familyId = familyId;
    session.expiresAt = expiresAt;
    return session;
  }

  @PrePersist
  void onCreate() {
    createdAt = Instant.now();
  }

  public UUID id() {
    return id;
  }

  public UUID userId() {
    return userId;
  }

  public UUID familyId() {
    return familyId;
  }

  public Instant expiresAt() {
    return expiresAt;
  }

  public Instant revokedAt() {
    return revokedAt;
  }

  public UUID replacedBy() {
    return replacedBy;
  }

  public boolean isActive(Instant now) {
    return revokedAt == null && expiresAt.isAfter(now);
  }

  public void rotateTo(UUID replacementId, Instant now) {
    revokedAt = now;
    replacedBy = replacementId;
  }

  public void revoke(Instant now) {
    if (revokedAt == null) {
      revokedAt = now;
    }
  }

  public void attachRawToken(String rawToken) {
    this.rawToken = rawToken;
  }

  public String rawToken() {
    return rawToken;
  }
}
