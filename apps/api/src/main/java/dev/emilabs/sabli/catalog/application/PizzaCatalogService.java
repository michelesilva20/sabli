package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.catalog.domain.PizzaCrust;
import dev.emilabs.sabli.catalog.domain.PizzaExtra;
import dev.emilabs.sabli.catalog.domain.PizzaFlavor;
import dev.emilabs.sabli.catalog.domain.PizzaFlavorPrice;
import dev.emilabs.sabli.catalog.domain.PizzaSettings;
import dev.emilabs.sabli.catalog.domain.PizzaSize;
import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import dev.emilabs.sabli.catalog.persistence.PizzaCrustRepository;
import dev.emilabs.sabli.catalog.persistence.PizzaExtraRepository;
import dev.emilabs.sabli.catalog.persistence.PizzaFlavorPriceRepository;
import dev.emilabs.sabli.catalog.persistence.PizzaFlavorRepository;
import dev.emilabs.sabli.catalog.persistence.PizzaSettingsRepository;
import dev.emilabs.sabli.catalog.persistence.PizzaSizeRepository;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer.PricedItem;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer.QuoteResult;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PizzaCatalogService {

  private final CatalogAccess access;
  private final PizzaSettingsRepository settings;
  private final PizzaSizeRepository sizes;
  private final PizzaFlavorRepository flavors;
  private final PizzaFlavorPriceRepository flavorPrices;
  private final PizzaCrustRepository crusts;
  private final PizzaExtraRepository extras;

  public PizzaCatalogService(
      CatalogAccess access,
      PizzaSettingsRepository settings,
      PizzaSizeRepository sizes,
      PizzaFlavorRepository flavors,
      PizzaFlavorPriceRepository flavorPrices,
      PizzaCrustRepository crusts,
      PizzaExtraRepository extras) {
    this.access = access;
    this.settings = settings;
    this.sizes = sizes;
    this.flavors = flavors;
    this.flavorPrices = flavorPrices;
    this.crusts = crusts;
    this.extras = extras;
  }

  @Transactional(readOnly = true)
  public PizzaMenu menu(UUID userId, UUID establishmentId) {
    Establishment establishment = access.requireRead(userId, establishmentId);
    return loadMenu(establishment);
  }

  @Transactional
  public PizzaSettings changeStrategy(UUID userId, UUID establishmentId, PricingStrategy strategy, Integer version) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    PizzaSettings current = requireSettings(establishment);
    if (version != null && version != current.version()) {
      throw ApiException.staleVersion();
    }
    current.changeStrategy(strategy);
    return current;
  }

  @Transactional
  public PizzaSize createSize(UUID userId, UUID establishmentId, SizeCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    String code = CatalogSlugs.resolve(command.code(), command.name());
    if (sizes.existsByEstablishmentIdAndCode(establishmentId, code)) {
      throw ApiException.conflict("Já existe um tamanho com este identificador.");
    }
    validateSizeFactors(command);
    return sizes.save(
        PizzaSize.create(
            establishment.id(),
            establishment.organizationId(),
            code,
            command.name().trim(),
            command.maxFlavors(),
            command.slices(),
            command.priceFactorNumerator(),
            command.priceFactorDenominator(),
            command.sortOrder()));
  }

  @Transactional
  public PizzaSize updateSize(UUID userId, UUID establishmentId, UUID sizeId, SizeCommand command) {
    access.requireWrite(userId, establishmentId);
    PizzaSize size = sizes.findByIdAndEstablishmentId(sizeId, establishmentId).orElseThrow(ApiException::notFound);
    validateSizeFactors(command);
    size.update(
        command.name().trim(),
        command.maxFlavors(),
        command.slices(),
        command.priceFactorNumerator(),
        command.priceFactorDenominator(),
        command.available() == null || command.available(),
        command.sortOrder());
    return size;
  }

  @Transactional
  public PizzaFlavor createFlavor(UUID userId, UUID establishmentId, FlavorCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (flavors.existsByEstablishmentIdAndSlug(establishmentId, slug)) {
      throw ApiException.conflict("Já existe um sabor com este identificador.");
    }
    PizzaFlavor flavor =
        flavors.save(
            PizzaFlavor.create(
                establishment.id(),
                establishment.organizationId(),
                command.name().trim(),
                slug,
                command.description() == null ? "" : command.description().trim(),
                command.sortOrder()));
    upsertPrices(establishment, flavor, command);
    return flavor;
  }

  @Transactional
  public PizzaFlavor updateFlavor(UUID userId, UUID establishmentId, UUID flavorId, FlavorCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    PizzaFlavor flavor =
        flavors.findByIdAndEstablishmentId(flavorId, establishmentId).orElseThrow(ApiException::notFound);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (flavors.existsByEstablishmentIdAndSlugAndIdNot(establishmentId, slug, flavorId)) {
      throw ApiException.conflict("Já existe um sabor com este identificador.");
    }
    flavor.update(
        command.name().trim(),
        slug,
        command.description() == null ? "" : command.description().trim(),
        command.available() == null || command.available(),
        command.sortOrder());
    upsertPrices(establishment, flavor, command);
    return flavor;
  }

  @Transactional
  public PizzaCrust createCrust(UUID userId, UUID establishmentId, PricedOptionCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (crusts.existsByEstablishmentIdAndSlug(establishmentId, slug)) {
      throw ApiException.conflict("Já existe uma borda com este identificador.");
    }
    return crusts.save(
        PizzaCrust.create(
            establishment.id(),
            establishment.organizationId(),
            command.name().trim(),
            slug,
            Money.requireCents(command.priceCents()),
            command.sortOrder()));
  }

  @Transactional
  public PizzaCrust updateCrust(UUID userId, UUID establishmentId, UUID crustId, PricedOptionCommand command) {
    access.requireWrite(userId, establishmentId);
    PizzaCrust crust = crusts.findByIdAndEstablishmentId(crustId, establishmentId).orElseThrow(ApiException::notFound);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (crusts.existsByEstablishmentIdAndSlugAndIdNot(establishmentId, slug, crustId)) {
      throw ApiException.conflict("Já existe uma borda com este identificador.");
    }
    crust.update(
        command.name().trim(),
        slug,
        Money.requireCents(command.priceCents()),
        command.available() == null || command.available(),
        command.sortOrder());
    return crust;
  }

  @Transactional
  public PizzaExtra createExtra(UUID userId, UUID establishmentId, PricedOptionCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (extras.existsByEstablishmentIdAndSlug(establishmentId, slug)) {
      throw ApiException.conflict("Já existe um adicional com este identificador.");
    }
    return extras.save(
        PizzaExtra.create(
            establishment.id(),
            establishment.organizationId(),
            command.name().trim(),
            slug,
            Money.requireCents(command.priceCents()),
            command.sortOrder()));
  }

  @Transactional
  public PizzaExtra updateExtra(UUID userId, UUID establishmentId, UUID extraId, PricedOptionCommand command) {
    access.requireWrite(userId, establishmentId);
    PizzaExtra extra = extras.findByIdAndEstablishmentId(extraId, establishmentId).orElseThrow(ApiException::notFound);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (extras.existsByEstablishmentIdAndSlugAndIdNot(establishmentId, slug, extraId)) {
      throw ApiException.conflict("Já existe um adicional com este identificador.");
    }
    extra.update(
        command.name().trim(),
        slug,
        Money.requireCents(command.priceCents()),
        command.available() == null || command.available(),
        command.sortOrder());
    return extra;
  }

  @Transactional(readOnly = true)
  public QuoteSnapshot quote(UUID userId, UUID establishmentId, QuoteCommand command) {
    Establishment establishment = access.requireRead(userId, establishmentId);
    if (command.quantity() < 1) {
      throw ApiException.badRequest("A quantidade precisa ser pelo menos 1.");
    }
    PizzaMenu menu = loadMenu(establishment);
    PizzaSize size =
        sizes.findByIdAndEstablishmentId(command.sizeId(), establishmentId).orElseThrow(ApiException::notFound);
    if (!size.isUsable()) {
      throw ApiException.unprocessable("OPTION_UNAVAILABLE", "O tamanho selecionado não está disponível.");
    }
    if (command.flavorIds() == null || command.flavorIds().isEmpty()) {
      throw ApiException.unprocessable("QUOTE_INVALID", "Selecione ao menos um sabor.");
    }
    if (new HashSet<>(command.flavorIds()).size() != command.flavorIds().size()) {
      throw ApiException.unprocessable("QUOTE_INVALID", "Os sabores da cotação precisam ser distintos.");
    }
    Map<UUID, PizzaFlavorPrice> pricesByFlavor =
        flavorPrices.findByEstablishmentId(establishment.id()).stream()
            .filter(price -> price.sizeId().equals(size.id()))
            .collect(Collectors.toMap(PizzaFlavorPrice::flavorId, Function.identity()));
    List<PricedItem> flavorItems = new ArrayList<>();
    List<PizzaFlavor> selectedFlavors = new ArrayList<>();
    for (UUID flavorId : command.flavorIds()) {
      PizzaFlavor flavor =
          flavors.findByIdAndEstablishmentId(flavorId, establishmentId).orElseThrow(ApiException::notFound);
      if (!flavor.isUsable()) {
        throw ApiException.unprocessable("OPTION_UNAVAILABLE", "Um sabor selecionado não está disponível.");
      }
      PizzaFlavorPrice price = pricesByFlavor.get(flavor.id());
      if (price == null) {
        throw ApiException.unprocessable("QUOTE_INVALID", "Falta preço do sabor para o tamanho escolhido.");
      }
      selectedFlavors.add(flavor);
      flavorItems.add(new PricedItem(flavor.id().toString(), flavor.name(), price.priceCents()));
    }
    PricedItem crustItem = null;
    int crustCents = 0;
    PizzaCrust crust = null;
    if (command.crustId() != null) {
      crust = crusts.findByIdAndEstablishmentId(command.crustId(), establishmentId).orElseThrow(ApiException::notFound);
      if (!crust.isUsable()) {
        throw ApiException.unprocessable("OPTION_UNAVAILABLE", "A borda selecionada não está disponível.");
      }
      crustCents = crust.priceCents();
      crustItem = new PricedItem(crust.id().toString(), crust.name(), crustCents);
    }
    List<PricedItem> extraItems = new ArrayList<>();
    List<PizzaExtra> selectedExtras = new ArrayList<>();
    LinkedHashSet<UUID> extraIds = new LinkedHashSet<>(command.extraIds() == null ? List.of() : command.extraIds());
    for (UUID extraId : extraIds) {
      PizzaExtra extra =
          extras.findByIdAndEstablishmentId(extraId, establishmentId).orElseThrow(ApiException::notFound);
      if (!extra.isUsable()) {
        throw ApiException.unprocessable("OPTION_UNAVAILABLE", "Um adicional selecionado não está disponível.");
      }
      selectedExtras.add(extra);
      extraItems.add(new PricedItem(extra.id().toString(), extra.name(), extra.priceCents()));
    }
    try {
      QuoteResult result =
          PizzaPricer.quote(
              new PizzaPricer.QuoteInput(
                  size.maxFlavors(),
                  flavorItems,
                  crustItem,
                  crustCents,
                  extraItems,
                  command.quantity(),
                  menu.settings().strategy()));
      return new QuoteSnapshot(size, selectedFlavors, crust, selectedExtras, command.quantity(), result);
    } catch (IllegalArgumentException ex) {
      throw ApiException.unprocessable("QUOTE_INVALID", ex.getMessage());
    }
  }

  private void upsertPrices(Establishment establishment, PizzaFlavor flavor, FlavorCommand command) {
    Map<UUID, PizzaSize> sizeById =
        sizes.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishment.id()).stream()
            .collect(Collectors.toMap(PizzaSize::id, Function.identity()));
    if (command.prices() != null && !command.prices().isEmpty()) {
      for (SizePrice price : command.prices()) {
        PizzaSize size = sizeById.get(price.sizeId());
        if (size == null || !size.establishmentId().equals(establishment.id())) {
          throw ApiException.notFound();
        }
        savePrice(flavor.id(), size.id(), establishment, Money.requireCents(price.priceCents()));
      }
      return;
    }
    if (command.referencePriceCents() == null) {
      return;
    }
    int reference = Money.requireCents(command.referencePriceCents());
    for (PizzaSize size : sizeById.values()) {
      int cents = PizzaPricer.scalePrice(reference, size.priceFactorNumerator(), size.priceFactorDenominator());
      savePrice(flavor.id(), size.id(), establishment, cents);
    }
  }

  private void savePrice(UUID flavorId, UUID sizeId, Establishment establishment, int cents) {
    PizzaFlavorPrice existing =
        flavorPrices.findById(new PizzaFlavorPrice.Id(flavorId, sizeId)).orElse(null);
    if (existing == null) {
      flavorPrices.save(
          PizzaFlavorPrice.create(flavorId, sizeId, establishment.id(), establishment.organizationId(), cents));
    } else {
      existing.changePrice(cents);
    }
  }

  private PizzaSettings requireSettings(Establishment establishment) {
    return settings
        .findById(establishment.id())
        .orElseGet(
            () ->
                settings.save(
                    PizzaSettings.create(establishment.id(), establishment.organizationId(), PricingStrategy.HIGHEST)));
  }

  private PizzaMenu loadMenu(Establishment establishment) {
    PizzaSettings current =
        settings
            .findById(establishment.id())
            .orElseGet(
                () -> PizzaSettings.create(establishment.id(), establishment.organizationId(), PricingStrategy.HIGHEST));
    return new PizzaMenu(
        current,
        sizes.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishment.id()),
        flavors.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishment.id()),
        flavorPrices.findByEstablishmentId(establishment.id()),
        crusts.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishment.id()),
        extras.findByEstablishmentIdOrderBySortOrderAscNameAscIdAsc(establishment.id()));
  }

  private static void validateSizeFactors(SizeCommand command) {
    if (command.maxFlavors() < 1 || command.slices() < 1) {
      throw ApiException.badRequest("Tamanho, fatias e limite de sabores precisam ser positivos.");
    }
    if (command.priceFactorNumerator() < 0 || command.priceFactorDenominator() < 1) {
      throw ApiException.badRequest("O fator de preço precisa ser uma fração válida.");
    }
  }

  public record SizeCommand(
      String code,
      String name,
      int maxFlavors,
      int slices,
      int priceFactorNumerator,
      int priceFactorDenominator,
      Boolean available,
      int sortOrder) {}

  public record SizePrice(UUID sizeId, int priceCents) {}

  public record FlavorCommand(
      String name,
      String slug,
      String description,
      Boolean available,
      int sortOrder,
      Integer referencePriceCents,
      List<SizePrice> prices) {}

  public record PricedOptionCommand(
      String name, String slug, int priceCents, Boolean available, int sortOrder) {}

  public record QuoteCommand(UUID sizeId, List<UUID> flavorIds, UUID crustId, List<UUID> extraIds, int quantity) {}

  public record PizzaMenu(
      PizzaSettings settings,
      List<PizzaSize> sizes,
      List<PizzaFlavor> flavors,
      List<PizzaFlavorPrice> prices,
      List<PizzaCrust> crusts,
      List<PizzaExtra> extras) {}

  public record QuoteSnapshot(
      PizzaSize size,
      List<PizzaFlavor> flavors,
      PizzaCrust crust,
      List<PizzaExtra> extras,
      int quantity,
      QuoteResult result) {}
}
