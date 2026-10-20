package dev.emilabs.sabli.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.emilabs.sabli.AbstractIntegrationTest;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

abstract class CatalogSupport extends AbstractIntegrationTest {

  @Autowired
  MockMvc mockMvc;

  @Autowired
  JdbcTemplate jdbcTemplate;

  protected final ObjectMapper objectMapper = new ObjectMapper();

  protected Tenant registerTenant(String prefix) throws Exception {
    String key = prefix + UUID.randomUUID().toString().substring(0, 8);
    String body =
        """
        {
          "organizationName": "Org %s",
          "organizationSlug": "org-%s",
          "establishmentName": "Loja %s",
          "establishmentSlug": "loja-%s",
          "name": "Admin %s",
          "email": "admin-%s@example.com",
          "password": "password10"
        }
        """
            .formatted(key, key, key, key, key, key);
    MvcResult result =
        mockMvc
            .perform(post("/api/v1/auth/register-organization").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated())
            .andReturn();
    JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
    JsonNode me =
        objectMapper.readTree(
            mockMvc
                .perform(
                    org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(json.get("accessToken").asText())))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    return new Tenant(
        json.get("accessToken").asText(),
        "admin-%s@example.com".formatted(key),
        UUID.fromString(me.get("user").get("id").asText()),
        UUID.fromString(me.get("organizations").get(0).get("id").asText()),
        UUID.fromString(me.get("establishments").get(0).get("id").asText()));
  }

  protected String login(String email) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"%s\",\"password\":\"password10\"}".formatted(email)))
            .andExpect(status().isOk())
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
  }

  protected JsonNode postJson(String token, String path, String body, int status) throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                post(path)
                    .header(HttpHeaders.AUTHORIZATION, bearer(token))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().is(status))
            .andReturn();
    String content = result.getResponse().getContentAsString();
    return content.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(content);
  }

  protected String catalog(UUID establishmentId, String suffix) {
    return "/api/v1/establishments/" + establishmentId + "/catalog" + suffix;
  }

  protected String bearer(String accessToken) {
    return "Bearer " + accessToken;
  }

  protected record Tenant(String accessToken, String email, UUID userId, UUID organizationId, UUID establishmentId) {}
}
