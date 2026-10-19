package dev.emilabs.sabli.identity.application;

import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.MembershipStatus;
import dev.emilabs.sabli.identity.domain.Organization;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import dev.emilabs.sabli.identity.domain.UserAccount;
import dev.emilabs.sabli.identity.persistence.EstablishmentMembershipRepository;
import dev.emilabs.sabli.identity.persistence.EstablishmentRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationMembershipRepository;
import dev.emilabs.sabli.identity.persistence.OrganizationRepository;
import dev.emilabs.sabli.identity.persistence.UserAccountRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentityQueryService {

  private final UserAccountRepository users;
  private final OrganizationRepository organizations;
  private final EstablishmentRepository establishments;
  private final OrganizationMembershipRepository organizationMemberships;
  private final EstablishmentMembershipRepository establishmentMemberships;
  private final TenantAuthorizer authorizer;

  public IdentityQueryService(
      UserAccountRepository users,
      OrganizationRepository organizations,
      EstablishmentRepository establishments,
      OrganizationMembershipRepository organizationMemberships,
      EstablishmentMembershipRepository establishmentMemberships,
      TenantAuthorizer authorizer) {
    this.users = users;
    this.organizations = organizations;
    this.establishments = establishments;
    this.organizationMemberships = organizationMemberships;
    this.establishmentMemberships = establishmentMemberships;
    this.authorizer = authorizer;
  }

  @Transactional(readOnly = true)
  public MeSnapshot me(UUID userId) {
    UserAccount user = users.findById(userId).orElseThrow(ApiException::unauthorized);
    List<OrganizationMembership> orgMemberships =
        organizationMemberships.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE);
    List<EstablishmentMembership> estMemberships =
        establishmentMemberships.findByUserIdAndStatus(userId, MembershipStatus.ACTIVE);
    Map<UUID, Organization> orgs = new LinkedHashMap<>();
    orgMemberships.forEach(
        membership ->
            organizations.findById(membership.organizationId()).ifPresent(org -> orgs.put(org.id(), org)));
    estMemberships.forEach(
        membership ->
            organizations.findById(membership.organizationId()).ifPresent(org -> orgs.putIfAbsent(org.id(), org)));
    List<Establishment> establishmentsForUser =
        estMemberships.stream()
            .map(membership -> establishments.findById(membership.establishmentId()).orElse(null))
            .filter(est -> est != null)
            .toList();
    return new MeSnapshot(user, new ArrayList<>(orgs.values()), orgMemberships, establishmentsForUser, estMemberships);
  }

  @Transactional(readOnly = true)
  public List<Organization> listOrganizations(UUID userId) {
    return me(userId).organizations();
  }

  @Transactional(readOnly = true)
  public Organization getOrganization(UUID userId, UUID organizationId) {
    return authorizer.requireVisibleOrganization(userId, organizationId).organization();
  }

  @Transactional(readOnly = true)
  public List<Establishment> listEstablishments(UUID userId, UUID organizationId) {
    TenantAuthorizer.OrgAccess access = authorizer.requireVisibleOrganization(userId, organizationId);
    if (access.organizationMembership() != null) {
      return establishments.findByOrganizationId(organizationId);
    }
    return establishments.findByOrganizationId(organizationId).stream()
        .filter(
            establishment ->
                access.establishmentMemberships().stream()
                    .anyMatch(membership -> membership.establishmentId().equals(establishment.id())))
        .toList();
  }

  @Transactional(readOnly = true)
  public Establishment getEstablishment(UUID userId, UUID establishmentId) {
    return authorizer.requireVisibleEstablishment(userId, establishmentId).establishment();
  }

  @Transactional(readOnly = true)
  public ContextSnapshot validateContext(UUID userId, UUID organizationId, UUID establishmentId) {
    TenantAuthorizer.OrgAccess orgAccess = authorizer.requireVisibleOrganization(userId, organizationId);
    if (establishmentId == null) {
      return new ContextSnapshot(orgAccess.organization(), null, orgAccess.organizationRole(), null);
    }
    TenantAuthorizer.EstAccess estAccess = authorizer.requireVisibleEstablishment(userId, establishmentId);
    if (!estAccess.establishment().organizationId().equals(organizationId)) {
      throw ApiException.notFound();
    }
    authorizer.requireOrgOperational(estAccess.organization());
    authorizer.requireEstablishmentOperational(estAccess.establishment());
    return new ContextSnapshot(
        estAccess.organization(),
        estAccess.establishment(),
        estAccess.organizationRole(),
        estAccess.establishmentMembership() == null ? null : estAccess.establishmentMembership().role());
  }

  public record MeSnapshot(
      UserAccount user,
      List<Organization> organizations,
      List<OrganizationMembership> organizationMemberships,
      List<Establishment> establishments,
      List<EstablishmentMembership> establishmentMemberships) {}

  public record ContextSnapshot(
      Organization organization,
      Establishment establishment,
      dev.emilabs.sabli.identity.domain.OrganizationRole organizationRole,
      dev.emilabs.sabli.identity.domain.EstablishmentRole establishmentRole) {}
}
