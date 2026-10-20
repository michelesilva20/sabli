package dev.emilabs.sabli.shared.persistence;

import dev.emilabs.sabli.AbstractIntegrationTest;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FlywayPostgresTests extends AbstractIntegrationTest {

  @Autowired
  private Flyway flyway;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void appliesCatalogMigrationAgainstPostgres() {
    assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("9");
    assertThat(
            jdbcTemplate.queryForObject(
                "select extname from pg_extension where extname = 'pgcrypto'", String.class))
        .isEqualTo("pgcrypto");
    assertThat(
            jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in (
                    'users', 'organizations', 'establishments',
                    'organization_memberships', 'establishment_memberships', 'refresh_sessions',
                    'catalog_categories', 'catalog_products', 'catalog_product_variants',
                    'pizza_settings', 'pizza_sizes', 'pizza_flavors', 'pizza_flavor_prices',
                    'pizza_crusts', 'pizza_extras', 'dining_tables', 'table_services',
                    'order_counters', 'orders', 'order_items', 'order_item_pizza_flavors',
                    'order_item_modifiers', 'kitchen_tickets', 'kitchen_ticket_items',
                    'bills', 'bill_payments', 'cash_sessions', 'cash_movements')
                """,
                Integer.class))
        .isEqualTo(28);
    assertThat(
            jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'table_services'
                  and column_name in ('closed_by_user_id', 'closed_by_name', 'close_reason', 'close_kind')
                """,
                Integer.class))
        .isEqualTo(4);
    assertThat(
            jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('payments', 'customers')
                """,
                Integer.class))
        .isZero();
  }

  @Test
  void postgresRejectsEstablishmentMembershipFromAnotherOrganization() {
    UUID userId = UUID.randomUUID();
    UUID orgA = UUID.randomUUID();
    UUID orgB = UUID.randomUUID();
    UUID estA = UUID.randomUUID();
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    jdbcTemplate.update(
        """
        insert into users (id, email, email_normalized, password_hash, name, status, failed_login_attempts, created_at, updated_at)
        values (?, ?, ?, 'hash', 'User', 'ACTIVE', 0, now(), now())
        """,
        userId,
        "constraint-" + suffix + "@example.com",
        "constraint-" + suffix + "@example.com");
    jdbcTemplate.update(
        """
        insert into organizations (id, name, slug, status, created_at, updated_at)
        values (?, 'Org A', ?, 'ACTIVE', now(), now()), (?, 'Org B', ?, 'ACTIVE', now(), now())
        """,
        orgA,
        "org-a-" + suffix,
        orgB,
        "org-b-" + suffix);
    jdbcTemplate.update(
        """
        insert into establishments (id, organization_id, name, slug, status, created_at, updated_at)
        values (?, ?, 'Loja A', 'loja-a', 'ACTIVE', now(), now())
        """,
        estA,
        orgA);
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into establishment_memberships
                      (id, establishment_id, organization_id, user_id, role, status, created_at, updated_at)
                    values (?, ?, ?, ?, 'WAITER', 'ACTIVE', now(), now())
                    """,
                    UUID.randomUUID(),
                    estA,
                    orgB,
                    userId))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresEnforcesNormalizedEmailUniqueness() {
    UUID first = UUID.randomUUID();
    String email = "dup-" + UUID.randomUUID() + "@example.com";
    jdbcTemplate.update(
        """
        insert into users (id, email, email_normalized, password_hash, name, status, failed_login_attempts, created_at, updated_at)
        values (?, ?, ?, 'hash', 'User', 'ACTIVE', 0, now(), now())
        """,
        first,
        email,
        email);
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into users (id, email, email_normalized, password_hash, name, status, failed_login_attempts, created_at, updated_at)
                    values (?, ?, ?, 'hash', 'User', 'ACTIVE', 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    email,
                    email))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresRejectsProductLinkedToCategoryOfAnotherEstablishment() {
    UUID orgId = UUID.randomUUID();
    UUID estA = UUID.randomUUID();
    UUID estB = UUID.randomUUID();
    UUID categoryA = UUID.randomUUID();
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    jdbcTemplate.update(
        """
        insert into organizations (id, name, slug, status, created_at, updated_at)
        values (?, 'Org Cat', ?, 'ACTIVE', now(), now())
        """,
        orgId,
        "org-cat-" + suffix);
    jdbcTemplate.update(
        """
        insert into establishments (id, organization_id, name, slug, status, created_at, updated_at)
        values (?, ?, 'Loja A', 'loja-a', 'ACTIVE', now(), now()), (?, ?, 'Loja B', 'loja-b', 'ACTIVE', now(), now())
        """,
        estA,
        orgId,
        estB,
        orgId);
    jdbcTemplate.update(
        """
        insert into catalog_categories
          (id, establishment_id, organization_id, name, slug, sort_order, status, created_at, updated_at)
        values (?, ?, ?, 'Bebidas', 'bebidas', 0, 'ACTIVE', now(), now())
        """,
        categoryA,
        estA,
        orgId);
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into catalog_products
                      (id, establishment_id, organization_id, category_id, name, slug, description, kind,
                       available, status, sort_order, version, created_at, updated_at)
                    values (?, ?, ?, ?, 'Refri', 'refri', '', 'STANDARD', true, 'ACTIVE', 0, 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    estB,
                    orgId,
                    categoryA))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresRejectsServiceLinkedToTableOfAnotherEstablishment() {
    DiningSeed seed = insertDiningSeed();
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into table_services
                      (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
                       host_name, opened_at, status, version, created_at, updated_at)
                    values (?, ?, ?, ?, 1, ?, 'Host', now(), 'OPEN', 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    seed.tableA(),
                    seed.estB(),
                    seed.orgId(),
                    seed.userId()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresRejectsTwoActiveServicesOnTheSameTable() {
    DiningSeed seed = insertDiningSeed();
    jdbcTemplate.update(
        """
        insert into table_services
          (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
           host_name, opened_at, status, version, created_at, updated_at)
        values (?, ?, ?, ?, 1, ?, 'Host', now(), 'OPEN', 0, now(), now())
        """,
        UUID.randomUUID(),
        seed.tableA(),
        seed.estA(),
        seed.orgId(),
        seed.userId());
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into table_services
                      (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
                       host_name, opened_at, status, version, created_at, updated_at)
                    values (?, ?, ?, ?, 1, ?, 'Host', now(), 'OPEN', 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    seed.tableA(),
                    seed.estA(),
                    seed.orgId(),
                    seed.userId()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresAllowsNewServiceAfterClosedHistory() {
    DiningSeed seed = insertDiningSeed();
    jdbcTemplate.update(
        """
        insert into table_services
          (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
           host_name, opened_at, closed_at, status, version, created_at, updated_at,
           closed_by_user_id, closed_by_name, close_kind)
        values (?, ?, ?, ?, 1, ?, 'Host', now(), now(), 'CLOSED', 0, now(), now(),
                ?, 'Host', 'SETTLED')
        """,
        UUID.randomUUID(),
        seed.tableA(),
        seed.estA(),
        seed.orgId(),
        seed.userId(),
        seed.userId());
    jdbcTemplate.update(
        """
        insert into table_services
          (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
           host_name, opened_at, status, version, created_at, updated_at)
        values (?, ?, ?, ?, 2, ?, 'Host', now(), 'OPEN', 0, now(), now())
        """,
        UUID.randomUUID(),
        seed.tableA(),
        seed.estA(),
        seed.orgId(),
        seed.userId());
    assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from table_services where table_id = ?", Integer.class, seed.tableA()))
        .isEqualTo(2);
  }

  @Test
  void postgresRejectsPaymentLinkedToBillOfAnotherEstablishment() {
    BillingSeed seed = insertBillingSeed();
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into bill_payments
                      (id, bill_id, establishment_id, organization_id, cash_session_id, method, capture_kind,
                       tendered_cents, applied_cents, change_cents, recorded_by_user_id, recorded_by_name,
                       notes, idempotency_key, idempotency_hash, recorded_at, version, created_at, updated_at)
                    values (?, ?, ?, ?, ?, 'CASH', 'MANUAL_DECLARED', 100, 100, 0, ?, 'Op', '', 'k',
                            'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', now(), 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    seed.billId(),
                    seed.estB(),
                    seed.orgId(),
                    seed.sessionId(),
                    seed.userId()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void postgresRejectsTwoOpenCashSessionsOnTheSameEstablishment() {
    BillingSeed seed = insertBillingSeed();
    assertThatThrownBy(
            () ->
                jdbcTemplate.update(
                    """
                    insert into cash_sessions
                      (id, establishment_id, organization_id, scope, opened_by_user_id, opened_by_name,
                       opening_float_cents, notes, status, opened_at, expected_cash_cents, version, created_at, updated_at)
                    values (?, ?, ?, 'ESTABLISHMENT', ?, 'Op', 0, '', 'OPEN', now(), 0, 0, now(), now())
                    """,
                    UUID.randomUUID(),
                    seed.estA(),
                    seed.orgId(),
                    seed.userId()))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  private DiningSeed insertDiningSeed() {
    UUID userId = UUID.randomUUID();
    UUID orgId = UUID.randomUUID();
    UUID estA = UUID.randomUUID();
    UUID estB = UUID.randomUUID();
    UUID tableA = UUID.randomUUID();
    String suffix = UUID.randomUUID().toString().substring(0, 8);
    jdbcTemplate.update(
        """
        insert into users (id, email, email_normalized, password_hash, name, status, failed_login_attempts, created_at, updated_at)
        values (?, ?, ?, 'hash', 'Host', 'ACTIVE', 0, now(), now())
        """,
        userId,
        "dining-" + suffix + "@example.com",
        "dining-" + suffix + "@example.com");
    jdbcTemplate.update(
        """
        insert into organizations (id, name, slug, status, created_at, updated_at)
        values (?, 'Org Dining', ?, 'ACTIVE', now(), now())
        """,
        orgId,
        "org-din-" + suffix);
    jdbcTemplate.update(
        """
        insert into establishments (id, organization_id, name, slug, status, created_at, updated_at)
        values (?, ?, 'Loja A', 'loja-a', 'ACTIVE', now(), now()), (?, ?, 'Loja B', 'loja-b', 'ACTIVE', now(), now())
        """,
        estA,
        orgId,
        estB,
        orgId);
    jdbcTemplate.update(
        """
        insert into dining_tables
          (id, establishment_id, organization_id, number, seats, availability, status, version, created_at, updated_at)
        values (?, ?, ?, 1, 4, 'AVAILABLE', 'ACTIVE', 0, now(), now())
        """,
        tableA,
        estA,
        orgId);
    return new DiningSeed(userId, orgId, estA, estB, tableA);
  }

  private record DiningSeed(UUID userId, UUID orgId, UUID estA, UUID estB, UUID tableA) {}

  private BillingSeed insertBillingSeed() {
    DiningSeed dining = insertDiningSeed();
    UUID serviceId = UUID.randomUUID();
    UUID orderId = UUID.randomUUID();
    UUID billId = UUID.randomUUID();
    UUID sessionId = UUID.randomUUID();
    jdbcTemplate.update(
        """
        insert into table_services
          (id, table_id, establishment_id, organization_id, guest_count, opened_by_user_id,
           host_name, opened_at, status, version, created_at, updated_at)
        values (?, ?, ?, ?, 1, ?, 'Host', now(), 'OPEN', 0, now(), now())
        """,
        serviceId,
        dining.tableA(),
        dining.estA(),
        dining.orgId(),
        dining.userId());
    jdbcTemplate.update(
        """
        insert into order_counters (establishment_id, organization_id, last_number)
        values (?, ?, 1)
        """,
        dining.estA(),
        dining.orgId());
    jdbcTemplate.update(
        """
        insert into orders
          (id, establishment_id, organization_id, table_id, table_service_id, channel, number,
           placed_by_user_id, placed_by_name, notes, subtotal_cents, discount_cents, total_cents,
           commercial_status, production_status, idempotency_key, idempotency_hash, placed_at,
           version, created_at, updated_at)
        values (?, ?, ?, ?, ?, 'TABLE', 1, ?, 'Host', '', 800, 0, 800, 'CONFIRMED', 'WAITING', 'k',
                'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', now(), 0, now(), now())
        """,
        orderId,
        dining.estA(),
        dining.orgId(),
        dining.tableA(),
        serviceId,
        dining.userId());
    jdbcTemplate.update(
        """
        insert into bills
          (id, establishment_id, organization_id, kind, table_id, table_service_id, subtotal_cents,
           discount_cents, total_cents, paid_cents, remaining_cents, status, version, created_at, updated_at)
        values (?, ?, ?, 'TABLE', ?, ?, 800, 0, 800, 0, 800, 'OPEN', 0, now(), now())
        """,
        billId,
        dining.estA(),
        dining.orgId(),
        dining.tableA(),
        serviceId);
    jdbcTemplate.update(
        """
        insert into cash_sessions
          (id, establishment_id, organization_id, scope, opened_by_user_id, opened_by_name,
           opening_float_cents, notes, status, opened_at, expected_cash_cents, version, created_at, updated_at)
        values (?, ?, ?, 'ESTABLISHMENT', ?, 'Op', 0, '', 'OPEN', now(), 0, 0, now(), now())
        """,
        sessionId,
        dining.estA(),
        dining.orgId(),
        dining.userId());
    return new BillingSeed(dining.userId(), dining.orgId(), dining.estA(), dining.estB(), billId, sessionId);
  }

  private record BillingSeed(UUID userId, UUID orgId, UUID estA, UUID estB, UUID billId, UUID sessionId) {}
}
