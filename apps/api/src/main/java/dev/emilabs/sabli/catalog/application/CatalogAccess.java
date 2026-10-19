package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.identity.application.TenantAuthorizer;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CatalogAccess {

  private final TenantAuthorizer authorizer;

  public CatalogAccess(TenantAuthorizer authorizer) {
    this.authorizer = authorizer;
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return authorizer.requireOperationalEstablishment(userId, establishmentId).establishment();
  }

  public Establishment requireWrite(UUID userId, UUID establishmentId) {
    return authorizer
        .requireEstablishmentManager(userId, establishmentId, EstablishmentRole.MANAGER)
        .establishment();
  }
}
