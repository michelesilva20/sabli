package dev.emilabs.sabli.catalog.application;

import dev.emilabs.sabli.shared.error.ApiException;
import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class CatalogSlugs {

  private static final Pattern FORMAT = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

  private CatalogSlugs() {}

  public static String resolve(String slug, String name) {
    if (slug != null && !slug.isBlank()) {
      return normalize(slug);
    }
    return fromName(name);
  }

  public static String fromName(String name) {
    String stripped = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    String slug = stripped.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-)$", "");
    return normalize(slug);
  }

  public static String normalize(String slug) {
    String normalized = slug.trim().toLowerCase(Locale.ROOT);
    if (!FORMAT.matcher(normalized).matches() || normalized.length() > 80) {
      throw ApiException.badRequest("O identificador precisa usar letras minúsculas, números e hífens.");
    }
    return normalized;
  }
}
