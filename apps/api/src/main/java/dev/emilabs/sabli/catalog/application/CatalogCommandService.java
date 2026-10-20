package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.catalog.domain.CatalogCategory;
import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import dev.emilabs.sabli.catalog.domain.CatalogStatus;
import dev.emilabs.sabli.catalog.domain.ProductKind;
import dev.emilabs.sabli.catalog.domain.ProductVariant;
import dev.emilabs.sabli.catalog.persistence.CatalogCategoryRepository;
import dev.emilabs.sabli.catalog.persistence.CatalogProductRepository;
import dev.emilabs.sabli.catalog.persistence.ProductVariantRepository;
import dev.emilabs.sabli.identity.domain.Establishment;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogCommandService {

  private final CatalogAccess access;
  private final CatalogCategoryRepository categories;
  private final CatalogProductRepository products;
  private final ProductVariantRepository variants;

  public CatalogCommandService(
      CatalogAccess access,
      CatalogCategoryRepository categories,
      CatalogProductRepository products,
      ProductVariantRepository variants) {
    this.access = access;
    this.categories = categories;
    this.products = products;
    this.variants = variants;
  }

  @Transactional
  public CatalogCategory createCategory(UUID userId, UUID establishmentId, CategoryCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (categories.existsByEstablishmentIdAndSlug(establishmentId, slug)) {
      throw ApiException.conflict("Já existe uma categoria com este identificador.");
    }
    return categories.save(
        CatalogCategory.create(
            establishment.id(),
            establishment.organizationId(),
            command.name().trim(),
            slug,
            command.sortOrder()));
  }

  @Transactional
  public CatalogCategory updateCategory(UUID userId, UUID establishmentId, UUID categoryId, CategoryCommand command) {
    access.requireWrite(userId, establishmentId);
    CatalogCategory category = requireCategory(establishmentId, categoryId);
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (categories.existsByEstablishmentIdAndSlugAndIdNot(establishmentId, slug, categoryId)) {
      throw ApiException.conflict("Já existe uma categoria com este identificador.");
    }
    category.rename(command.name().trim(), slug, command.sortOrder());
    return category;
  }

  @Transactional
  public CatalogCategory changeCategoryStatus(
      UUID userId, UUID establishmentId, UUID categoryId, CatalogStatus status) {
    access.requireWrite(userId, establishmentId);
    CatalogCategory category = requireCategory(establishmentId, categoryId);
    category.changeStatus(status);
    return category;
  }

  @Transactional
  public CatalogProduct createProduct(UUID userId, UUID establishmentId, ProductCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    CatalogCategory category = requireActiveCategory(establishmentId, command.categoryId());
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (products.existsByEstablishmentIdAndSlug(establishmentId, slug)) {
      throw ApiException.conflict("Já existe um produto com este identificador.");
    }
    CatalogProduct product =
        products.save(
            CatalogProduct.create(
                establishment.id(),
                establishment.organizationId(),
                category.id(),
                command.name().trim(),
                slug,
                command.description() == null ? "" : command.description().trim(),
                command.kind() == null ? ProductKind.STANDARD : command.kind(),
                command.available() == null || command.available(),
                command.sortOrder()));
    List<VariantCommand> variantCommands = command.variants();
    if (variantCommands == null || variantCommands.isEmpty()) {
      if (command.priceCents() == null) {
        throw ApiException.badRequest("Informe o preço ou ao menos uma variação.");
      }
      variants.save(
          ProductVariant.create(
              product.id(),
              establishment.id(),
              establishment.organizationId(),
              "Padrão",
              Money.requireCents(command.priceCents()),
              true,
              0));
    } else {
      int order = 0;
      for (VariantCommand variant : variantCommands) {
        variants.save(
            ProductVariant.create(
                product.id(),
                establishment.id(),
                establishment.organizationId(),
                variant.name().trim(),
                Money.requireCents(variant.priceCents()),
                variant.available() == null || variant.available(),
                variant.sortOrder() == 0 ? order : variant.sortOrder()));
        order += 1;
      }
    }
    return product;
  }

  @Transactional
  public CatalogProduct updateProduct(UUID userId, UUID establishmentId, UUID productId, ProductCommand command) {
    access.requireWrite(userId, establishmentId);
    CatalogProduct product = requireProduct(establishmentId, productId);
    if (command.version() != null && command.version() != product.version()) {
      throw ApiException.staleVersion();
    }
    CatalogCategory category = requireActiveCategory(establishmentId, command.categoryId());
    String slug = CatalogSlugs.resolve(command.slug(), command.name());
    if (products.existsByEstablishmentIdAndSlugAndIdNot(establishmentId, slug, productId)) {
      throw ApiException.conflict("Já existe um produto com este identificador.");
    }
    product.update(
        category.id(),
        command.name().trim(),
        slug,
        command.description() == null ? "" : command.description().trim(),
        command.kind() == null ? product.kind() : command.kind(),
        command.sortOrder());
    if (command.available() != null) {
      product.changeAvailability(command.available());
    }
    return product;
  }

  @Transactional
  public CatalogProduct changeAvailability(
      UUID userId, UUID establishmentId, UUID productId, boolean available, Integer version) {
    access.requireWrite(userId, establishmentId);
    CatalogProduct product = requireProduct(establishmentId, productId);
    if (version != null && version != product.version()) {
      throw ApiException.staleVersion();
    }
    product.changeAvailability(available);
    return product;
  }

  @Transactional
  public CatalogProduct changeProductStatus(
      UUID userId, UUID establishmentId, UUID productId, CatalogStatus status) {
    access.requireWrite(userId, establishmentId);
    CatalogProduct product = requireProduct(establishmentId, productId);
    product.changeStatus(status);
    return product;
  }

  @Transactional
  public ProductVariant createVariant(UUID userId, UUID establishmentId, UUID productId, VariantCommand command) {
    Establishment establishment = access.requireWrite(userId, establishmentId);
    CatalogProduct product = requireProduct(establishmentId, productId);
    if (variants.existsByProductIdAndName(product.id(), command.name().trim())) {
      throw ApiException.conflict("Já existe uma variação com este nome.");
    }
    return variants.save(
        ProductVariant.create(
            product.id(),
            establishment.id(),
            establishment.organizationId(),
            command.name().trim(),
            Money.requireCents(command.priceCents()),
            command.available() == null || command.available(),
            command.sortOrder()));
  }

  @Transactional
  public ProductVariant updateVariant(
      UUID userId, UUID establishmentId, UUID productId, UUID variantId, VariantCommand command) {
    access.requireWrite(userId, establishmentId);
    requireProduct(establishmentId, productId);
    ProductVariant variant =
        variants.findByIdAndEstablishmentId(variantId, establishmentId).orElseThrow(ApiException::notFound);
    if (!variant.productId().equals(productId)) {
      throw ApiException.notFound();
    }
    if (variants.existsByProductIdAndNameAndIdNot(productId, command.name().trim(), variantId)) {
      throw ApiException.conflict("Já existe uma variação com este nome.");
    }
    variant.update(
        command.name().trim(),
        Money.requireCents(command.priceCents()),
        command.available() == null || command.available(),
        command.sortOrder());
    return variant;
  }

  @Transactional
  public ProductVariant changeVariantStatus(
      UUID userId, UUID establishmentId, UUID productId, UUID variantId, CatalogStatus status) {
    access.requireWrite(userId, establishmentId);
    requireProduct(establishmentId, productId);
    ProductVariant variant =
        variants.findByIdAndEstablishmentId(variantId, establishmentId).orElseThrow(ApiException::notFound);
    if (!variant.productId().equals(productId)) {
      throw ApiException.notFound();
    }
    variant.changeStatus(status);
    return variant;
  }

  private CatalogCategory requireCategory(UUID establishmentId, UUID categoryId) {
    return categories.findByIdAndEstablishmentId(categoryId, establishmentId).orElseThrow(ApiException::notFound);
  }

  private CatalogCategory requireActiveCategory(UUID establishmentId, UUID categoryId) {
    CatalogCategory category = requireCategory(establishmentId, categoryId);
    if (!category.isActive()) {
      throw ApiException.unprocessable("OPTION_UNAVAILABLE", "A categoria está desativada.");
    }
    return category;
  }

  private CatalogProduct requireProduct(UUID establishmentId, UUID productId) {
    return products.findByIdAndEstablishmentId(productId, establishmentId).orElseThrow(ApiException::notFound);
  }

  public record CategoryCommand(String name, String slug, int sortOrder) {}

  public record VariantCommand(String name, int priceCents, Boolean available, int sortOrder) {}

  public record ProductCommand(
      UUID categoryId,
      String name,
      String slug,
      String description,
      ProductKind kind,
      Boolean available,
      Integer priceCents,
      List<VariantCommand> variants,
      int sortOrder,
      Integer version) {}
}
