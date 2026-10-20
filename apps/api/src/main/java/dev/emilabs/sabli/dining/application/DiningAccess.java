package dev.emilabs.sabli.dining.application;

import dev.emilabs.sabli.identity.application.TenantAuthorizer;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class DiningAccess {

  private final TenantAuthorizer authorizer;

  public DiningAccess(TenantAuthorizer authorizer) {
    this.authorizer = authorizer;
  }

  public Establishment requireRead(UUID userId, UUID establishmentId) {
    return authorizer.requireOperationalEstablishment(userId, establishmentId).establishment();
  }

  public Establishment requireManage(UUID userId, UUID establishmentId) {
    return authorizer
        .requireEstablishmentManager(userId, establishmentId, EstablishmentRole.MANAGER)
        .establishment();
  }

  public Establishment requireOperate(UUID userId, UUID establishmentId) {
    return authorizer.requireEstablishmentOperator(userId, establishmentId).establishment();
  }
}
