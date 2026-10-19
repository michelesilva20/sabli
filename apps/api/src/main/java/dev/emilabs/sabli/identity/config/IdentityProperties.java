package dev.emilabs.sabli.identity.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "sabli")
public record IdentityProperties(Identity identity, Security security) {

  public record Identity(Registration registration, Lockout lockout) {}

  public record Registration(Mode mode, String bootstrapToken) {
    public enum Mode {
      DISABLED,
      OPEN,
      BOOTSTRAP_TOKEN
    }
  }

  public record Lockout(int maxAttempts, Duration duration) {}

  public record Security(Jwt jwt, int passwordEncoderStrength) {
    public record Jwt(String secret, Duration accessTokenTtl, Duration refreshTokenTtl) {}
  }
}
