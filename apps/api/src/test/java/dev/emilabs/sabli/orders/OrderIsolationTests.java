package dev.emilabs.sabli.orders;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrderIsolationTests extends OrdersSupport {

  @Test
  void confirmsTableAndCounterOrdersWithFrozenPrices() throws Exception {
    Tenant tenant = registerTenant("ord");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 3);
    JsonNode service = openService(tenant, table.get("id").asText());
    JsonNode tableOrder =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":2}]}
            """.formatted(service.get("id").asText(), drink.get("id").asText()),
            201,
            "key-table-1");
    assertThat(tableOrder.get("channel").asText()).isEqualTo("TABLE");
    assertThat(tableOrder.get("totalCents").asInt()).isEqualTo(1600);
    assertThat(tableOrder.get("discountCents").asInt()).isEqualTo(0);
    assertThat(tableOrder.get("items").get(0).get("unitPriceCents").asInt()).isEqualTo(800);
    String variantId = drink.get("variants").get(0).get("id").asText();
    mockMvc
        .perform(
            patch("/api/v1/establishments/"
                    + tenant.establishmentId()
                    + "/catalog/products/"
                    + drink.get("id").asText()
                    + "/variants/"
                    + variantId)
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Padrão\",\"priceCents\":1}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(orders(tenant.establishmentId()) + "/" + tableOrder.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalCents").value(1600))
        .andExpect(jsonPath("$.items[0].unitPriceCents").value(800));
    JsonNode counter =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
            """.formatted(drink.get("id").asText()),
            201,
            "key-counter-1");
    assertThat(counter.get("channel").asText()).isEqualTo("COUNTER");
    assertThat(counter.path("tableServiceId").isMissingNode() || counter.path("tableServiceId").isNull()).isTrue();
    assertThat(counter.get("totalCents").asInt()).isEqualTo(1);
  }

  @Test
  void pricesPizzaWithTwoFlavorsCrustExtrasAndQuantity() throws Exception {
    Tenant tenant = registerTenant("pzz");
    PizzaIds pizza = seedPizza(tenant);
    JsonNode table = createTable(tenant, 1);
    JsonNode service = openService(tenant, table.get("id").asText());
    JsonNode order =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"TABLE","tableServiceId":"%s","items":[{
              "productId":"%s","quantity":2,
              "pizza":{"sizeId":"%s","flavorIds":["%s","%s"],"crustId":"%s","extraIds":["%s"]}
            }]}
            """.formatted(
                service.get("id").asText(),
                pizza.productId(),
                pizza.grandeId(),
                pizza.calabresaId(),
                pizza.quatroId(),
                pizza.catupiryId(),
                pizza.baconId()),
            201,
            "pizza-paid");
    assertThat(order.get("items").get(0).get("pizza").get("flavors").size()).isEqualTo(2);
    assertThat(order.get("items").get(0).get("unitPriceCents").asInt()).isEqualTo(6790 + 800 + 500);
    assertThat(order.get("totalCents").asInt()).isEqualTo((6790 + 800 + 500) * 2);
    JsonNode free =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"COUNTER","items":[{
              "productId":"%s","quantity":1,
              "pizza":{"sizeId":"%s","flavorIds":["%s"],"crustId":"%s"}
            }]}
            """.formatted(pizza.productId(), pizza.grandeId(), pizza.calabresaId(), pizza.tradicionalId()),
            201,
            "pizza-free");
    assertThat(free.get("items").get(0).get("pizza").get("crust").get("priceCents").asInt()).isEqualTo(0);
    assertThat(free.get("totalCents").asInt()).isEqualTo(5890);
  }

  @Test
  void rejectsUnavailableProductClosedServiceAndForeignService() throws Exception {
    Tenant alpha = registerTenant("reja");
    Tenant beta = registerTenant("rejb");
    JsonNode drink = createDrink(alpha);
    mockMvc
        .perform(
            patch("/api/v1/establishments/"
                    + alpha.establishmentId()
                    + "/catalog/products/"
                    + drink.get("id").asText()
                    + "/availability")
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"available\":false,\"version\":%d}".formatted(drink.get("version").asInt())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(orders(alpha.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .header("Idempotency-Key", "unav")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(drink.get("id").asText())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OPTION_UNAVAILABLE"));
    JsonNode table = createTable(alpha, 4);
    JsonNode service = openService(alpha, table.get("id").asText());
    postJson(
        alpha.accessToken(),
        "/api/v1/establishments/" + alpha.establishmentId() + "/tables/" + table.get("id").asText() + "/service/bill",
        "{}",
        200);
    JsonNode drink2 = createDrink(alpha);
    mockMvc
        .perform(
            post(orders(alpha.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .header("Idempotency-Key", "bill")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(service.get("id").asText(), drink2.get("id").asText())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("SERVICE_AWAITING_BILL"));
    mockMvc
        .perform(
            post(orders(alpha.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .header("Idempotency-Key", "missing")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(UUID.randomUUID(), drink2.get("id").asText())))
        .andExpect(status().isNotFound());
    JsonNode betaDrink = createDrink(beta);
    JsonNode betaTable = createTable(beta, 1);
    JsonNode betaService = openService(beta, betaTable.get("id").asText());
    mockMvc
        .perform(
            post(orders(alpha.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .header("Idempotency-Key", "cross")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(betaService.get("id").asText(), drink2.get("id").asText())))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            get(orders(alpha.establishmentId()) + "/" + UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(beta.accessToken())))
        .andExpect(status().isNotFound());
  }

  @Test
  void idempotencyReturnsSameOrderAndConflictsOnDivergentPayload() throws Exception {
    Tenant tenant = registerTenant("idp");
    JsonNode drink = createDrink(tenant);
    String body =
        """
        {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
        """.formatted(drink.get("id").asText());
    JsonNode first = postJson(tenant.accessToken(), orders(tenant.establishmentId()), body, 201, "same-key");
    JsonNode replay = postJson(tenant.accessToken(), orders(tenant.establishmentId()), body, 200, "same-key");
    assertThat(replay.get("id").asText()).isEqualTo(first.get("id").asText());
    mockMvc
        .perform(
            post(orders(tenant.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "same-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"COUNTER","items":[{"productId":"%s","quantity":2}]}
                    """.formatted(drink.get("id").asText())))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
  }

  @Test
  void concurrentRetryDoesNotDuplicateOrder() throws Exception {
    Tenant tenant = registerTenant("ccr");
    JsonNode drink = createDrink(tenant);
    String path = orders(tenant.establishmentId());
    String body =
        """
        {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
        """.formatted(drink.get("id").asText());
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    try {
      Future<Integer> first = pool.submit(() -> postStatus(tenant.accessToken(), path, body, "race-key", start));
      Future<Integer> second = pool.submit(() -> postStatus(tenant.accessToken(), path, body, "race-key", start));
      start.countDown();
      assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
          .containsOnly(201, 200);
    } finally {
      pool.shutdownNow();
    }
    mockMvc
        .perform(get(path).header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void kitchenAdvancesItemsAndTicketWithoutSkipping() throws Exception {
    Tenant tenant = registerTenant("kds");
    JsonNode drink = createDrink(tenant);
    JsonNode soda =
        postJson(
            tenant.accessToken(),
            catalog(tenant.establishmentId(), "/products"),
            """
            {"categoryId":"%s","name":"Água","priceCents":500}
            """.formatted(drink.get("categoryId").asText()),
            201);
    JsonNode order =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"COUNTER","items":[
              {"productId":"%s","quantity":1},
              {"productId":"%s","quantity":1}
            ]}
            """.formatted(drink.get("id").asText(), soda.get("id").asText()),
            201,
            "kds-1");
    String ticketId = order.get("ticketId").asText();
    String itemId = order.get("items").get(0).get("ticketItemId").asText();
    int version = order.get("items").get(0).get("ticketItemVersion").asInt();
    mockMvc
        .perform(
            post(tickets(tenant.establishmentId()) + "/" + ticketId + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.productionStatus").value("PREPARING"));
    mockMvc
        .perform(
            post(tickets(tenant.establishmentId()) + "/" + ticketId + "/items/" + itemId + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":%d}".formatted(version)))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_VERSION"));
    JsonNode current =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(tickets(tenant.establishmentId()) + "/" + ticketId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    int freshVersion = current.get("items").get(0).get("ticketItemVersion").asInt();
    mockMvc
        .perform(
            post(tickets(tenant.establishmentId()) + "/" + ticketId + "/items/" + itemId + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":%d}".formatted(freshVersion)))
        .andExpect(status().isOk());
    JsonNode mixed =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(tickets(tenant.establishmentId()) + "/" + ticketId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productionStatus").value("PREPARING"))
                .andReturn()
                .getResponse()
                .getContentAsString());
    assertThat(mixed.get("items").findValuesAsText("productionStatus"))
        .containsExactlyInAnyOrder("READY", "PREPARING");
    mockMvc
        .perform(
            post(tickets(tenant.establishmentId()) + "/" + ticketId + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.productionStatus").value("READY"));
  }

  @Test
  void rbacAndSisterEstablishmentIsolation() throws Exception {
    Tenant owner = registerTenant("rbac");
    Tenant other = registerTenant("staff");
    JsonNode drink = createDrink(owner);
    assignRole(owner, other.email(), "KITCHEN");
    String kitchen = login(other.email());
    mockMvc
        .perform(
            post(orders(owner.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchen))
                .header("Idempotency-Key", "kitch")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(drink.get("id").asText())))
        .andExpect(status().isForbidden());
    assignRole(owner, other.email(), "WAITER");
    String waiter = login(other.email());
    JsonNode placed =
        postJson(
            waiter,
            orders(owner.establishmentId()),
            """
            {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
            """.formatted(drink.get("id").asText()),
            201,
            "waiter-1");
    mockMvc
        .perform(
            post(tickets(owner.establishmentId()) + "/" + placed.get("ticketId").asText() + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(waiter))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isForbidden());
    assignRole(owner, other.email(), "KITCHEN");
    String kitchen2 = login(other.email());
    mockMvc
        .perform(
            post(tickets(owner.establishmentId()) + "/" + placed.get("ticketId").asText() + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchen2))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isOk());
    JsonNode sister =
        postJson(
            owner.accessToken(),
            "/api/v1/organizations/" + owner.organizationId() + "/establishments",
            "{\"name\":\"Filial\",\"slug\":\"filial\"}",
            201);
    mockMvc
        .perform(
            get("/api/v1/establishments/" + sister.get("id").asText() + "/orders/" + placed.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken())))
        .andExpect(status().isNotFound());
  }

  @Test
  void deliveredItemCannotAdvanceFurther() throws Exception {
    Tenant tenant = registerTenant("end");
    JsonNode drink = createDrink(tenant);
    JsonNode order =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
            """.formatted(drink.get("id").asText()),
            201,
            "end-1");
    String ticketId = order.get("ticketId").asText();
    for (int i = 0; i < 3; i++) {
      mockMvc
          .perform(
              post(tickets(tenant.establishmentId()) + "/" + ticketId + "/advance")
                  .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{}"))
          .andExpect(status().isOk());
    }
    mockMvc
        .perform(
            get(orders(tenant.establishmentId()) + "/" + order.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(jsonPath("$.productionStatus").value("DELIVERED"));
    mockMvc
        .perform(
            post(tickets(tenant.establishmentId()) + "/" + ticketId + "/advance")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INVALID_TRANSITION"));
  }

  private int postStatus(String token, String path, String body, String key, CountDownLatch start) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc
        .perform(
            post(path)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
        .andReturn()
        .getResponse()
        .getStatus();
  }
}
