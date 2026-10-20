package dev.emilabs.sabli.orders.application;

import dev.emilabs.sabli.identity.application.TenantAuthorizer;
import dev.emilabs.sabli.identity.domain.Establishment;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class OrderAccess {

  private final TenantAuthorizer authorizer;

  public OrderAccess(TenantAuthorizer authorizer) {
    this.authorizer = authorizer;
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return authorizer.requireOperationalEstablishment(userId, establishmentId).establishment();
  }

  public Establishment requirePlace(UUID userId, UUID establishmentId) {
    return authorizer.requireEstablishmentOperator(userId, establishmentId).establishment();
  }

  public Establishment requireKitchen(UUID userId, UUID establishmentId) {
    return authorizer.requireKitchenOperator(userId, establishmentId).establishment();
  }
}
