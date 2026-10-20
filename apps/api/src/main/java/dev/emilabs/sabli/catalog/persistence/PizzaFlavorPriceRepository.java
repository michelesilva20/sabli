package dev.emilabs.sabli.catalog.persistence;

import dev.emilabs.sabli.catalog.domain.PizzaFlavorPrice;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PizzaFlavorPriceRepository extends JpaRepository<PizzaFlavorPrice, PizzaFlavorPrice.Id> {

  List<PizzaFlavorPrice> findByEstablishmentId(UUID establishmentId);

  @Query("select p from PizzaFlavorPrice p where p.id.flavorId = :flavorId")
  List<PizzaFlavorPrice> findByFlavorId(@Param("flavorId") UUID flavorId);
}
