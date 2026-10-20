package dev.emilabs.sabli.identity.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import dev.emilabs.sabli.identity.config.IdentityConfiguration.IdentitySecrets;
import dev.emilabs.sabli.identity.config.IdentityProperties;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

  private final byte[] secret;
  private final IdentityProperties properties;
  private final Clock clock;

  public JwtService(IdentitySecrets secrets, IdentityProperties properties, Clock clock) {
    this.secret = secrets.jwtSecret().getBytes(StandardCharsets.UTF_8);
    this.properties = properties;
    this.clock = clock;
  }

  public String issueAccessToken(UUID userId) {
    Instant now = clock.instant();
    Instant expires = now.plus(properties.security().jwt().accessTokenTtl());
    JWTClaimsSet claims =
        new JWTClaimsSet.Builder()
            .subject(userId.toString())
            .jwtID(UUID.randomUUID().toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(expires))
            .claim("typ", "access")
            .build();
    try {
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(secret));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException("Falha ao assinar o token de acesso.", ex);
    }
  }

  public Optional<UUID> parseAccessToken(String token) {
    try {
      SignedJWT jwt = SignedJWT.parse(token);
      if (!jwt.verify(new MACVerifier(secret))) {
        return Optional.empty();
      }
      JWTClaimsSet claims = jwt.getJWTClaimsSet();
      if (!"access".equals(claims.getStringClaim("typ"))) {
        return Optional.empty();
      }
      Date expiration = claims.getExpirationTime();
      if (expiration == null || expiration.toInstant().isBefore(clock.instant())) {
        return Optional.empty();
      }
      return Optional.of(UUID.fromString(claims.getSubject()));
    } catch (ParseException | JOSEException | IllegalArgumentException ex) {
      return Optional.empty();
    }
  }
}
