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
@Table(name = "organization_memberships")
public class OrganizationMembership {

  @Id
  private UUID id;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private OrganizationRole role;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private MembershipStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static OrganizationMembership create(UUID organizationId, UUID userId, OrganizationRole role) {
    OrganizationMembership membership = new OrganizationMembership();
    membership.id = UUID.randomUUID();
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

  public UUID organizationId() {
    return organizationId;
  }

  public UUID userId() {
    return userId;
  }

  public OrganizationRole role() {
    return role;
  }

  public MembershipStatus status() {
    return status;
  }

  public boolean isActive() {
    return status == MembershipStatus.ACTIVE;
  }

  public void changeRole(OrganizationRole role) {
    this.role = role;
  }

  public void revoke() {
    status = MembershipStatus.REVOKED;
  }

  public void restore(OrganizationRole role) {
    this.role = role;
    this.status = MembershipStatus.ACTIVE;
  }
}
