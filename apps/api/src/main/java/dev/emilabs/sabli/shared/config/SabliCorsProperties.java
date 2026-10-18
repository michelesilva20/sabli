package dev.emilabs.sabli.shared.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sabli.cors")
public record SabliCorsProperties(List<String> allowedOrigins) {

  public List<String> allowedOrigins() {
    return allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
  }
}
