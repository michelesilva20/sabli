package dev.emilabs.sabli.reporting.application;

import dev.emilabs.sabli.shared.error.ApiException;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

public record ReportingPeriod(
    LocalDate from,
    LocalDate to,
    ZoneId zone,
    Instant startInclusive,
    Instant endExclusive,
    String timezoneSource) {

  public static final ZoneId DEFAULT_ZONE = ZoneId.of("America/Sao_Paulo");
  public static final int MAX_DAYS = 366;

  public static ReportingPeriod parse(String fromRaw, String toRaw, String timezoneRaw) {
    ZoneId zone;
    String timezoneSource;
    if (timezoneRaw == null || timezoneRaw.isBlank()) {
      zone = DEFAULT_ZONE;
      timezoneSource = "DEFAULT";
    } else {
      try {
        zone = ZoneId.of(timezoneRaw.trim());
        timezoneSource = "QUERY";
      } catch (DateTimeException ex) {
        throw ApiException.badRequest(
            "Fuso horário inválido. Use um identificador IANA, por exemplo America/Sao_Paulo.");
      }
    }
    LocalDate today = LocalDate.now(zone);
    LocalDate from = parseDate(fromRaw, today);
    LocalDate to = parseDate(toRaw, today);
    if (to.isBefore(from)) {
      throw ApiException.badRequest("O período final deve ser igual ou posterior ao inicial.");
    }
    if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_DAYS) {
      throw ApiException.badRequest("O período máximo é de 366 dias.");
    }
    return new ReportingPeriod(
        from,
        to,
        zone,
        from.atStartOfDay(zone).toInstant(),
        to.plusDays(1).atStartOfDay(zone).toInstant(),
        timezoneSource);
  }

  private static LocalDate parseDate(String raw, LocalDate fallback) {
    if (raw == null || raw.isBlank()) {
      return fallback;
    }
    try {
      return LocalDate.parse(raw.trim());
    } catch (DateTimeParseException ex) {
      throw ApiException.badRequest("Data inválida. Use o formato ISO-8601 YYYY-MM-DD.");
    }
  }
}
