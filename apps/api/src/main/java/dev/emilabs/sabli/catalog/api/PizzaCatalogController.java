package dev.emilabs.sabli.catalog.api;

import dev.emilabs.sabli.catalog.api.CatalogDtos.FlavorRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.FlavorResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.PizzaMenuResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.PricedOptionRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.PricedOptionResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.QuoteComponent;
import dev.emilabs.sabli.catalog.api.CatalogDtos.QuoteRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.QuoteResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.SettingsRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.SettingsResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.SizeRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.SizeResponse;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.PizzaMenu;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.QuoteSnapshot;
import dev.emilabs.sabli.catalog.domain.PizzaFlavor;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/catalog/pizza")
@Tag(name = "Catalog")
public class PizzaCatalogController {

  private final CurrentUser currentUser;
  private final PizzaCatalogService pizzas;

  public PizzaCatalogController(CurrentUser currentUser, PizzaCatalogService pizzas) {
    this.currentUser = currentUser;
    this.pizzas = pizzas;
  }

  @GetMapping
  @Operation(summary = "Consulta o cardápio de pizza do estabelecimento")
  public PizzaMenuResponse menu(@PathVariable UUID establishmentId) {
    PizzaMenu menu = pizzas.menu(currentUser.requireUserId(), establishmentId);
    return new PizzaMenuResponse(
        SettingsResponse.from(menu.settings()),
        menu.sizes().stream().map(SizeResponse::from).toList(),
        menu.flavors().stream().map(flavor -> FlavorResponse.from(flavor, menu.prices())).toList(),
        menu.crusts().stream().map(PricedOptionResponse::from).toList(),
        menu.extras().stream().map(PricedOptionResponse::from).toList());
  }

  @PatchMapping("/settings")
  @Operation(summary = "Altera a estratégia de precificação")
  public SettingsResponse settings(@PathVariable UUID establishmentId, @Valid @RequestBody SettingsRequest request) {
    return SettingsResponse.from(
        pizzas.changeStrategy(
            currentUser.requireUserId(), establishmentId, request.strategy(), request.version()));
  }

  @PostMapping("/sizes")
  @ResponseStatus(HttpStatus.CREATED)
  public SizeResponse createSize(@PathVariable UUID establishmentId, @Valid @RequestBody SizeRequest request) {
    return SizeResponse.from(pizzas.createSize(currentUser.requireUserId(), establishmentId, request.toCommand()));
  }

  @PatchMapping("/sizes/{sizeId}")
  public SizeResponse updateSize(
      @PathVariable UUID establishmentId, @PathVariable UUID sizeId, @Valid @RequestBody SizeRequest request) {
    return SizeResponse.from(
        pizzas.updateSize(currentUser.requireUserId(), establishmentId, sizeId, request.toCommand()));
  }

  @PostMapping("/flavors")
  @ResponseStatus(HttpStatus.CREATED)
  public FlavorResponse createFlavor(@PathVariable UUID establishmentId, @Valid @RequestBody FlavorRequest request) {
    var flavor = pizzas.createFlavor(currentUser.requireUserId(), establishmentId, request.toCommand());
    return flavorResponse(establishmentId, flavor);
  }

  @PatchMapping("/flavors/{flavorId}")
  public FlavorResponse updateFlavor(
      @PathVariable UUID establishmentId, @PathVariable UUID flavorId, @Valid @RequestBody FlavorRequest request) {
    var flavor = pizzas.updateFlavor(currentUser.requireUserId(), establishmentId, flavorId, request.toCommand());
    return flavorResponse(establishmentId, flavor);
  }

  @PostMapping("/crusts")
  @ResponseStatus(HttpStatus.CREATED)
  public PricedOptionResponse createCrust(
      @PathVariable UUID establishmentId, @Valid @RequestBody PricedOptionRequest request) {
    return PricedOptionResponse.from(
        pizzas.createCrust(currentUser.requireUserId(), establishmentId, request.toCommand()));
  }

  @PatchMapping("/crusts/{crustId}")
  public PricedOptionResponse updateCrust(
      @PathVariable UUID establishmentId,
      @PathVariable UUID crustId,
      @Valid @RequestBody PricedOptionRequest request) {
    return PricedOptionResponse.from(
        pizzas.updateCrust(currentUser.requireUserId(), establishmentId, crustId, request.toCommand()));
  }

  @PostMapping("/extras")
  @ResponseStatus(HttpStatus.CREATED)
  public PricedOptionResponse createExtra(
      @PathVariable UUID establishmentId, @Valid @RequestBody PricedOptionRequest request) {
    return PricedOptionResponse.from(
        pizzas.createExtra(currentUser.requireUserId(), establishmentId, request.toCommand()));
  }

  @PatchMapping("/extras/{extraId}")
  public PricedOptionResponse updateExtra(
      @PathVariable UUID establishmentId,
      @PathVariable UUID extraId,
      @Valid @RequestBody PricedOptionRequest request) {
    return PricedOptionResponse.from(
        pizzas.updateExtra(currentUser.requireUserId(), establishmentId, extraId, request.toCommand()));
  }

  @PostMapping("/quotes")
  @Operation(summary = "Cota pizza com preço calculado no servidor. Não reserva nem vende.")
  public QuoteResponse quote(@PathVariable UUID establishmentId, @Valid @RequestBody QuoteRequest request) {
    QuoteSnapshot snapshot = pizzas.quote(currentUser.requireUserId(), establishmentId, request.toCommand());
    var result = snapshot.result();
    return new QuoteResponse(
        new QuoteComponent(snapshot.size().id(), snapshot.size().name(), null),
        snapshot.flavors().stream().map(flavor -> new QuoteComponent(flavor.id(), flavor.name(), null)).toList(),
        snapshot.crust() == null
            ? null
            : new QuoteComponent(snapshot.crust().id(), snapshot.crust().name(), snapshot.crust().priceCents()),
        snapshot.extras().stream()
            .map(extra -> new QuoteComponent(extra.id(), extra.name(), extra.priceCents()))
            .toList(),
        snapshot.quantity(),
        result.strategy(),
        result.flavorsCents(),
        result.crustCents(),
        result.extrasCents(),
        result.unitCents(),
        result.totalCents(),
        result.breakdown());
  }

  private FlavorResponse flavorResponse(UUID establishmentId, PizzaFlavor flavor) {
    return FlavorResponse.from(flavor, pizzas.menu(currentUser.requireUserId(), establishmentId).prices().stream()
        .filter(price -> price.flavorId().equals(flavor.id()))
        .toList());
  }
}
