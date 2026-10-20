package dev.emilabs.sabli.billing.application;

import dev.emilabs.sabli.identity.application.TenantAuthorizer;
import dev.emilabs.sabli.identity.domain.Establishment;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class BillingAccess {

  private final TenantAuthorizer authorizer;

  public BillingAccess(TenantAuthorizer authorizer) {
    this.authorizer = authorizer;
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return authorizer.requireEstablishmentOperator(userId, establishmentId).establishment();
  }

  public Establishment requireFinance(UUID userId, UUID establishmentId) {
    return authorizer.requireFinanceOperator(userId, establishmentId).establishment();
  }
}
