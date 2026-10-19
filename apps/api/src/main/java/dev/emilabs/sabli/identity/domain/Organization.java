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
@Table(name = "organizations")
public class Organization {

  @Id
  private UUID id;

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

  public static Organization create(String name, String slug) {
    Organization organization = new Organization();
    organization.id = UUID.randomUUID();
    organization.name = name;
    organization.slug = slug;
    organization.status = TenantStatus.ACTIVE;
    return organization;
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
