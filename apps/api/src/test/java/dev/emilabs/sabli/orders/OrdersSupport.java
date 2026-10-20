package dev.emilabs.sabli.orders;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.emilabs.sabli.AbstractIntegrationTest;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class OrdersSupport extends AbstractIntegrationTest {

  @Autowired
  MockMvc mockMvc;

  @Autowired
  JdbcTemplate jdbcTemplate;

  protected final ObjectMapper objectMapper = new ObjectMapper();

  protected Tenant registerTenant(String prefix) throws Exception {
    String key = prefix + UUID.randomUUID().toString().substring(0, 8);
    String body =
        """
        {
          "organizationName": "Org %s",
          "organizationSlug": "org-%s",
          "establishmentName": "Loja %s",
          "establishmentSlug": "loja-%s",
          "name": "Admin %s",
          "email": "admin-%s@example.com",
          "password": "password10"
        }
        """
            .formatted(key, key, key, key, key, key);
    MvcResult result =
        mockMvc
            .perform(post("/api/v1/auth/register-organization").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
    JsonNode me =
        objectMapper.readTree(
            mockMvc
                .perform(
                    org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(json.get("accessToken").asText())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    return new Tenant(
        json.get("accessToken").asText(),
        "admin-%s@example.com".formatted(key),
        UUID.fromString(me.get("user").get("id").asText()),
        UUID.fromString(me.get("organizations").get(0).get("id").asText()),
        UUID.fromString(me.get("establishments").get(0).get("id").asText()));
  }

  protected String login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"%s\",\"password\":\"password10\"}".formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  protected JsonNode postJson(String token, String path, String body, int status) throws Exception {
    return postJson(token, path, body, status, null);
  }

  protected JsonNode postJson(String token, String path, String body, int status, String idempotencyKey)
      throws Exception {
    var request =
        post(path)
            .header(HttpHeaders.AUTHORIZATION, bearer(token))
            .contentType(MediaType.APPLICATION_JSON)
            .content(body);
    if (idempotencyKey != null) {
      request.header("Idempotency-Key", idempotencyKey);
    }
    MvcResult result =
        mockMvc
            .perform(request)
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().is(status))
            .andReturn();
    String content = result.getResponse().getContentAsString();
    return content.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(content);
  }

  protected void assignRole(Tenant owner, String email, String role) throws Exception {
    mockMvc
        .perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(
                    "/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"%s\"}".formatted(email, role)))
        .andExpect(status().isOk());
  }

  protected JsonNode createTable(Tenant tenant, int number) throws Exception {
    return postJson(
        tenant.accessToken(),
        "/api/v1/establishments/" + tenant.establishmentId() + "/tables",
        "{\"number\":%d,\"seats\":4,\"area\":\"Salão\"}".formatted(number),
        201);
  }

  protected JsonNode openService(Tenant tenant, String tableId) throws Exception {
    return postJson(
        tenant.accessToken(),
        "/api/v1/establishments/" + tenant.establishmentId() + "/tables/" + tableId + "/service",
        "{\"guests\":2}",
        201);
  }

  protected JsonNode createDrink(Tenant tenant) throws Exception {
    String slug = "bebida-" + UUID.randomUUID().toString().substring(0, 8);
    JsonNode category =
        postJson(
            tenant.accessToken(),
            catalog(tenant.establishmentId(), "/categories"),
            "{\"name\":\"Bebidas\",\"slug\":\"%s\"}".formatted(slug),
            201);
    return postJson(
        tenant.accessToken(),
        catalog(tenant.establishmentId(), "/products"),
        """
        {"categoryId":"%s","name":"Refrigerante %s","priceCents":800,"available":true}
        """.formatted(category.get("id").asText(), slug),
        201);
  }

  protected PizzaIds seedPizza(Tenant tenant) throws Exception {
    String token = tenant.accessToken();
    UUID est = tenant.establishmentId();
    JsonNode category =
        postJson(token, catalog(est, "/categories"), "{\"name\":\"Pizzas\",\"slug\":\"pizzas\"}", 201);
    JsonNode product =
        postJson(
            token,
            catalog(est, "/products"),
            """
            {"categoryId":"%s","name":"Pizza","kind":"PIZZA","priceCents":0}
            """.formatted(category.get("id").asText()),
            201);
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
    String calabresa =
        postJson(
                token,
                catalog(est, "/pizza/flavors"),
                "{\"name\":\"Calabresa\",\"slug\":\"calabresa\",\"referencePriceCents\":5890}",
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
    return new PizzaIds(
        product.get("id").asText(), grande, calabresa, quatro, tradicional, catupiry, bacon);
  }

  protected String catalog(UUID establishmentId, String suffix) {
    return "/api/v1/establishments/" + establishmentId + "/catalog" + suffix;
  }

  protected String orders(UUID establishmentId) {
    return "/api/v1/establishments/" + establishmentId + "/orders";
  }

  protected String tickets(UUID establishmentId) {
    return "/api/v1/establishments/" + establishmentId + "/kitchen/tickets";
  }

  protected String bearer(String accessToken) {
    return "Bearer " + accessToken;
  }

  protected record Tenant(String accessToken, String email, UUID userId, UUID organizationId, UUID establishmentId) {}

  protected record PizzaIds(
      String productId,
      String grandeId,
      String calabresaId,
      String quatroId,
      String tradicionalId,
      String catupiryId,
      String baconId) {}
}
