package dev.emilabs.sabli.identity.persistence;

import dev.emilabs.sabli.identity.domain.EstablishmentMembership;
import dev.emilabs.sabli.identity.domain.MembershipStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstablishmentMembershipRepository extends JpaRepository<EstablishmentMembership, UUID> {

  Optional<EstablishmentMembership> findByEstablishmentIdAndUserId(UUID establishmentId, UUID userId);

  List<EstablishmentMembership> findByUserIdAndStatus(UUID userId, MembershipStatus status);

  List<EstablishmentMembership> findByEstablishmentId(UUID establishmentId);

  List<EstablishmentMembership> findByOrganizationIdAndUserIdAndStatus(
      UUID organizationId, UUID userId, MembershipStatus status);
}
