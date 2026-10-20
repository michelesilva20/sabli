package dev.emilabs.sabli.identity.application;

import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import dev.emilabs.sabli.identity.domain.MembershipStatus;
import dev.emilabs.sabli.identity.domain.Organization;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import dev.emilabs.sabli.identity.domain.OrganizationRole;
import dev.emilabs.sabli.identity.persistence.EstablishmentMembershipRepository;
import dev.emilabs.sabli.identity.persistence.EstablishmentRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationMembershipRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class TenantAuthorizer {

  private final OrganizationRepository organizations;
  private final EstablishmentRepository establishments;
  private final OrganizationMembershipRepository organizationMemberships;
  private final EstablishmentMembershipRepository establishmentMemberships;

  public TenantAuthorizer(
      OrganizationRepository organizations,
      EstablishmentRepository establishments,
      OrganizationMembershipRepository organizationMemberships,
      EstablishmentMembershipRepository establishmentMemberships) {
    this.organizations = organizations;
    this.establishments = establishments;
    this.organizationMemberships = organizationMemberships;
    this.establishmentMemberships = establishmentMemberships;
  }

  public OrgAccess requireVisibleOrganization(UUID userId, UUID organizationId) {
    Organization organization = organizations.findById(organizationId).orElseThrow(ApiException::notFound);
    Optional<OrganizationMembership> orgMembership =
        organizationMemberships
            .findByOrganizationIdAndUserId(organizationId, userId)
            .filter(OrganizationMembership::isActive);
    List<EstablishmentMembership> establishmentMembershipsForUser =
        establishmentMemberships.findByOrganizationIdAndUserIdAndStatus(
            organizationId, userId, MembershipStatus.ACTIVE);
    if (orgMembership.isEmpty() && establishmentMembershipsForUser.isEmpty()) {
      throw ApiException.notFound();
    }
    return new OrgAccess(organization, orgMembership.orElse(null), establishmentMembershipsForUser);
  }

  public OrgAccess requireOrgRole(UUID userId, UUID organizationId, OrganizationRole minimum) {
    return requireOrgRole(userId, organizationId, minimum, true);
  }

  public OrgAccess requireOrgAdministrator(UUID userId, UUID organizationId) {
    return requireOrgRole(userId, organizationId, OrganizationRole.ADMIN, false);
  }

  private OrgAccess requireOrgRole(
      UUID userId, UUID organizationId, OrganizationRole minimum, boolean requireOperational) {
    OrgAccess access = requireVisibleOrganization(userId, organizationId);
    if (requireOperational) {
      requireOrgOperational(access.organization());
    }
    OrganizationMembership membership = access.organizationMembership();
    if (membership == null || membership.role().rank() < minimum.rank()) {
      throw ApiException.forbidden();
    }
    return access;
  }

  public EstAccess requireOperationalEstablishment(UUID userId, UUID establishmentId) {
    EstAccess access = requireVisibleEstablishment(userId, establishmentId);
    requireOrgOperational(access.organization());
    requireEstablishmentOperational(access.establishment());
    return access;
  }

  public EstAccess requireVisibleEstablishment(UUID userId, UUID establishmentId) {
    Establishment establishment = establishments.findById(establishmentId).orElseThrow(ApiException::notFound);
    OrgAccess orgAccess = requireVisibleOrganization(userId, establishment.organizationId());
    Optional<EstablishmentMembership> membership =
        establishmentMemberships
            .findByEstablishmentIdAndUserId(establishmentId, userId)
            .filter(EstablishmentMembership::isActive);
    if (membership.isEmpty() && orgAccess.organizationMembership() == null) {
      throw ApiException.notFound();
    }
    return new EstAccess(orgAccess, establishment, membership.orElse(null));
  }

  public EstAccess requireEstablishmentOperator(UUID userId, UUID establishmentId) {
    EstAccess access = requireOperationalEstablishment(userId, establishmentId);
    if (access.organizationRole() == OrganizationRole.ADMIN
        || access.organizationRole() == OrganizationRole.MANAGER) {
      return access;
    }
    if (access.establishmentMembership() != null
        && access.establishmentMembership().role() != EstablishmentRole.KITCHEN) {
      return access;
    }
    throw ApiException.forbidden();
  }

  public EstAccess requireFinanceOperator(UUID userId, UUID establishmentId) {
    EstAccess access = requireOperationalEstablishment(userId, establishmentId);
    if (access.organizationRole() == OrganizationRole.ADMIN
        || access.organizationRole() == OrganizationRole.MANAGER) {
      return access;
    }
    EstablishmentRole role =
        access.establishmentMembership() == null ? null : access.establishmentMembership().role();
    if (role == EstablishmentRole.ADMIN
        || role == EstablishmentRole.MANAGER
        || role == EstablishmentRole.CASHIER) {
      return access;
    }
    throw ApiException.forbidden();
  }

  public EstAccess requireKitchenOperator(UUID userId, UUID establishmentId) {
    EstAccess access = requireOperationalEstablishment(userId, establishmentId);
    if (access.organizationRole() == OrganizationRole.ADMIN
        || access.organizationRole() == OrganizationRole.MANAGER) {
      return access;
    }
    EstablishmentRole role =
        access.establishmentMembership() == null ? null : access.establishmentMembership().role();
    if (role == EstablishmentRole.KITCHEN
        || role == EstablishmentRole.ADMIN
        || role == EstablishmentRole.MANAGER) {
      return access;
    }
    throw ApiException.forbidden();
  }

  public EstAccess requireEstablishmentManager(UUID userId, UUID establishmentId, EstablishmentRole target) {
    return requireEstablishmentManager(userId, establishmentId, target, true);
  }

  public EstAccess requireEstablishmentManagerForStatus(UUID userId, UUID establishmentId) {
    return requireEstablishmentManager(userId, establishmentId, EstablishmentRole.MANAGER, false);
  }

  private EstAccess requireEstablishmentManager(
      UUID userId, UUID establishmentId, EstablishmentRole target, boolean requireEstablishmentOperational) {
    EstAccess access = requireVisibleEstablishment(userId, establishmentId);
    requireOrgOperational(access.organization());
    if (requireEstablishmentOperational) {
      requireEstablishmentOperational(access.establishment());
    }
    if (access.organizationRole() == OrganizationRole.ADMIN) {
      return access;
    }
    if (access.organizationRole() == OrganizationRole.MANAGER && target != EstablishmentRole.ADMIN) {
      return access;
    }
    if (access.establishmentMembership() != null && access.establishmentMembership().role().canAssign(target)) {
      return access;
    }
    throw ApiException.forbidden();
  }

  public void requireOrgOperational(Organization organization) {
    if (!organization.isOperational()) {
      throw ApiException.tenantSuspended();
    }
  }

  public void requireEstablishmentOperational(Establishment establishment) {
    if (!establishment.isOperational()) {
      throw ApiException.tenantSuspended();
    }
  }

  public record OrgAccess(
      Organization organization,
      OrganizationMembership organizationMembership,
      List<EstablishmentMembership> establishmentMemberships) {
    public OrganizationRole organizationRole() {
      return organizationMembership == null ? null : organizationMembership.role();
    }
  }

  public record EstAccess(
      OrgAccess orgAccess, Establishment establishment, EstablishmentMembership establishmentMembership) {
    public Organization organization() {
      return orgAccess.organization();
    }

    public OrganizationRole organizationRole() {
      return orgAccess.organizationRole();
    }
  }
}
