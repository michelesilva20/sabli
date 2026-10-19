package dev.emilabs.sabli.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CatalogIsolationTests extends CatalogSupport {

  @Test
  void categoryAndProductCrudRespectAvailabilityAndPagination() throws Exception {
    Tenant tenant = registerTenant("cat");
    JsonNode category = createCategory(tenant, "Bebidas", "bebidas");
    JsonNode product =
        postJson(
            tenant.accessToken(),
            catalog(tenant.establishmentId(), "/products"),
            """
            {"categoryId":"%s","name":"Refrigerante","priceCents":800,"available":true}
            """.formatted(category.get("id").asText()),
            201);
    assertThat(product.get("priceCents").asInt()).isEqualTo(800);
    mockMvc
        .perform(
            patch(catalog(tenant.establishmentId(), "/products/" + product.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"available\":false,\"version\":%d}".formatted(product.get("version").asInt())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.available").value(false));
    mockMvc
        .perform(
            get(catalog(tenant.establishmentId(), "/products?available=true&q=Refri"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));
    mockMvc
        .perform(
            get(catalog(tenant.establishmentId(), "/products?q=Refri"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].name").value("Refrigerante"))
        .andExpect(jsonPath("$.page").value(0));
  }

  @Test
  void waiterCannotChangePricesAndCashierCannotAdministerCatalog() throws Exception {
    Tenant owner = registerTenant("own");
    Tenant other = registerTenant("wai");
    JsonNode category = createCategory(owner, "Entradas", "entradas");
    JsonNode product =
        postJson(
            owner.accessToken(),
            catalog(owner.establishmentId(), "/products"),
            """
            {"categoryId":"%s","name":"Bruschetta","priceCents":1900}
            """.formatted(category.get("id").asText()),
            201);
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"WAITER\"}".formatted(other.email())))
        .andExpect(status().isOk());
    String waiterToken = login(other.email());
    mockMvc
        .perform(
            get(catalog(owner.establishmentId(), "/products/" + product.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch(catalog(owner.establishmentId(), "/products/" + product.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"categoryId":"%s","name":"Bruschetta","priceCents":1}
                    """.formatted(category.get("id").asText())))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"CASHIER\"}".formatted(other.email())))
        .andExpect(status().isOk());
    String cashierToken = login(other.email());
    mockMvc
        .perform(
            post(catalog(owner.establishmentId(), "/categories"))
                .header(HttpHeaders.AUTHORIZATION, bearer(cashierToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nova\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void tenantsAndSisterEstablishmentsCannotSeeEachOtherCatalog() throws Exception {
    Tenant alpha = registerTenant("cata");
    Tenant beta = registerTenant("catb");
    JsonNode category = createCategory(alpha, "Pizzas", "pizzas");
    JsonNode product =
        postJson(
            alpha.accessToken(),
            catalog(alpha.establishmentId(), "/products"),
            """
            {"categoryId":"%s","name":"Calabresa","priceCents":5890}
            """.formatted(category.get("id").asText()),
            201);
    mockMvc
        .perform(
            get(catalog(alpha.establishmentId(), "/products/" + product.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(beta.accessToken())))
        .andExpect(status().isNotFound());
    JsonNode sister =
        postJson(
            alpha.accessToken(),
            "/api/v1/organizations/" + alpha.organizationId() + "/establishments",
            "{\"name\":\"Filial\",\"slug\":\"filial\"}",
            201);
    UUID sisterId = UUID.fromString(sister.get("id").asText());
    mockMvc
        .perform(
            get(catalog(sisterId, "/products/" + product.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post(catalog(alpha.establishmentId(), "/products"))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"categoryId":"%s","name":"Invasor","priceCents":1000}
                    """.formatted(UUID.randomUUID())))
        .andExpect(status().isNotFound());
  }

  @Test
  void rejectsNegativePriceAndStaleProductVersion() throws Exception {
    Tenant tenant = registerTenant("neg");
    JsonNode category = createCategory(tenant, "Doces", "doces");
    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/products"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"categoryId":"%s","name":"Pudim","priceCents":-10}
                    """.formatted(category.get("id").asText())))
        .andExpect(status().isBadRequest());
    JsonNode product =
        postJson(
            tenant.accessToken(),
            catalog(tenant.establishmentId(), "/products"),
            """
            {"categoryId":"%s","name":"Pudim","priceCents":1200}
            """.formatted(category.get("id").asText()),
            201);
    mockMvc
        .perform(
            patch(catalog(tenant.establishmentId(), "/products/" + product.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"available\":false,\"version\":%d}".formatted(product.get("version").asInt())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch(catalog(tenant.establishmentId(), "/products/" + product.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"available\":true,\"version\":%d}".formatted(product.get("version").asInt())))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_VERSION"));
  }

  @Test
  void pizzaQuoteUsesServerPricesAndRejectsForeignOrUnavailableOptions() throws Exception {
    Tenant tenant = registerTenant("pzz");
    PizzaIds ids = seedPizza(tenant);
    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s","%s"],"crustId":"%s","extraIds":["%s"],"quantity":2}
                    """
                        .formatted(ids.grandeId, ids.calabresaId, ids.quatroId, ids.catupiryId, ids.baconId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.flavorsCents").value(6790))
        .andExpect(jsonPath("$.crustCents").value(800))
        .andExpect(jsonPath("$.extrasCents").value(500))
        .andExpect(jsonPath("$.unitCents").value(8090))
        .andExpect(jsonPath("$.totalCents").value(16180))
        .andExpect(jsonPath("$.strategy").value("HIGHEST"));

    mockMvc
        .perform(
            patch(catalog(tenant.establishmentId(), "/pizza/settings"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"strategy\":\"AVERAGE\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s","%s"],"crustId":"%s","extraIds":[],"quantity":1}
                    """
                        .formatted(ids.grandeId, ids.calabresaId, ids.mucarelaId, ids.tradicionalId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.flavorsCents").value(5690))
        .andExpect(jsonPath("$.crustCents").value(0));

    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s"],"quantity":1}
                    """.formatted(ids.mediaId, ids.quatroId)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.flavorsCents").value(5432));

    Tenant other = registerTenant("pzx");
    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(other.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s"],"quantity":1}
                    """.formatted(ids.grandeId, ids.calabresaId)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s","%s"],"quantity":1}
                    """.formatted(ids.brotoId, ids.calabresaId, ids.quatroId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("QUOTE_INVALID"));
  }

  @Test
  void suspendedEstablishmentBlocksCatalog() throws Exception {
    Tenant tenant = registerTenant("susc");
    mockMvc
        .perform(
            patch("/api/v1/establishments/" + tenant.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(catalog(tenant.establishmentId(), "/categories"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_SUSPENDED"));
  }

  @Test
  void unavailablePizzaOptionIsRejected() throws Exception {
    Tenant tenant = registerTenant("unp");
    PizzaIds ids = seedPizza(tenant);
    mockMvc
        .perform(
            patch(catalog(tenant.establishmentId(), "/pizza/flavors/" + ids.calabresaId))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Calabresa\",\"available\":false,\"referencePriceCents\":5890}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(catalog(tenant.establishmentId(), "/pizza/quotes"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"sizeId":"%s","flavorIds":["%s"],"quantity":1}
                    """.formatted(ids.grandeId, ids.calabresaId)))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OPTION_UNAVAILABLE"));
  }

  private JsonNode createCategory(Tenant tenant, String name, String slug) throws Exception {
    return postJson(
        tenant.accessToken(),
        catalog(tenant.establishmentId(), "/categories"),
        "{\"name\":\"%s\",\"slug\":\"%s\"}".formatted(name, slug),
        201);
  }

  private PizzaIds seedPizza(Tenant tenant) throws Exception {
    String token = tenant.accessToken();
    UUID est = tenant.establishmentId();
    String grande =
        postJson(
                token,
                catalog(est, "/pizza/sizes"),
                """
                {"code":"grande","name":"Grande","maxFlavors":3,"slices":8,"priceFactorNumerator":1,"priceFactorDenominator":1,"sortOrder":3}
                """,
                201)
            .get("id")
            .asText();
    String media =
        postJson(
                token,
                catalog(est, "/pizza/sizes"),
                """
                {"code":"media","name":"Media","maxFlavors":2,"slices":6,"priceFactorNumerator":4,"priceFactorDenominator":5,"sortOrder":2}
                """,
                201)
            .get("id")
            .asText();
    String broto =
        postJson(
                token,
                catalog(est, "/pizza/sizes"),
                """
                {"code":"broto","name":"Broto","maxFlavors":1,"slices":4,"priceFactorNumerator":3,"priceFactorDenominator":5,"sortOrder":1}
                """,
                201)
            .get("id")
            .asText();
    String calabresa =
        postJson(
                token,
                catalog(est, "/pizza/flavors"),
                "{\"name\":\"Calabresa\",\"slug\":\"calabresa\",\"referencePriceCents\":5890}",
                201)
            .get("id")
            .asText();
    String mucarela =
        postJson(
                token,
                catalog(est, "/pizza/flavors"),
                "{\"name\":\"Mucarela\",\"slug\":\"mucarela\",\"referencePriceCents\":5490}",
                201)
            .get("id")
            .asText();
    String quatro =
        postJson(
                token,
                catalog(est, "/pizza/flavors"),
                "{\"name\":\"Quatro queijos\",\"slug\":\"quatro\",\"referencePriceCents\":6790}",
                201)
            .get("id")
            .asText();
    String tradicional =
        postJson(
                token,
                catalog(est, "/pizza/crusts"),
                "{\"name\":\"Tradicional\",\"slug\":\"tradicional\",\"priceCents\":0}",
                201)
            .get("id")
            .asText();
    String catupiry =
        postJson(
                token,
                catalog(est, "/pizza/crusts"),
                "{\"name\":\"Catupiry\",\"slug\":\"catupiry\",\"priceCents\":800}",
                201)
            .get("id")
            .asText();
    String bacon =
        postJson(
                token,
                catalog(est, "/pizza/extras"),
                "{\"name\":\"Bacon\",\"slug\":\"bacon\",\"priceCents\":500}",
                201)
            .get("id")
            .asText();
    return new PizzaIds(grande, media, broto, calabresa, mucarela, quatro, tradicional, catupiry, bacon);
  }

  private record PizzaIds(
      String grandeId,
      String mediaId,
      String brotoId,
      String calabresaId,
      String mucarelaId,
      String quatroId,
      String tradicionalId,
      String catupiryId,
      String baconId) {}
}
