package dev.emilabs.sabli.shared.persistence;

import dev.emilabs.sabli.AbstractIntegrationTest;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class FlywayPostgresTests extends AbstractIntegrationTest {

  @Autowired
  private Flyway flyway;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Test
  void appliesFoundationMigrationAgainstPostgres() {
    assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("1");
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
                  and table_name in ('orders', 'payments', 'customers')
                """,
                Integer.class))
        .isZero();
  }
}
