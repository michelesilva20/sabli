package dev.emilabs.sabli.identity;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "sabli.security.jwt.access-token-ttl=PT2S")
class ExpiredAccessTokenTests extends IdentitySupport {

  @Test
  void expiredAccessTokenIsRejected() throws Exception {
    Tenant tenant = registerTenant("exp");
    Thread.sleep(3500);
    mockMvc
        .perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isUnauthorized());
  }
}
