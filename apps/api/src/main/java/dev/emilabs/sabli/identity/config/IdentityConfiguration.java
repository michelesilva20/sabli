package dev.emilabs.sabli.identity.config;

import java.time.Clock;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties(IdentityProperties.class)
public class IdentityConfiguration {

  @Bean
  Clock clock() {
    return Clock.systemUTC();
  }

  @Bean
  PasswordEncoder passwordEncoder(IdentityProperties properties) {
    int strength = properties.security().passwordEncoderStrength();
    if (strength < 4 || strength > 16) {
      throw new IllegalStateException("A força do BCrypt precisa estar entre 4 e 16.");
    }
    return new BCryptPasswordEncoder(strength);
  }

  @Bean
  IdentitySecrets identitySecrets(IdentityProperties properties) {
    String secret = properties.security().jwt().secret();
    if (!StringUtils.hasText(secret) || secret.length() < 32) {
      throw new IllegalStateException("Defina SABLI_JWT_SECRET com pelo menos 32 caracteres.");
    }
    return new IdentitySecrets(secret);
  }

  public record IdentitySecrets(String jwtSecret) {}
}
