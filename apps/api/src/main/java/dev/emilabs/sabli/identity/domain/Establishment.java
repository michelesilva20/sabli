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
@Table(name = "establishments")
public class Establishment {

  @Id
  private UUID id;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(nullable = false)
  private String name;

  @Column(nullable = false)
  private String slug;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private TenantStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static Establishment create(UUID organizationId, String name, String slug) {
    Establishment establishment = new Establishment();
    establishment.id = UUID.randomUUID();
    establishment.organizationId = organizationId;
    establishment.name = name;
    establishment.slug = slug;
    establishment.status = TenantStatus.ACTIVE;
    return establishment;
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

  public String name() {
    return name;
  }

  public String slug() {
    return slug;
  }

  public TenantStatus status() {
    return status;
  }

  public Instant createdAt() {
    return createdAt;
  }

  public void changeStatus(TenantStatus status) {
    this.status = status;
  }

  public boolean isOperational() {
    return status == TenantStatus.ACTIVE;
  }
}
