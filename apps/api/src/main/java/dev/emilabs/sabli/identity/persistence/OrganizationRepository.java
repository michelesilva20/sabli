package dev.emilabs.sabli.identity.persistence;

import dev.emilabs.sabli.identity.domain.Organization;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

  boolean existsBySlug(String slug);
}
