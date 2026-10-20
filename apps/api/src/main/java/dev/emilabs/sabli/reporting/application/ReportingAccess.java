package dev.emilabs.sabli.reporting.application;

import dev.emilabs.sabli.identity.application.TenantAuthorizer;
import dev.emilabs.sabli.identity.application.TenantAuthorizer.EstAccess;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import dev.emilabs.sabli.identity.domain.OrganizationRole;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ReportingAccess {

  private final TenantAuthorizer authorizer;

  public ReportingAccess(TenantAuthorizer authorizer) {
    this.authorizer = authorizer;
  }

  public Establishment requireCashierCompatible(UUID userId, UUID establishmentId) {
    return authorizer.requireFinanceOperator(userId, establishmentId).establishment();
  }

  public Establishment requireManager(UUID userId, UUID establishmentId) {
    EstAccess access = authorizer.requireOperationalEstablishment(userId, establishmentId);
    if (access.organizationRole() == OrganizationRole.ADMIN
        || access.organizationRole() == OrganizationRole.MANAGER) {
      return access.establishment();
    }
    EstablishmentRole role =
        access.establishmentMembership() == null ? null : access.establishmentMembership().role();
    if (role == EstablishmentRole.ADMIN || role == EstablishmentRole.MANAGER) {
      return access.establishment();
    }
    throw ApiException.forbidden();
  }
}
