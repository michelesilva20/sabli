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
    assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("3");
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
                    'pizza_crusts', 'pizza_extras')
                """,
                Integer.class))
        .isEqualTo(15);
    assertThat(
            jdbcTemplate.queryForObject(
                """
                select count(*)
                from information_schema.tables
                where table_schema = 'public'
                  and table_name in ('orders', 'payments', 'customers')
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
}
