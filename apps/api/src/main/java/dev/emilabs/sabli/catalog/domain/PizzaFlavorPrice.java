package dev.emilabs.sabli.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "pizza_flavor_prices")
public class PizzaFlavorPrice {

  @EmbeddedId
  private Id id;

  @Column(name = "establishment_id", nullable = false)
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "price_cents", nullable = false)
  private int priceCents;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  public static PizzaFlavorPrice create(
      UUID flavorId, UUID sizeId, UUID establishmentId, UUID organizationId, int priceCents) {
    PizzaFlavorPrice price = new PizzaFlavorPrice();
    price.id = new Id(flavorId, sizeId);
    price.establishmentId = establishmentId;
    price.organizationId = organizationId;
    price.priceCents = priceCents;
    return price;
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

  public UUID flavorId() {
    return id.flavorId;
  }

  public UUID sizeId() {
    return id.sizeId;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public int priceCents() {
    return priceCents;
  }

  public void changePrice(int priceCents) {
    this.priceCents = priceCents;
  }

  public static class Id implements Serializable {
    @Column(name = "flavor_id")
    private UUID flavorId;

    @Column(name = "size_id")
    private UUID sizeId;

    public Id() {}

    public Id(UUID flavorId, UUID sizeId) {
      this.flavorId = flavorId;
      this.sizeId = sizeId;
    }

    @Override
    public boolean equals(Object other) {
      if (this == other) {
        return true;
      }
      if (!(other instanceof Id that)) {
        return false;
      }
      return Objects.equals(flavorId, that.flavorId) && Objects.equals(sizeId, that.sizeId);
    }

    @Override
    public int hashCode() {
      return Objects.hash(flavorId, sizeId);
    }
  }
}
