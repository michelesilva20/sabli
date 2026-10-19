package dev.emilabs.sabli.identity.application;

import dev.emilabs.sabli.shared.error.ApiException;
import java.util.Locale;
import java.util.regex.Pattern;

public final class Slugs {

  private static final Pattern FORMAT = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");

  private Slugs() {}

  public static String normalize(String slug) {
    String normalized = slug.trim().toLowerCase(Locale.ROOT);
    if (!FORMAT.matcher(normalized).matches() || normalized.length() > 80) {
      throw ApiException.badRequest("O identificador precisa usar letras minúsculas, números e hífens.");
    }
    return normalized;
  }
}
