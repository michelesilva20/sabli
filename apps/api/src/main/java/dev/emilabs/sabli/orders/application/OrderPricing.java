package dev.emilabs.sabli.orders.application;

import dev.emilabs.sabli.catalog.application.PizzaCatalogService;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.QuoteCommand;
import dev.emilabs.sabli.catalog.application.PizzaCatalogService.QuoteSnapshot;
import dev.emilabs.sabli.catalog.domain.CatalogProduct;
import dev.emilabs.sabli.catalog.domain.ProductKind;
import dev.emilabs.sabli.catalog.domain.ProductVariant;
import dev.emilabs.sabli.catalog.persistence.CatalogProductRepository;
import dev.emilabs.sabli.catalog.persistence.ProductVariantRepository;
import dev.emilabs.sabli.shared.error.ApiException;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class OrderPricing {

  private final CatalogProductRepository products;
  private final ProductVariantRepository variants;
  private final PizzaCatalogService pizzaCatalog;

  public OrderPricing(
      CatalogProductRepository products, ProductVariantRepository variants, PizzaCatalogService pizzaCatalog) {
    this.products = products;
    this.variants = variants;
    this.pizzaCatalog = pizzaCatalog;
  }

  PricedLine price(UUID userId, UUID establishmentId, OrderCommandService.LineCommand line) {
    if (line.pizza() != null) {
      return pricePizza(userId, establishmentId, line);
    }
    return priceStandard(establishmentId, line);
  }

  private PricedLine priceStandard(UUID establishmentId, OrderCommandService.LineCommand line) {
    if (line.productId() == null) {
      throw ApiException.unprocessable("PRODUCT_REQUIRED", "Informe o produto do item.");
    }
    CatalogProduct product =
        products.findByIdAndEstablishmentId(line.productId(), establishmentId).orElseThrow(ApiException::notFound);
    if (!product.isActive() || !product.available()) {
      throw ApiException.unprocessable("OPTION_UNAVAILABLE", "O produto selecionado não está disponível.");
    }
    ProductVariant variant = resolveVariant(establishmentId, product.id(), line.variantId());
    if (!variant.isActive() || !variant.available()) {
      throw ApiException.unprocessable("OPTION_UNAVAILABLE", "A variação selecionada não está disponível.");
    }
    return new PricedLine(product, variant, null);
  }

  private PricedLine pricePizza(UUID userId, UUID establishmentId, OrderCommandService.LineCommand line) {
    CatalogProduct product = null;
    if (line.productId() != null) {
      product =
          products.findByIdAndEstablishmentId(line.productId(), establishmentId).orElseThrow(ApiException::notFound);
      if (!product.isActive() || !product.available()) {
        throw ApiException.unprocessable("OPTION_UNAVAILABLE", "O produto selecionado não está disponível.");
      }
      if (product.kind() != ProductKind.PIZZA) {
        throw ApiException.unprocessable("QUOTE_INVALID", "Somente produtos de pizza aceitam composição.");
      }
    }
    QuoteSnapshot quote =
        pizzaCatalog.quote(
            userId,
            establishmentId,
            new QuoteCommand(
                line.pizza().sizeId(),
                line.pizza().flavorIds(),
                line.pizza().crustId(),
                line.pizza().extraIds(),
                line.quantity()));
    return new PricedLine(product, null, quote);
  }

  private ProductVariant resolveVariant(UUID establishmentId, UUID productId, UUID variantId) {
    if (variantId != null) {
      ProductVariant variant =
          variants.findByIdAndEstablishmentId(variantId, establishmentId).orElseThrow(ApiException::notFound);
      if (!variant.productId().equals(productId)) {
        throw ApiException.notFound();
      }
      return variant;
    }
    return variants.findByProductIdOrderBySortOrderAscNameAscIdAsc(productId).stream()
        .filter(variant -> variant.isActive() && variant.available())
        .findFirst()
        .orElseThrow(() -> ApiException.unprocessable("OPTION_UNAVAILABLE", "O produto não possui variação disponível."));
  }

  record PricedLine(CatalogProduct product, ProductVariant variant, QuoteSnapshot quote) {
    boolean isPizza() {
      return quote != null;
    }

    int unitCents() {
      return isPizza() ? quote.result().unitCents() : variant.priceCents();
    }

    String productName() {
      if (product != null) {
        return product.name();
      }
      return "Pizza " + quote.size().name();
    }

    UUID productId() {
      return product == null ? null : product.id();
    }
  }
}

