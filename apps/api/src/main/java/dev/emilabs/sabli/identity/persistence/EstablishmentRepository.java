package dev.emilabs.sabli.identity.persistence;

import dev.emilabs.sabli.identity.domain.Establishment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstablishmentRepository extends JpaRepository<Establishment, UUID> {

  boolean existsByOrganizationIdAndSlug(UUID organizationId, String slug);

  List<Establishment> findByOrganizationId(UUID organizationId);
}
