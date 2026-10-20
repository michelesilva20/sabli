package dev.emilabs.sabli.billing;

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

class BillingIsolationTests extends BillingSupport {

  @Test
  void tableBillSumsOrdersAndAppliesPartialFullCashChangeAndCardLimits() throws Exception {
    Tenant tenant = registerTenant("bill");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 1);
    JsonNode service = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 1, "ord-1");
    JsonNode first = objectMapper.readTree(
        mockMvc
            .perform(
                get(billForService(tenant.establishmentId(), service.get("id").asText()))
                    .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCents").value(800))
            .andExpect(jsonPath("$.discountCents").value(0))
            .andExpect(jsonPath("$.remainingCents").value(800))
            .andReturn()
            .getResponse()
            .getContentAsString());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 2, "ord-2");
    JsonNode bill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(tenant.establishmentId(), service.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCents").value(2400))
                .andExpect(jsonPath("$.orders.length()").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString());
    assertThat(bill.get("id").asText()).isEqualTo(first.get("id").asText());
    JsonNode cash = openCash(tenant, 5000);
    JsonNode partial =
        postJson(
            tenant.accessToken(),
            payments(tenant.establishmentId(), bill.get("id").asText()),
            "{\"method\":\"PIX\",\"tenderedCents\":400}",
            201,
            "pay-pix");
    assertThat(partial.get("appliedCents").asInt()).isEqualTo(400);
    assertThat(partial.get("captureKind").asText()).isEqualTo("MANUAL_DECLARED");
    mockMvc
        .perform(
            post(payments(tenant.establishmentId(), bill.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "pay-pix-over")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"PIX\",\"tenderedCents\":2500}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_REMAINING"));
    mockMvc
        .perform(
            post(payments(tenant.establishmentId(), bill.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "pay-card-over")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"DEBIT_CARD\",\"tenderedCents\":2500}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("OVER_REMAINING"));
    JsonNode cashPay =
        postJson(
            tenant.accessToken(),
            payments(tenant.establishmentId(), bill.get("id").asText()),
            "{\"method\":\"CASH\",\"tenderedCents\":2500}",
            201,
            "pay-cash");
    assertThat(cashPay.get("appliedCents").asInt()).isEqualTo(2000);
    assertThat(cashPay.get("changeCents").asInt()).isEqualTo(500);
    mockMvc
        .perform(
            get("/api/v1/establishments/" + tenant.establishmentId() + "/bills/" + bill.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SETTLED"))
        .andExpect(jsonPath("$.remainingCents").value(0))
        .andExpect(jsonPath("$.paidCents").value(2400));
    mockMvc
        .perform(
            get(cash(tenant.establishmentId()) + "/" + cash.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.expectedCashCents").value(7000))
        .andExpect(jsonPath("$.drawerCashCents").value(7000))
        .andExpect(jsonPath("$.totalsByMethod.CASH").value(2000))
        .andExpect(jsonPath("$.totalsByMethod.PIX").value(400));
  }

  @Test
  void cashSupplyBleedClosedAndDoubleOpen() throws Exception {
    Tenant tenant = registerTenant("csh");
    JsonNode session = openCash(tenant, 1000);
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + session.get("id").asText() + "/movements",
        "{\"type\":\"SUPPLY\",\"amountCents\":500}",
        200);
    mockMvc
        .perform(
            get(cash(tenant.establishmentId()) + "/current")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.expectedCashCents").value(1500));
    mockMvc
        .perform(
            post(cash(tenant.establishmentId()) + "/" + session.get("id").asText() + "/movements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"BLEED\",\"amountCents\":2000}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("INSUFFICIENT_CASH"));
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + session.get("id").asText() + "/movements",
        "{\"type\":\"BLEED\",\"amountCents\":400}",
        200);
    mockMvc
        .perform(
            post(cash(tenant.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"openingFloatCents\":10}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CASH_SESSION_OPEN"));
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + session.get("id").asText() + "/close",
        "{}",
        200);
    mockMvc
        .perform(
            post(cash(tenant.establishmentId()) + "/" + session.get("id").asText() + "/movements")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"SUPPLY\",\"amountCents\":100}"))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("CASH_SESSION_CLOSED"));
    JsonNode second = openCash(tenant, 50);
    assertThat(second.get("id").asText()).isNotEqualTo(session.get("id").asText());
  }

  @Test
  void paymentIdempotencyAndConcurrentPaysDoNotOverSettle() throws Exception {
    Tenant tenant = registerTenant("idem");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 2);
    JsonNode service = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 2, "ord");
    JsonNode bill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(tenant.establishmentId(), service.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    openCash(tenant, 0);
    JsonNode first =
        postJson(
            tenant.accessToken(),
            payments(tenant.establishmentId(), bill.get("id").asText()),
            "{\"method\":\"PIX\",\"tenderedCents\":800}",
            201,
            "same-key");
    JsonNode replay =
        postJson(
            tenant.accessToken(),
            payments(tenant.establishmentId(), bill.get("id").asText()),
            "{\"method\":\"PIX\",\"tenderedCents\":800}",
            200,
            "same-key");
    assertThat(replay.get("id").asText()).isEqualTo(first.get("id").asText());
    mockMvc
        .perform(
            post(payments(tenant.establishmentId(), bill.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "same-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"PIX\",\"tenderedCents\":400}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
    Tenant other = registerTenant("conc");
    JsonNode drink2 = createDrink(other);
    JsonNode table2 = createTable(other, 1);
    JsonNode service2 = openService(other, table2.get("id").asText());
    placeTableOrder(other, service2.get("id").asText(), drink2.get("id").asText(), 2, "c-ord");
    JsonNode bill2 =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(other.establishmentId(), service2.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(other.accessToken())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    openCash(other, 0);
    CountDownLatch start = new CountDownLatch(1);
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      Future<Integer> one = pool.submit(() -> payStatus(other, bill2.get("id").asText(), "c1", start));
      Future<Integer> two = pool.submit(() -> payStatus(other, bill2.get("id").asText(), "c2", start));
      start.countDown();
      List<Integer> codes = List.of(one.get(20, TimeUnit.SECONDS), two.get(20, TimeUnit.SECONDS));
      assertThat(codes).contains(201);
      assertThat(codes).containsAnyOf(422, 409);
    }
    mockMvc
        .perform(
            get("/api/v1/establishments/" + other.establishmentId() + "/bills/" + bill2.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(other.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paidCents").value(1600))
        .andExpect(jsonPath("$.remainingCents").value(0));
  }

  @Test
  void settlementClosesTableAndBlocksNewOrdersAfterPayment() throws Exception {
    Tenant tenant = registerTenant("cls");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 3);
    JsonNode service = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 1, "ord");
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CLOSE_REQUIRES_SETTLEMENT"));
    JsonNode bill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(tenant.establishmentId(), service.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    openCash(tenant, 0);
    postJson(
        tenant.accessToken(),
        payments(tenant.establishmentId(), bill.get("id").asText()),
        "{\"method\":\"CREDIT_CARD\",\"tenderedCents\":800}",
        201,
        "full");
    mockMvc
        .perform(
            post(orders(tenant.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", "after-pay")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                    """.formatted(service.get("id").asText(), drink.get("id").asText())))
        .andExpect(status().isUnprocessableEntity())
        .andExpect(jsonPath("$.code").value("PAYMENT_STARTED"));
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"),
        "{}",
        200);
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.occupancy").value("AVAILABLE"));
    mockMvc
        .perform(
            get("/api/v1/establishments/" + tenant.establishmentId() + "/bills/" + bill.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("SETTLED"))
        .andExpect(jsonPath("$.totalCents").value(800));
  }

  @Test
  void counterBillHasNoTableAndJourneySettlesThenCashMayClose() throws Exception {
    Tenant tenant = registerTenant("ctr");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 8);
    JsonNode service = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 1, "mesa");
    JsonNode counter =
        postJson(
            tenant.accessToken(),
            orders(tenant.establishmentId()),
            """
            {"channel":"COUNTER","items":[{"productId":"%s","quantity":1}]}
            """.formatted(drink.get("id").asText()),
            201,
            "balcao");
    JsonNode counterBill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForOrder(tenant.establishmentId(), counter.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("COUNTER"))
                .andExpect(jsonPath("$.totalCents").value(800))
                .andReturn()
                .getResponse()
                .getContentAsString());
    JsonNode tableBill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(tenant.establishmentId(), service.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("TABLE"))
                .andExpect(jsonPath("$.totalCents").value(800))
                .andReturn()
                .getResponse()
                .getContentAsString());
    assertThat(
            counterBill.path("tableServiceId").isMissingNode() || counterBill.path("tableServiceId").isNull())
        .isTrue();
    assertThat(counterBill.get("id").asText()).isNotEqualTo(tableBill.get("id").asText());
    JsonNode cash = openCash(tenant, 100);
    postJson(
        tenant.accessToken(),
        payments(tenant.establishmentId(), counterBill.get("id").asText()),
        "{\"method\":\"CASH\",\"tenderedCents\":800}",
        201,
        "c-pay");
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/bill"),
        "{}",
        200);
    postJson(
        tenant.accessToken(),
        payments(tenant.establishmentId(), tableBill.get("id").asText()),
        "{\"method\":\"PIX\",\"tenderedCents\":800}",
        201,
        "t-pay");
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + cash.get("id").asText() + "/close",
        "{}",
        200);
    postJson(
        tenant.accessToken(),
        tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"),
        "{}",
        200);
    mockMvc
        .perform(
            get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(jsonPath("$.occupancy").value("AVAILABLE"));
  }

  @Test
  void emptyCloseIsBlockedAfterConfirmedOrder() throws Exception {
    Tenant tenant = registerTenant("has");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 9);
    JsonNode service = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, service.get("id").asText(), drink.get("id").asText(), 1, "has-ord");
    mockMvc
        .perform(
            post(tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"empty\":true,\"reason\":\"Desistiu\"}"))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("CLOSE_HAS_CONSUMPTION"));
  }

  @Test
  void emptyCloseRacesConfirmedOrder() throws Exception {
    Tenant tenant = registerTenant("race");
    JsonNode drink = createDrink(tenant);
    JsonNode table = createTable(tenant, 7);
    JsonNode service = openService(tenant, table.get("id").asText());
    String closePath = tables(tenant.establishmentId(), "/" + table.get("id").asText() + "/service/close");
    String orderPath = orders(tenant.establishmentId());
    CountDownLatch start = new CountDownLatch(1);
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      Future<Integer> close =
          pool.submit(
              () -> {
                start.await(5, TimeUnit.SECONDS);
                return mockMvc
                    .perform(
                        post(closePath)
                            .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"empty\":true,\"reason\":\"Mesa vazia\"}"))
                    .andReturn()
                    .getResponse()
                    .getStatus();
              });
      Future<Integer> order =
          pool.submit(
              () -> {
                start.await(5, TimeUnit.SECONDS);
                return mockMvc
                    .perform(
                        post(orderPath)
                            .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                            .header("Idempotency-Key", "race-ord")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(
                                """
                                {"channel":"TABLE","tableServiceId":"%s","items":[{"productId":"%s","quantity":1}]}
                                """.formatted(service.get("id").asText(), drink.get("id").asText())))
                    .andReturn()
                    .getResponse()
                    .getStatus();
              });
      start.countDown();
      List<Integer> codes = List.of(close.get(20, TimeUnit.SECONDS), order.get(20, TimeUnit.SECONDS));
      assertThat(codes).containsAnyOf(200, 201);
      if (codes.get(0) == 200) {
        assertThat(codes.get(1)).isNotEqualTo(201);
        mockMvc
            .perform(
                get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                    .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
            .andExpect(jsonPath("$.occupancy").value("AVAILABLE"));
      } else {
        assertThat(codes.get(1)).isEqualTo(201);
        mockMvc
            .perform(
                get(tables(tenant.establishmentId(), "/" + table.get("id").asText()))
                    .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
            .andExpect(jsonPath("$.occupancy").value(org.hamcrest.Matchers.not("AVAILABLE")));
      }
    }
  }

  @Test
  void rbacSisterTenantsAndSuspendedEstablishment() throws Exception {
    Tenant owner = registerTenant("fin");
    Tenant staff = registerTenant("stf");
    JsonNode drink = createDrink(owner);
    JsonNode table = createTable(owner, 4);
    JsonNode service = openService(owner, table.get("id").asText());
    placeTableOrder(owner, service.get("id").asText(), drink.get("id").asText(), 1, "ord");
    JsonNode bill =
        objectMapper.readTree(
            mockMvc
                .perform(
                    get(billForService(owner.establishmentId(), service.get("id").asText()))
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    assignRole(owner, staff.email(), "KITCHEN");
    String kitchen = login(staff.email());
    mockMvc
        .perform(
            get(billForService(owner.establishmentId(), service.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchen)))
        .andExpect(status().isForbidden());
    assignRole(owner, staff.email(), "WAITER");
    String waiter = login(staff.email());
    mockMvc
        .perform(
            get(billForService(owner.establishmentId(), service.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(waiter)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post(cash(owner.establishmentId()))
                .header(HttpHeaders.AUTHORIZATION, bearer(waiter))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"openingFloatCents\":0}"))
        .andExpect(status().isForbidden());
    assignRole(owner, staff.email(), "CASHIER");
    String cashier = login(staff.email());
    postJson(cashier, cash(owner.establishmentId()), "{\"openingFloatCents\":0}", 201);
    postJson(
        cashier,
        payments(owner.establishmentId(), bill.get("id").asText()),
        "{\"method\":\"PIX\",\"tenderedCents\":800}",
        201,
        "cashier-pay");
    Tenant beta = registerTenant("iso");
    mockMvc
        .perform(
            get(billForService(owner.establishmentId(), service.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(beta.accessToken())))
        .andExpect(status().isNotFound());
    JsonNode sister =
        postJson(
            owner.accessToken(),
            "/api/v1/organizations/" + owner.organizationId() + "/establishments",
            "{\"name\":\"Filial\",\"slug\":\"filial-fin\"}",
            201);
    mockMvc
        .perform(
            get("/api/v1/establishments/" + sister.get("id").asText() + "/bills/" + bill.get("id").asText())
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken())))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            patch("/api/v1/establishments/" + owner.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(billForService(owner.establishmentId(), service.get("id").asText()))
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_SUSPENDED"));
  }

  private int payStatus(Tenant tenant, String billId, String key, CountDownLatch start) throws Exception {
    start.await(5, TimeUnit.SECONDS);
    return mockMvc
        .perform(
            post(payments(tenant.establishmentId(), billId))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .header("Idempotency-Key", key)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"method\":\"PIX\",\"tenderedCents\":1600}"))
        .andReturn()
        .getResponse()
        .getStatus();
  }
}
