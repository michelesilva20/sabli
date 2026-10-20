package dev.emilabs.sabli.reporting;

import com.fasterxml.jackson.databind.JsonNode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
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

class ReportingTests extends ReportingSupport {

  private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");

  @Test
  void emptyPeriodReturnsZerosWithoutInventedSeries() throws Exception {
    Tenant tenant = registerTenant("empty");
    createTable(tenant, 1);
    JsonNode overview =
        getJson(
            tenant.accessToken(),
            reports(tenant.establishmentId(), "/overview?from=2099-01-01&to=2099-01-07&timezone=America/Sao_Paulo"),
            200);
    assertThat(overview.get("receivedCents").asLong()).isZero();
    assertThat(overview.get("soldCents").asLong()).isZero();
    assertThat(overview.get("salesCount").asLong()).isZero();
    assertThat(overview.get("averageTicketCents").asLong()).isZero();
    assertThat(overview.get("averageTicketUnit").asText()).isEqualTo("CONFIRMED_ORDER");
    assertThat(overview.get("pendingBills").asLong()).isZero();
    assertThat(overview.get("occupiedTables").asLong()).isZero();
    JsonNode sales =
        getJson(
            tenant.accessToken(),
            reports(tenant.establishmentId(), "/sales?from=2099-01-01&to=2099-01-03&timezone=America/Sao_Paulo"),
            200);
    assertThat(sales.get("byDay")).hasSize(3);
    assertThat(sales.get("byDay").get(0).get("cents").asLong()).isZero();
    assertThat(sales.get("byChannel").get(0).get("cents").asLong()).isZero();
  }

  @Test
  void separatesSoldReceivedChangeBleedSupplyAndPending() throws Exception {
    Tenant tenant = registerTenant("fin");
    JsonNode drink = createDrink(tenant, "Refrigerante", 800);
    JsonNode pizza = createDrink(tenant, "Pizza", 4500);
    JsonNode table = createTable(tenant, 1);
    JsonNode emptyTable = createTable(tenant, 2);
    openService(tenant, emptyTable.get("id").asText());
    JsonNode unpaidService = openService(tenant, table.get("id").asText());
    placeTableOrder(tenant, unpaidService.get("id").asText(), drink.get("id").asText(), 1, "unpaid");
    JsonNode paidServiceTable = createTable(tenant, 3);
    JsonNode paidService = openService(tenant, paidServiceTable.get("id").asText());
    placeTableOrder(tenant, paidService.get("id").asText(), drink.get("id").asText(), 1, "full");
    JsonNode partialOrder = placeCounterOrder(tenant, pizza.get("id").asText(), 1, "partial");
    JsonNode cashOrder = placeCounterOrder(tenant, drink.get("id").asText(), 1, "cash-change");
    JsonNode pixOrder = placeCounterOrder(tenant, drink.get("id").asText(), 1, "pix");
    JsonNode cardOrder = placeCounterOrder(tenant, drink.get("id").asText(), 1, "card");
    JsonNode cash = openCash(tenant, 20_000);
    JsonNode unpaidBill = billForService(tenant, unpaidService.get("id").asText());
    JsonNode fullBill = billForService(tenant, paidService.get("id").asText());
    JsonNode partialBill = billForOrder(tenant, partialOrder.get("id").asText());
    JsonNode cashBill = billForOrder(tenant, cashOrder.get("id").asText());
    JsonNode pixBill = billForOrder(tenant, pixOrder.get("id").asText());
    JsonNode cardBill = billForOrder(tenant, cardOrder.get("id").asText());
    pay(tenant, fullBill.get("id").asText(), "PIX", 800, "pay-full");
    JsonNode partialPay = pay(tenant, partialBill.get("id").asText(), "PIX", 1500, "pay-partial");
    JsonNode cashPay = pay(tenant, cashBill.get("id").asText(), "CASH", 1000, "pay-cash");
    pay(tenant, pixBill.get("id").asText(), "PIX", 800, "pay-pix");
    pay(tenant, cardBill.get("id").asText(), "CREDIT_CARD", 800, "pay-card");
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + cash.get("id").asText() + "/movements",
        "{\"type\":\"SUPPLY\",\"amountCents\":3000,\"notes\":\"suprimento\"}",
        200);
    postJson(
        tenant.accessToken(),
        cash(tenant.establishmentId()) + "/" + cash.get("id").asText() + "/movements",
        "{\"type\":\"BLEED\",\"amountCents\":2000,\"notes\":\"sangria\"}",
        200);

    assertThat(partialPay.get("appliedCents").asInt()).isEqualTo(1500);
    assertThat(cashPay.get("appliedCents").asInt()).isEqualTo(800);
    assertThat(cashPay.get("changeCents").asInt()).isEqualTo(200);
    assertThat(unpaidBill.get("remainingCents").asInt()).isEqualTo(800);

    String today = LocalDate.now(SAO_PAULO).toString();
    String query = "?from=" + today + "&to=" + today + "&timezone=America/Sao_Paulo";
    JsonNode overview = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/overview" + query), 200);
    assertThat(overview.get("salesCount").asLong()).isEqualTo(6);
    assertThat(overview.get("soldCents").asLong()).isEqualTo(800 + 800 + 4500 + 800 + 800 + 800);
    assertThat(overview.get("receivedCents").asLong()).isEqualTo(800 + 1500 + 800 + 800 + 800);
    assertThat(overview.get("averageTicketCents").asLong())
        .isEqualTo(overview.get("soldCents").asLong() / overview.get("salesCount").asLong());
    assertThat(overview.get("pendingBills").asLong()).isEqualTo(2);
    assertThat(overview.get("pendingCents").asLong()).isEqualTo(800 + 3000);
    assertThat(overview.get("occupiedTables").asLong()).isEqualTo(3);
    assertThat(overview.get("inProductionOrders").asLong()).isEqualTo(6);
    assertThat(overview.get("metricScope").get("receivedCents").asText()).isEqualTo("PERIOD");
    assertThat(overview.get("metricScope").get("occupiedTables").asText()).isEqualTo("CURRENT");

    JsonNode payments = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/payments" + query), 200);
    assertThat(payments.get("receivedCents").asLong()).isEqualTo(overview.get("receivedCents").asLong());
    assertThat(sumMethod(payments, "CASH")).isEqualTo(800);
    assertThat(sumMethod(payments, "PIX")).isEqualTo(800 + 1500 + 800);
    assertThat(sumMethod(payments, "CREDIT_CARD")).isEqualTo(800);
    assertThat(sumMethod(payments, "DEBIT_CARD")).isZero();

    JsonNode revenue = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/revenue" + query), 200);
    assertThat(revenue.get("receivedCents").asLong()).isEqualTo(overview.get("receivedCents").asLong());

    JsonNode sales = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/sales" + query), 200);
    assertThat(channelCents(sales, "TABLE")).isEqualTo(1600);
    assertThat(channelCents(sales, "COUNTER")).isEqualTo(6900);
    JsonNode tableOnly =
        getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/sales" + query + "&channel=TABLE"), 200);
    assertThat(tableOnly.get("soldCents").asLong()).isEqualTo(1600);
    assertThat(tableOnly.get("salesCount").asLong()).isEqualTo(2);

    JsonNode products = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/products" + query), 200);
    assertThat(products.get("items")).hasSize(2);
    assertThat(products.get("items").get(0).get("productName").asText()).isEqualTo("Pizza");
    assertThat(products.get("items").get(0).get("soldCents").asLong()).isEqualTo(4500);
    assertThat(products.get("items").get(1).get("quantity").asLong()).isEqualTo(5);
    assertThat(products.get("items").get(1).get("soldCents").asLong()).isEqualTo(4000);
  }

  @Test
  void isolatesEstablishmentsOrganizationsAndSuspendedTenant() throws Exception {
    Tenant alpha = registerTenant("alpha");
    Tenant beta = registerTenant("beta");
    JsonNode drinkA = createDrink(alpha, "Suco", 700);
    JsonNode drinkB = createDrink(beta, "Chá", 900);
    placeCounterOrder(alpha, drinkA.get("id").asText(), 1, "a1");
    placeCounterOrder(beta, drinkB.get("id").asText(), 1, "b1");
    openCash(alpha, 1000);
    openCash(beta, 1000);
    pay(alpha, billForOrder(alpha, placeId(alpha, drinkA, "a-pay-order")).get("id").asText(), "PIX", 700, "a-pay");
    JsonNode betaOrder = placeCounterOrder(beta, drinkB.get("id").asText(), 1, "b2");
    pay(beta, billForOrder(beta, betaOrder.get("id").asText()).get("id").asText(), "PIX", 900, "b-pay");

    JsonNode alphaOverview =
        getJson(alpha.accessToken(), reports(alpha.establishmentId(), "/overview"), 200);
    JsonNode betaOverview = getJson(beta.accessToken(), reports(beta.establishmentId(), "/overview"), 200);
    assertThat(alphaOverview.get("soldCents").asLong()).isEqualTo(1400);
    assertThat(betaOverview.get("soldCents").asLong()).isEqualTo(1800);
    mockMvc
        .perform(
            get(reports(beta.establishmentId(), "/overview"))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isNotFound());

    JsonNode sister =
        postJson(
            alpha.accessToken(),
            "/api/v1/organizations/" + alpha.organizationId() + "/establishments",
            "{\"name\":\"Filial\",\"slug\":\"filial-" + UUID.randomUUID().toString().substring(0, 8) + "\"}",
            201);
    mockMvc
        .perform(
            get(reports(UUID.fromString(sister.get("id").asText()), "/overview"))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.soldCents").value(0));

    mockMvc
        .perform(
            patch("/api/v1/organizations/" + alpha.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(reports(alpha.establishmentId(), "/overview"))
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_SUSPENDED"));
  }

  @Test
  void enforcesRolePolicy() throws Exception {
    Tenant owner = registerTenant("rbac");
    Tenant cashier = registerTenant("cash");
    Tenant waiter = registerTenant("wait");
    Tenant kitchen = registerTenant("kit");
    assignRole(owner, cashier.email(), "CASHIER");
    assignRole(owner, waiter.email(), "WAITER");
    assignRole(owner, kitchen.email(), "KITCHEN");
    String cashierToken = login(cashier.email());
    String waiterToken = login(waiter.email());
    String kitchenToken = login(kitchen.email());

    mockMvc
        .perform(get(reports(owner.establishmentId(), "/overview")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isOk());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/payments")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            get(reports(owner.establishmentId(), "/operations")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isOk());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/sales")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/revenue")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/products")).header(HttpHeaders.AUTHORIZATION, bearer(cashierToken)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/overview")).header(HttpHeaders.AUTHORIZATION, bearer(waiterToken)))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(get(reports(owner.establishmentId(), "/payments")).header(HttpHeaders.AUTHORIZATION, bearer(kitchenToken)))
        .andExpect(status().isForbidden());
  }

  @Test
  void civilDayBoundsFollowTimezoneNotUtc() throws Exception {
    Tenant tenant = registerTenant("tz");
    JsonNode drink = createDrink(tenant, "Água", 500);
    JsonNode first = placeCounterOrder(tenant, drink.get("id").asText(), 1, "tz-1");
    JsonNode second = placeCounterOrder(tenant, drink.get("id").asText(), 1, "tz-2");
    jdbcTemplate.update(
        "update orders set placed_at = ? where id = ?",
        Timestamp.from(Instant.parse("2026-03-16T02:59:59Z")),
        UUID.fromString(first.get("id").asText()));
    jdbcTemplate.update(
        "update orders set placed_at = ? where id = ?",
        Timestamp.from(Instant.parse("2026-03-16T03:00:00Z")),
        UUID.fromString(second.get("id").asText()));

    JsonNode saoPaulo15 =
        getJson(
            tenant.accessToken(),
            reports(
                tenant.establishmentId(),
                "/sales?from=2026-03-15&to=2026-03-15&timezone=America/Sao_Paulo"),
            200);
    JsonNode saoPaulo16 =
        getJson(
            tenant.accessToken(),
            reports(
                tenant.establishmentId(),
                "/sales?from=2026-03-16&to=2026-03-16&timezone=America/Sao_Paulo"),
            200);
    JsonNode utc16 =
        getJson(
            tenant.accessToken(),
            reports(tenant.establishmentId(), "/sales?from=2026-03-16&to=2026-03-16&timezone=UTC"),
            200);
    assertThat(saoPaulo15.get("salesCount").asLong()).isEqualTo(1);
    assertThat(saoPaulo15.get("soldCents").asLong()).isEqualTo(500);
    assertThat(saoPaulo16.get("salesCount").asLong()).isEqualTo(1);
    assertThat(utc16.get("salesCount").asLong()).isEqualTo(2);

    mockMvc
        .perform(
            get(reports(tenant.establishmentId(), "/overview?timezone=Not/AZone"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isBadRequest());
    mockMvc
        .perform(
            get(reports(tenant.establishmentId(), "/overview?from=2026-03-16&to=2026-03-15"))
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isBadRequest());
  }

  @Test
  void emptyServiceIsOccupiedButNotRevenue() throws Exception {
    Tenant tenant = registerTenant("empty-svc");
    JsonNode table = createTable(tenant, 1);
    openService(tenant, table.get("id").asText());
    JsonNode overview = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/overview"), 200);
    assertThat(overview.get("occupiedTables").asLong()).isEqualTo(1);
    assertThat(overview.get("pendingBills").asLong()).isZero();
    assertThat(overview.get("receivedCents").asLong()).isZero();
    assertThat(overview.get("soldCents").asLong()).isZero();
    JsonNode operations = getJson(tenant.accessToken(), reports(tenant.establishmentId(), "/operations"), 200);
    assertThat(operations.get("occupiedOpen").asLong()).isEqualTo(1);
    assertThat(operations.get("servicesOpenedInPeriod").asLong()).isEqualTo(1);
  }

  private String placeId(Tenant tenant, JsonNode drink, String key) throws Exception {
    return placeCounterOrder(tenant, drink.get("id").asText(), 1, key).get("id").asText();
  }

  private static long sumMethod(JsonNode payments, String method) {
    for (JsonNode row : payments.get("byMethod")) {
      if (method.equals(row.get("method").asText())) {
        return row.get("receivedCents").asLong();
      }
    }
    return 0;
  }

  private static long channelCents(JsonNode sales, String channel) {
    for (JsonNode row : sales.get("byChannel")) {
      if (channel.equals(row.get("channel").asText())) {
        return row.get("cents").asLong();
      }
    }
    return 0;
  }
}
