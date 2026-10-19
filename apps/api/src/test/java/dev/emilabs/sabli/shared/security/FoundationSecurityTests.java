package dev.emilabs.sabli.shared.security;

import dev.emilabs.sabli.AbstractIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class FoundationSecurityTests extends AbstractIntegrationTest {

  private static final String ALLOWED_ORIGIN = "http://127.0.0.1:5173";

  @Autowired
  private MockMvc mockMvc;

  @Test
  void healthIsPublicAndOpaque() throws Exception {
    mockMvc
        .perform(get("/actuator/health").accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.components").doesNotExist())
        .andExpect(jsonPath("$.details").doesNotExist());
  }

  @Test
  void livenessProbeIsPublic() throws Exception {
    mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
  }

  @Test
  void actuatorCatalogIsProtected() throws Exception {
    mockMvc.perform(get("/actuator")).andExpect(status().isUnauthorized());
  }

  @Test
  void envEndpointIsProtected() throws Exception {
    mockMvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
  }

  @Test
  void prometheusEndpointIsProtected() throws Exception {
    mockMvc.perform(get("/actuator/prometheus")).andExpect(status().isUnauthorized());
  }

  @Test
  void openApiIsProtected() throws Exception {
    mockMvc.perform(get("/v3/api-docs")).andExpect(status().isUnauthorized());
  }

  @Test
  void unknownRouteIsProtected() throws Exception {
    mockMvc.perform(get("/orders")).andExpect(status().isUnauthorized());
  }

  @Test
  void defaultBasicCredentialsAreRejected() throws Exception {
    String basic =
        "Basic "
            + Base64.getEncoder().encodeToString("admin:admin".getBytes(StandardCharsets.UTF_8));
    mockMvc
        .perform(get("/actuator").header(HttpHeaders.AUTHORIZATION, basic))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void corsAllowsConfiguredFrontendOrigin() throws Exception {
    mockMvc
        .perform(
            options("/actuator/health")
                .header(HttpHeaders.ORIGIN, ALLOWED_ORIGIN)
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
        .andExpect(status().isOk())
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ALLOWED_ORIGIN))
        .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
  }

  @Test
  void corsRejectsUnknownOrigin() throws Exception {
    mockMvc
        .perform(
            get("/actuator/health")
                .header(HttpHeaders.ORIGIN, "https://evil.example")
                .accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isForbidden())
        .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
  }
}
