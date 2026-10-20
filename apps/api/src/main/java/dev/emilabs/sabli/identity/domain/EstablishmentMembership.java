package dev.emilabs.sabli.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "establishment_memberships")
public class EstablishmentMembership {

  @Id
  private UUID id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private EstablishmentRole role;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private MembershipStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static EstablishmentMembership create(
      UUID establishmentId, UUID organizationId, UUID userId, EstablishmentRole role) {
    EstablishmentMembership membership = new EstablishmentMembership();
    membership.id = UUID.randomUUID();
    membership.establishmentId = establishmentId;
    membership.organizationId = organizationId;
    membership.userId = userId;
    membership.role = role;
    membership.status = MembershipStatus.ACTIVE;
    return membership;
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

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public UUID userId() {
    return userId;
  }

  public EstablishmentRole role() {
    return role;
  }

  public MembershipStatus status() {
    return status;
  }

  public boolean isActive() {
    return status == MembershipStatus.ACTIVE;
  }

  public void changeRole(EstablishmentRole role) {
    this.role = role;
  }

  public void revoke() {
    status = MembershipStatus.REVOKED;
  }

  public void restore(EstablishmentRole role) {
    this.role = role;
    this.status = MembershipStatus.ACTIVE;
  }
}
