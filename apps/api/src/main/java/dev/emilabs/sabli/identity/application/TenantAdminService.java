package dev.emilabs.sabli.identity.application;

import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.EstablishmentRole;
import dev.emilabs.sabli.identity.domain.Organization;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import dev.emilabs.sabli.identity.domain.OrganizationRole;
import dev.emilabs.sabli.identity.domain.TenantStatus;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.EstablishmentMembershipRepository;
import dev.emilabs.sabli.identity.persistence.EstablishmentRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationMembershipRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationRepository;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantAdminService {

  private final TenantAuthorizer authorizer;
  private final OrganizationRepository organizations;
  private final EstablishmentRepository establishments;
  private final OrganizationMembershipRepository organizationMemberships;
  private final EstablishmentMembershipRepository establishmentMemberships;
  private final UserAccountRepository users;

  public TenantAdminService(
      TenantAuthorizer authorizer,
      OrganizationRepository organizations,
      EstablishmentRepository establishments,
      OrganizationMembershipRepository organizationMemberships,
      EstablishmentMembershipRepository establishmentMemberships,
      UserAccountRepository users) {
    this.authorizer = authorizer;
    this.organizations = organizations;
    this.establishments = establishments;
    this.organizationMemberships = organizationMemberships;
    this.establishmentMemberships = establishmentMemberships;
    this.users = users;
  }

  @Transactional
  public Establishment createEstablishment(UUID actorId, UUID organizationId, String name, String slug) {
    authorizer.requireOrgRole(actorId, organizationId, OrganizationRole.MANAGER);
    String normalized = Slugs.normalize(slug);
    if (establishments.existsByOrganizationIdAndSlug(organizationId, normalized)) {
      throw ApiException.conflict("Já existe um estabelecimento com este identificador.");
    }
    return establishments.save(Establishment.create(organizationId, name.trim(), normalized));
  }

  @Transactional
  public Organization changeOrganizationStatus(UUID actorId, UUID organizationId, TenantStatus status) {
    authorizer.requireOrgAdministrator(actorId, organizationId);
    Organization organization = organizations.findById(organizationId).orElseThrow(ApiException::notFound);
    organization.changeStatus(status);
    return organization;
  }

  @Transactional
  public Establishment changeEstablishmentStatus(UUID actorId, UUID establishmentId, TenantStatus status) {
    authorizer.requireEstablishmentManagerForStatus(actorId, establishmentId);
    Establishment establishment = establishments.findById(establishmentId).orElseThrow(ApiException::notFound);
    establishment.changeStatus(status);
    return establishment;
  }

  @Transactional(readOnly = true)
  public List<OrganizationMembership> listOrganizationMemberships(UUID actorId, UUID organizationId) {
    authorizer.requireOrgRole(actorId, organizationId, OrganizationRole.MANAGER);
    return organizationMemberships.findByOrganizationId(organizationId);
  }

  @Transactional
  public OrganizationMembership upsertOrganizationMembership(
      UUID actorId, UUID organizationId, String email, OrganizationRole role) {
    TenantAuthorizer.OrgAccess access = authorizer.requireOrgRole(actorId, organizationId, OrganizationRole.MANAGER);
    if (!access.organizationMembership().role().canAssign(role)) {
      throw ApiException.forbidden();
    }
    UserAccount user =
        users.findByEmailNormalized(Emails.normalize(email)).orElseThrow(ApiException::notFound);
    return organizationMemberships
        .findByOrganizationIdAndUserId(organizationId, user.id())
        .map(
            membership -> {
              if (membership.isActive() && membership.role() == role) {
                return membership;
              }
              if (!access.organizationMembership().role().canAssign(membership.role()) && membership.isActive()) {
                throw ApiException.forbidden();
              }
              membership.restore(role);
              return membership;
            })
        .orElseGet(
            () -> organizationMemberships.save(OrganizationMembership.create(organizationId, user.id(), role)));
  }

  @Transactional
  public void revokeOrganizationMembership(UUID actorId, UUID organizationId, UUID targetUserId) {
    TenantAuthorizer.OrgAccess access = authorizer.requireOrgRole(actorId, organizationId, OrganizationRole.MANAGER);
    OrganizationMembership membership =
        organizationMemberships
            .findByOrganizationIdAndUserId(organizationId, targetUserId)
            .filter(OrganizationMembership::isActive)
            .orElseThrow(ApiException::notFound);
    if (!access.organizationMembership().role().canAssign(membership.role())) {
      throw ApiException.forbidden();
    }
    if (targetUserId.equals(actorId) && membership.role() == OrganizationRole.ADMIN) {
      throw ApiException.badRequest("O último administrador não pode revogar a si mesmo nesta operação.");
    }
    membership.revoke();
  }

  @Transactional(readOnly = true)
  public List<EstablishmentMembership> listEstablishmentMemberships(UUID actorId, UUID establishmentId) {
    authorizer.requireEstablishmentManager(actorId, establishmentId, EstablishmentRole.MANAGER);
    return establishmentMemberships.findByEstablishmentId(establishmentId);
  }

  @Transactional
  public EstablishmentMembership upsertEstablishmentMembership(
      UUID actorId, UUID establishmentId, String email, EstablishmentRole role) {
    TenantAuthorizer.EstAccess access = authorizer.requireEstablishmentManager(actorId, establishmentId, role);
    UserAccount user =
        users.findByEmailNormalized(Emails.normalize(email)).orElseThrow(ApiException::notFound);
    Establishment establishment = access.establishment();
    return establishmentMemberships
        .findByEstablishmentIdAndUserId(establishmentId, user.id())
        .map(
            membership -> {
              membership.restore(role);
              return membership;
            })
        .orElseGet(
            () ->
                establishmentMemberships.save(
                    EstablishmentMembership.create(
                        establishment.id(), establishment.organizationId(), user.id(), role)));
  }

  @Transactional
  public void revokeEstablishmentMembership(UUID actorId, UUID establishmentId, UUID targetUserId) {
    EstablishmentMembership membership =
        establishmentMemberships
            .findByEstablishmentIdAndUserId(establishmentId, targetUserId)
            .filter(EstablishmentMembership::isActive)
            .orElseThrow(ApiException::notFound);
    authorizer.requireEstablishmentManager(actorId, establishmentId, membership.role());
    membership.revoke();
  }
}
