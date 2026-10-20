package dev.emilabs.sabli.dining;

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

class DiningIsolationTests extends DiningSupport {

  @Test
  void tableCrudRespectsAvailabilityAndDerivedOccupancy() throws Exception {
    Tenant tenant = registerTenant("tbl");
    JsonNode table =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), ""),
            """
            {"number":3,"name":"Janela","seats":4,"area":"Salão Principal","layoutX":41,"layoutY":28}
            """,
            201);
    assertThat(table.get("occupancy").asText()).isEqualTo("AVAILABLE");
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"availability\":\"RESERVED\",\"version\":%d}".formatted(table.get("version").asInt())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.availability").value("RESERVED"))
        .andExpect(jsonPath("$.occupancy").value("RESERVED"));
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), ""))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].number").value(3))
        .andExpect(jsonPath("$[0].occupancy").value("RESERVED"));
  }

  @Test
  void inactiveAndUnavailableTablesRejectService() throws Exception {
    Tenant tenant = registerTenant("ina");
    JsonNode inactive = createTable(tenant, 1, 2);
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + inactive.get("id").asText() + "/status"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"INACTIVE\",\"version\":%d}".formatted(inactive.get("version").asInt())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + inactive.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("TABLE_INACTIVE"));
    JsonNode blocked = createTable(tenant, 2, 2);
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + blocked.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"availability\":\"UNAVAILABLE\",\"version\":%d}".formatted(blocked.get("version").asInt())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + blocked.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":1}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("TABLE_UNAVAILABLE"));
  }

  @Test
  void reservedTableOpensExplicitlyAndConsumesReservation() throws Exception {
    Tenant tenant = registerTenant("rsv");
    JsonNode table = createTable(tenant, 12, 4);
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/availability"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"availability\":\"RESERVED\",\"version\":%d}".formatted(table.get("version").asInt())))
        .andExpect(status().isOk());
    JsonNode service =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"),
            "{\"guests\":3}",
            201);
    assertThat(service.get("status").asText()).isEqualTo("OPEN");
    assertThat(service.get("guests").asInt()).isEqualTo(3);
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.occupancy").value("OCCUPIED"))
        .andExpect(jsonPath("$.availability").value("AVAILABLE"))
        .andExpect(jsonPath("$.activeService.id").value(service.get("id").asText()));
  }

  @Test
  void rejectsDuplicateOpenAndExcessGuests() throws Exception {
    Tenant tenant = registerTenant("dup");
    JsonNode table = createTable(tenant, 4, 2);
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"),
        "{\"guests\":2}",
        201);
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":1}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("TABLE_OCCUPIED"));
    JsonNode other = createTable(tenant, 5, 2);
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + other.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":4}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("GUESTS_EXCEED_CAPACITY"));
  }

  @Test
  void concurrentOpenCreatesASingleActiveService() throws Exception {
    Tenant tenant = registerTenant("ccr");
    JsonNode table = createTable(tenant, 8, 4);
    String path = tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service");
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    try {
      Future<Integer> first = pool.submit(() -> openStatus(tenant.accessToken(), path, start));
      Future<Integer> second = pool.submit(() -> openStatus(tenant.accessToken(), path, start));
      start.countDown();
      assertThat(List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS)))
          .containsExactlyInAnyOrder(201, 409);
    } finally {
      pool.shutdownNow();
    }
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/services"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1));
  }

  @Test
  void requestBillReopenPreservesHistoryAndCloseIsBlocked() throws Exception {
    Tenant tenant = registerTenant("bil");
    JsonNode table = createTable(tenant, 6, 4);
    JsonNode opened =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"),
            "{\"guests\":2}",
            201);
    JsonNode billed =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/bill"),
            "{}",
            200);
    assertThat(billed.get("status").asText()).isEqualTo("AWAITING_BILL");
    assertThat(billed.get("requestedBillAt").isNull()).isFalse();
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(jsonPath("$.occupancy").value("AWAITING_BILL"));
    JsonNode reopened =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/reopen"),
            "{}",
            200);
    assertThat(reopened.get("status").asText()).isEqualTo("OPEN");
    assertThat(reopened.get("id").asText()).isEqualTo(opened.get("id").asText());
    assertThat(reopened.get("requestedBillAt").isNull()).isFalse();
    assertThat(reopened.get("requestedBillAt").asText()).startsWith(billed.get("requestedBillAt").asText().substring(0, 19));
    JsonNode category =
        postJson(
            tenant.accessToken(),
            "/api/v1/establishments/" + tenant.establishmentId() + "/catalog/categories",
            "{\"name\":\"Bebidas\",\"slug\":\"bebidas-bil\"}",
            201);
    JsonNode drink =
        postJson(
            tenant.accessToken(),
            "/api/v1/establishments/" + tenant.establishmentId() + "/catalog/products",
            """
            {"categoryId":"%s","name":"Refri","priceCents":800,"available":true}
            """.formatted(category.get("id").asText()),
            201);
    mockMvc
        .perform(
            post("/api/v1/establishments/" + tenant.establishmentId() + "/orders")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "dining-unpaid")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(opened.get("id").asText(), drink.get("id").asText())))
        .andExpect(status().isCreated());
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CLOSE_REQUIRES_SETTLEMENT"));
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/services?page=0&size=10"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(1))
        .andExpect(jsonPath("$.items[0].id").value(opened.get("id").asText()))
        .andExpect(jsonPath("$.items[0].status").value("OPEN"));
  }

  @Test
  void waiterOpensServiceKitchenCannotAndCashierRequestsBill() throws Exception {
    Tenant owner = registerTenant("rbac");
    Tenant other = registerTenant("staff");
    JsonNode table = createTable(owner, 1, 4);
    assignRole(owner, other.email(), "KITCHEN");
    String kitchenToken = login(other.email());
    mockMvc
        .perform(
            get(tables(owner.establishmentId(), ""))
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchenToken)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(tables(owner.establishmentId(), "/" + table.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchenToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":2}"))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            post(tables(owner.establishmentId(), ""))
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchenToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"number\":9,\"seats\":2}"))
        .andExpect(status().isForbidden());
    assignRole(owner, other.email(), "WAITER");
    String waiterToken = login(other.email());
    mockMvc
        .perform(
            post(tables(owner.establishmentId(), ""))
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"number\":9,\"seats\":2}"))
        .andExpect(status().isForbidden());
    postJson(
        waiterToken,
        tables(owner.establishmentId(), "/" + table.get("id").asText() + "/service"),
        "{\"guests\":2}",
        201);
    assignRole(owner, other.email(), "CASHIER");
    String cashierToken = login(other.email());
    mockMvc
        .perform(
            post(tables(owner.establishmentId(), "/" + table.get("id").asText() + "/service/bill"))
                .header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("AWAITING_BILL"));
  }

  @Test
  void tenantsAndSisterEstablishmentsCannotSeeEachOtherTables() throws Exception {
    Tenant alpha = registerTenant("dina");
    Tenant beta = registerTenant("dinb");
    JsonNode table = createTable(alpha, 1, 2);
    mockMvc
        .perform(
            get(tables(alpha.establishmentId(), "/" + table.get("id").asText()))
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
            get(tables(sisterId, "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            post(tables(sisterId, "/" + table.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":1}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void suspendedEstablishmentBlocksDining() throws Exception {
    Tenant tenant = registerTenant("susd");
    createTable(tenant, 1, 2);
    mockMvc
        .perform(
            patch("/api/v1/establishments/" + tenant.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), ""))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_SUSPENDED"));
  }

  @Test
  void staleTableVersionIsRejected() throws Exception {
    Tenant tenant = registerTenant("stv");
    JsonNode table = createTable(tenant, 2, 4);
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"number":2,"seats":4,"name":"Primeira","version":%d}
                    """.formatted(table.get("version").asInt())))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"number":2,"seats":4,"name":"Obsoleta","version":%d}
                    """.formatted(table.get("version").asInt())))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("STALE_VERSION"));
  }

  @Test
  void concurrentBillAndReopenDoNotCorruptService() throws Exception {
    Tenant tenant = registerTenant("race");
    JsonNode table = createTable(tenant, 7, 4);
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"),
        "{\"guests\":2}",
        201);
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/bill"),
        "{}",
        200);
    String billPath = tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/bill");
    String reopenPath = tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/reopen");
    ExecutorService pool = Executors.newFixedThreadPool(2);
    CountDownLatch start = new CountDownLatch(1);
    try {
      Future<Integer> bill = pool.submit(() -> postStatus(tenant.accessToken(), billPath, start));
      Future<Integer> reopen = pool.submit(() -> postStatus(tenant.accessToken(), reopenPath, start));
      start.countDown();
      List<Integer> codes = List.of(bill.get(20, TimeUnit.SECONDS), reopen.get(20, TimeUnit.SECONDS));
      assertThat(codes).contains(200);
      assertThat(codes).containsAnyOf(200, 409, 422);
    } finally {
      pool.shutdownNow();
    }
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value(org.hamcrest.Matchers.anyOf(
            org.hamcrest.Matchers.is("OPEN"), org.hamcrest.Matchers.is("AWAITING_BILL"))));
  }

  @Test
  void emptyOpenBillIsNotSettledAndCloseRequiresExplicitReason() throws Exception {
    Tenant tenant = registerTenant("emp");
    JsonNode table = createTable(tenant, 4, 4);
    JsonNode opened =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service"),
            "{\"guests\":2}",
            201);
    mockMvc
        .perform(
            get("/api/v1/establishments/"
                + tenant.establishmentId()
                + "/table-services/"
                + opened.get("id").asText()
                + "/bill")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("OPEN"))
        .andExpect(jsonPath("$.settled").value(false))
        .andExpect(jsonPath("$.totalCents").value(0))
        .andExpect(jsonPath("$.paidCents").value(0))
        .andExpect(jsonPath("$.orders.length()").value(0));
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CLOSE_REQUIRES_SETTLEMENT"));
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"empty\":true}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CLOSE_EMPTY_REASON"));
    JsonNode closed =
        postJson(
            tenant.accessToken(),
            tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"),
            "{\"empty\":true,\"reason\":\"Cliente desistiu\"}",
            200);
    assertThat(closed.get("status").asText()).isEqualTo("CLOSED");
    assertThat(closed.get("closeKind").asText()).isEqualTo("EMPTY");
    assertThat(closed.get("closeReason").asText()).isEqualTo("Cliente desistiu");
    assertThat(closed.get("closedByName").asText()).startsWith("Admin ");
    assertThat(closed.get("closedByUserId").asText()).isEqualTo(tenant.userId().toString());
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.occupancy").value("AVAILABLE"));
    Integer payments =
        jdbcTemplate.queryForObject(
            "select count(*) from bill_payments p join bills b on b.id = p.bill_id where b.establishment_id = ?",
            Integer.class,
            tenant.establishmentId());
    Integer sales =
        jdbcTemplate.queryForObject(
            "select count(*) from cash_movements where establishment_id = ? and type = 'SALE'",
            Integer.class,
            tenant.establishmentId());
    assertThat(payments).isZero();
    assertThat(sales).isZero();
  }

  private int openStatus(String token, String path, CountDownLatch start) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc
        .perform(
            post(path)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guests\":1}"))
        .andReturn()
        .getResponse()
        .getStatus();
  }

  private int postStatus(String token, String path, CountDownLatch start) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc
        .perform(post(path).header(HttpHeaders.AUTHORIZATION, bearer(token)).contentType(MediaType.APPLICATION_JSON))
        .andReturn()
        .getResponse()
        .getStatus();
  }
}
