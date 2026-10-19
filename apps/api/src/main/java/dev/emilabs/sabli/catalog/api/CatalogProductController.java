package dev.emilabs.sabli.catalog.api;

import dev.emilabs.sabli.catalog.api.CatalogDtos.AvailabilityRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.PageResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.ProductRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.ProductResponse;
import dev.emilabs.sabli.catalog.api.CatalogDtos.StatusRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.VariantRequest;
import dev.emilabs.sabli.catalog.api.CatalogDtos.VariantResponse;
import dev.emilabs.sabli.catalog.application.CatalogCommandService;
import dev.emilabs.sabli.catalog.application.CatalogQueryService;
import dev.emilabs.sabli.catalog.application.CatalogQueryService.ProductFilter;
import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import dev.emilabs.sabli.catalog.domain.ProductVariant;
import dev.emilabs.sabli.shared.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/establishments/{establishmentId}/catalog/products")
@Tag(name = "Catalog")
public class CatalogProductController {

  private final CurrentUser currentUser;
  private final CatalogQueryService queries;
  private final CatalogCommandService commands;

  public CatalogProductController(
      CurrentUser currentUser, CatalogQueryService queries, CatalogCommandService commands) {
    this.currentUser = currentUser;
    this.queries = queries;
    this.commands = commands;
  }

  @GetMapping
  @Operation(summary = "Lista produtos com paginação, busca e filtros")
  public PageResponse<ProductResponse> list(
      @PathVariable UUID establishmentId,
      @RequestParam(required = false) UUID categoryId,
      @RequestParam(required = false) Boolean available,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "false") boolean includeInactive,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<CatalogProduct> products =
        queries.listProducts(
            currentUser.requireUserId(),
            establishmentId,
            new ProductFilter(categoryId, available, q, includeInactive, page, size));
    Map<UUID, List<ProductVariant>> variants =
        queries.variantsByProduct(products.getContent().stream().map(CatalogProduct::id).toList());
    return PageResponse.from(
        products.map(
            product -> ProductResponse.from(product, variants.getOrDefault(product.id(), List.of()))));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Cria produto e variações")
  public ProductResponse create(@PathVariable UUID establishmentId, @Valid @RequestBody ProductRequest request) {
    CatalogProduct product =
        commands.createProduct(currentUser.requireUserId(), establishmentId, request.toCommand());
    return ProductResponse.from(product, queries.variantsFor(product.id()));
  }

  @GetMapping("/{productId}")
  @Operation(summary = "Consulta detalhe do produto")
  public ProductResponse get(@PathVariable UUID establishmentId, @PathVariable UUID productId) {
    CatalogProduct product = queries.getProduct(currentUser.requireUserId(), establishmentId, productId);
    return ProductResponse.from(product, queries.variantsFor(product.id()));
  }

  @PatchMapping("/{productId}")
  @Operation(summary = "Edita produto")
  public ProductResponse update(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @Valid @RequestBody ProductRequest request) {
    CatalogProduct product =
        commands.updateProduct(currentUser.requireUserId(), establishmentId, productId, request.toCommand());
    return ProductResponse.from(product, queries.variantsFor(product.id()));
  }

  @PatchMapping("/{productId}/availability")
  @Operation(summary = "Altera disponibilidade do produto")
  public ProductResponse availability(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @Valid @RequestBody AvailabilityRequest request) {
    CatalogProduct product =
        commands.changeAvailability(
            currentUser.requireUserId(), establishmentId, productId, request.available(), request.version());
    return ProductResponse.from(product, queries.variantsFor(product.id()));
  }

  @PatchMapping("/{productId}/status")
  @Operation(summary = "Ativa ou desativa produto")
  public ProductResponse status(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @Valid @RequestBody StatusRequest request) {
    CatalogProduct product =
        commands.changeProductStatus(currentUser.requireUserId(), establishmentId, productId, request.status());
    return ProductResponse.from(product, queries.variantsFor(product.id()));
  }

  @PostMapping("/{productId}/variants")
  @ResponseStatus(HttpStatus.CREATED)
  public VariantResponse createVariant(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @Valid @RequestBody VariantRequest request) {
    return VariantResponse.from(
        commands.createVariant(currentUser.requireUserId(), establishmentId, productId, request.toCommand()));
  }

  @PatchMapping("/{productId}/variants/{variantId}")
  public VariantResponse updateVariant(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @PathVariable UUID variantId,
      @Valid @RequestBody VariantRequest request) {
    return VariantResponse.from(
        commands.updateVariant(
            currentUser.requireUserId(), establishmentId, productId, variantId, request.toCommand()));
  }

  @PatchMapping("/{productId}/variants/{variantId}/status")
  public VariantResponse variantStatus(
      @PathVariable UUID establishmentId,
      @PathVariable UUID productId,
      @PathVariable UUID variantId,
      @Valid @RequestBody StatusRequest request) {
    return VariantResponse.from(
        commands.changeVariantStatus(
            currentUser.requireUserId(), establishmentId, productId, variantId, request.status()));
  }
}
