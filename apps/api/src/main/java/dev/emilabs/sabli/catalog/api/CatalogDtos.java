package dev.emilabs.sabli.catalog.api;

import dev.emilabs.sabli.catalog.application.CatalogCommandService.CategoryCommand;
import dev.emilabs.sabli.catalog.application.CatalogCommandService.ProductCommand;
import dev.emilabs.sabli.catalog.application.CatalogCommandService.VariantCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.FlavorCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.PricedOptionCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.QuoteCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.SizeCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.SizePrice;
import dev.emilabs.sabli.catalog.domain.CatalogCategory;
import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import dev.emilabs.sabli.catalog.domain.CatalogStatus;
import dev.emilabs.sabli.catalog.domain.PizzaCrust;
import dev.emilabs.sabli.catalog.domain.PizzaExtra;
import dev.emilabs.sabli.catalog.domain.PizzaFlavor;
import dev.emilabs.sabli.catalog.domain.PizzaFlavorPrice;
import dev.emilabs.sabli.catalog.domain.PizzaSettings;
import dev.emilabs.sabli.catalog.domain.PizzaSize;
import dev.emilabs.sabli.catalog.domain.PricingStrategy;
import dev.emilabs.sabli.catalog.domain.ProductKind;
import dev.emilabs.sabli.catalog.domain.ProductVariant;
import dev.emilabs.sabli.catalog.pricing.PizzaPricer.BreakdownLine;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;

public final class CatalogDtos {

  private CatalogDtos() {}

  public record CategoryRequest(
      @NotBlank @Size(max = 120) String name, @Size(max = 80) String slug, @Min(0) Integer sortOrder) {
    CategoryCommand toCommand() {
      return new CategoryCommand(name, slug, sortOrder == null ? 0 : sortOrder);
    }
  }

  public record CategoryResponse(
      UUID id, UUID establishmentId, String name, String slug, int sortOrder, CatalogStatus status) {
    static CategoryResponse from(CatalogCategory category) {
      return new CategoryResponse(
          category.id(),
          category.establishmentId(),
          category.name(),
          category.slug(),
          category.sortOrder(),
          category.status());
    }
  }

  public record StatusRequest(@NotNull CatalogStatus status) {}

  public record AvailabilityRequest(@NotNull Boolean available, Integer version) {}

  public record VariantRequest(
      @NotBlank @Size(max = 80) String name,
      @NotNull Integer priceCents,
      Boolean available,
      @Min(0) Integer sortOrder) {
    VariantCommand toCommand() {
      return new VariantCommand(name, priceCents, available, sortOrder == null ? 0 : sortOrder);
    }
  }

  public record VariantResponse(
      UUID id, UUID productId, String name, int priceCents, boolean available, CatalogStatus status, int sortOrder) {
    static VariantResponse from(ProductVariant variant) {
      return new VariantResponse(
          variant.id(),
          variant.productId(),
          variant.name(),
          variant.priceCents(),
          variant.available(),
          variant.status(),
          variant.sortOrder());
    }
  }

  public record ProductRequest(
      @NotNull UUID categoryId,
      @NotBlank @Size(max = 160) String name,
      @Size(max = 80) String slug,
      @Size(max = 500) String description,
      ProductKind kind,
      Boolean available,
      Integer priceCents,
      @Valid List<VariantRequest> variants,
      @Min(0) Integer sortOrder,
      Integer version) {
    ProductCommand toCommand() {
      return new ProductCommand(
          categoryId,
          name,
          slug,
          description,
          kind,
          available,
          priceCents,
          variants == null ? List.of() : variants.stream().map(VariantRequest::toCommand).toList(),
          sortOrder == null ? 0 : sortOrder,
          version);
    }
  }

  public record ProductResponse(
      UUID id,
      UUID establishmentId,
      UUID categoryId,
      String name,
      String slug,
      String description,
      ProductKind kind,
      boolean available,
      CatalogStatus status,
      int sortOrder,
      int version,
      Integer priceCents,
      List<VariantResponse> variants) {
    static ProductResponse from(CatalogProduct product, List<ProductVariant> variants) {
      List<VariantResponse> items = variants.stream().map(VariantResponse::from).toList();
      Integer price =
          items.stream()
              .filter(variant -> variant.status() == CatalogStatus.ACTIVE)
              .map(VariantResponse::priceCents)
              .min(Integer::compareTo)
              .orElse(null);
      return new ProductResponse(
          product.id(),
          product.establishmentId(),
          product.categoryId(),
          product.name(),
          product.slug(),
          product.description(),
          product.kind(),
          product.available(),
          product.status(),
          product.sortOrder(),
          product.version(),
          price,
          items);
    }
  }

  public record PageResponse<T>(List<T> items, int page, int size, long total) {
    static <T> PageResponse<T> from(Page<T> page) {
      return new PageResponse<>(page.getContent(), page.getNumber(), page.getSize(), page.getTotalElements());
    }
  }

  public record SizeRequest(
      @Size(max = 80) String code,
      @NotBlank @Size(max = 80) String name,
      @Min(1) int maxFlavors,
      @Min(1) int slices,
      @Min(0) int priceFactorNumerator,
      @Min(1) int priceFactorDenominator,
      Boolean available,
      @Min(0) Integer sortOrder) {
    SizeCommand toCommand() {
      return new SizeCommand(
          code,
          name,
          maxFlavors,
          slices,
          priceFactorNumerator,
          priceFactorDenominator,
          available,
          sortOrder == null ? 0 : sortOrder);
    }
  }

  public record SizeResponse(
      UUID id,
      String code,
      String name,
      int maxFlavors,
      int slices,
      int priceFactorNumerator,
      int priceFactorDenominator,
      boolean available,
      CatalogStatus status,
      int sortOrder) {
    static SizeResponse from(PizzaSize size) {
      return new SizeResponse(
          size.id(),
          size.code(),
          size.name(),
          size.maxFlavors(),
          size.slices(),
          size.priceFactorNumerator(),
          size.priceFactorDenominator(),
          size.available(),
          size.status(),
          size.sortOrder());
    }
  }

  public record FlavorPriceRequest(@NotNull UUID sizeId, @NotNull Integer priceCents) {
    SizePrice toCommand() {
      return new SizePrice(sizeId, priceCents);
    }
  }

  public record FlavorRequest(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 80) String slug,
      @Size(max = 500) String description,
      Boolean available,
      @Min(0) Integer sortOrder,
      Integer referencePriceCents,
      @Valid List<FlavorPriceRequest> prices) {
    FlavorCommand toCommand() {
      return new FlavorCommand(
          name,
          slug,
          description,
          available,
          sortOrder == null ? 0 : sortOrder,
          referencePriceCents,
          prices == null ? List.of() : prices.stream().map(FlavorPriceRequest::toCommand).toList());
    }
  }

  public record FlavorResponse(
      UUID id,
      String name,
      String slug,
      String description,
      boolean available,
      CatalogStatus status,
      int sortOrder,
      Map<UUID, Integer> pricesBySizeId) {
    static FlavorResponse from(PizzaFlavor flavor, List<PizzaFlavorPrice> prices) {
      return new FlavorResponse(
          flavor.id(),
          flavor.name(),
          flavor.slug(),
          flavor.description(),
          flavor.available(),
          flavor.status(),
          flavor.sortOrder(),
          prices.stream()
              .filter(price -> price.flavorId().equals(flavor.id()))
              .collect(Collectors.toMap(PizzaFlavorPrice::sizeId, PizzaFlavorPrice::priceCents)));
    }
  }

  public record PricedOptionRequest(
      @NotBlank @Size(max = 80) String name,
      @Size(max = 80) String slug,
      @NotNull Integer priceCents,
      Boolean available,
      @Min(0) Integer sortOrder) {
    PricedOptionCommand toCommand() {
      return new PricedOptionCommand(name, slug, priceCents, available, sortOrder == null ? 0 : sortOrder);
    }
  }

  public record PricedOptionResponse(
      UUID id, String name, String slug, int priceCents, boolean available, CatalogStatus status, int sortOrder) {
    static PricedOptionResponse from(PizzaCrust crust) {
      return new PricedOptionResponse(
          crust.id(), crust.name(), crust.slug(), crust.priceCents(), crust.available(), crust.status(), crust.sortOrder());
    }

    static PricedOptionResponse from(PizzaExtra extra) {
      return new PricedOptionResponse(
          extra.id(), extra.name(), extra.slug(), extra.priceCents(), extra.available(), extra.status(), extra.sortOrder());
    }
  }

  public record SettingsRequest(@NotNull PricingStrategy strategy, Integer version) {}

  public record SettingsResponse(UUID establishmentId, PricingStrategy strategy, int version) {
    static SettingsResponse from(PizzaSettings settings) {
      return new SettingsResponse(settings.establishmentId(), settings.strategy(), settings.version());
    }
  }

  public record PizzaMenuResponse(
      SettingsResponse settings,
      List<SizeResponse> sizes,
      List<FlavorResponse> flavors,
      List<PricedOptionResponse> crusts,
      List<PricedOptionResponse> extras) {}

  public record QuoteRequest(
      @NotNull UUID sizeId,
      @NotNull @Size(min = 1) List<UUID> flavorIds,
      UUID crustId,
      List<UUID> extraIds,
      @Min(1) int quantity) {
    QuoteCommand toCommand() {
      return new QuoteCommand(sizeId, flavorIds, crustId, extraIds, quantity);
    }
  }

  public record QuoteComponent(UUID id, String name, Integer priceCents) {}

  public record QuoteResponse(
      QuoteComponent size,
      List<QuoteComponent> flavors,
      QuoteComponent crust,
      List<QuoteComponent> extras,
      int quantity,
      PricingStrategy strategy,
      int flavorsCents,
      int crustCents,
      int extrasCents,
      int unitCents,
      int totalCents,
      List<BreakdownLine> breakdown) {}
}
