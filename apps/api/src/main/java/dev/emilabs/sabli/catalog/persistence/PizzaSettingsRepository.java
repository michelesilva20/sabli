package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaSettings;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PizzaSettingsRepository extends JpaRepository<PizzaSettings, UUID> {}
