package dev.emilabs.sabli.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "order_counters")
public class OrderCounter {

  @Id
  @Column(name = "establishment_id")
  private UUID establishmentId;

  @Column(name = "organization_id", nullable = false)
  private UUID organizationId;

  @Column(name = "last_number", nullable = false)
  private int lastNumber;

  public static OrderCounter start(UUID establishmentId, UUID organizationId) {
    OrderCounter counter = new OrderCounter();
    counter.establishmentId = establishmentId;
    counter.organizationId = organizationId;
    counter.lastNumber = 0;
    return counter;
  }

  public int next() {
    lastNumber += 1;
    return lastNumber;
  }

  public UUID establishmentId() {
    return establishmentId;
  }

  public int lastNumber() {
    return lastNumber;
  }
}
