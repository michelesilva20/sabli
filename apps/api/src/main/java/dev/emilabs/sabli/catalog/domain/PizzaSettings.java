package dev.emilabs.sabli.catalog.domain;

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
import java.util.UUID;

@Entity
@Table(name = "pizza_settings")
public class PizzaSettings {

  @Id
  @Column(name = "establishment_id")
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PricingStrategy strategy;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static PizzaSettings create(UUID establishmentId, UUID organizationId, PricingStrategy strategy) {
    PizzaSettings settings = new PizzaSettings();
    settings.establishmentId = establishmentId;
    settings.organizationId = organizationId;
    settings.strategy = strategy;
    return settings;
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

  public UUID establishmentId() {
    return establishmentId;
  }

  public UUID organizationId() {
    return organizationId;
  }

  public PricingStrategy strategy() {
    return strategy;
  }

  public int version() {
    return version;
  }

  public void changeStrategy(PricingStrategy strategy) {
    this.strategy = strategy;
  }
}
