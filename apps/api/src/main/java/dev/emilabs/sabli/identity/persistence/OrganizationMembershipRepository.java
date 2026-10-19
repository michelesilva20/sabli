package dev.emilabs.sabli.identity.persistence;

import dev.emilabs.sabli.identity.domain.MembershipStatus;
import dev.emilabs.sabli.identity.domain.OrganizationMembership;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationMembershipRepository extends JpaRepository<OrganizationMembership, UUID> {

  Optional<OrganizationMembership> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

  List<OrganizationMembership> findByUserIdAndStatus(UUID userId, MembershipStatus status);

  List<OrganizationMembership> findByOrganizationId(UUID organizationId);

  List<OrganizationMembership> findByOrganizationIdAndStatus(UUID organizationId, MembershipStatus status);
}
