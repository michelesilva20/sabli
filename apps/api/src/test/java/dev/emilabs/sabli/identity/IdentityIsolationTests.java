package dev.emilabs.sabli.identity;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class IdentityIsolationTests extends IdentitySupport {

  @Test
  void registerLoginAndMeWork() throws Exception {
    Tenant tenant = registerTenant("ok");
    mockMvc
        .perform(get("/api/v1/me").header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value(tenant.email()))
        .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
        .andExpect(jsonPath("$.organizationMemberships[0].role").value("ADMIN"));
  }

  @Test
  void loginRejectsWrongPassword() throws Exception {
    Tenant tenant = registerTenant("bad");
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"wrong-password\"}".formatted(tenant.email())))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
  }

  @Test
  void unauthenticatedRequestsAreRejected() throws Exception {
    mockMvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/v1/organizations")).andExpect(status().isUnauthorized());
  }

  @Test
  void tenantCannotReadOrMutateAnotherTenant() throws Exception {
    Tenant alpha = registerTenant("alpha");
    Tenant beta = registerTenant("beta");

    mockMvc
        .perform(
            get("/api/v1/organizations/" + beta.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            get("/api/v1/establishments/" + beta.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken())))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            patch("/api/v1/organizations/" + beta.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            patch("/api/v1/establishments/" + beta.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isNotFound());
  }

  @Test
  void waiterCannotElevatePrivilegesOrSeeOtherEstablishment() throws Exception {
    Tenant owner = registerTenant("owner");
    Tenant other = registerTenant("other");

    String secondEstId =
        objectMapper
            .readTree(
                mockMvc
                    .perform(
                        post("/api/v1/organizations/" + owner.organizationId() + "/establishments")
                            .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Segunda loja\",\"slug\":\"segunda-loja\"}"))
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsString())
            .get("id")
            .asText();

    mockMvc
        .perform(
            put("/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"WAITER\"}".formatted(other.email())))
        .andExpect(status().isOk());

    String waiterToken = login(other.email(), "password10");

    mockMvc
        .perform(
            get("/api/v1/establishments/" + owner.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken)))
        .andExpect(status().isOk());

    var establishments =
        mockMvc
            .perform(
                get("/api/v1/organizations/" + owner.organizationId() + "/establishments")
                    .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken)))
            .andExpect(status().isOk())
            .andReturn();
    org.assertj.core.api.Assertions.assertThat(establishments.getResponse().getContentAsString())
        .doesNotContain("segunda-loja");

    mockMvc
        .perform(get("/api/v1/establishments/" + secondEstId).header(HttpHeaders.AUTHORIZATION, bearer(waiterToken)))
        .andExpect(status().isNotFound());

    mockMvc
        .perform(
            put("/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"ADMIN\"}".formatted(other.email())))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            put("/api/v1/organizations/" + owner.organizationId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"ADMIN\"}".formatted(other.email())))
        .andExpect(status().isForbidden());

    mockMvc
        .perform(
            patch("/api/v1/organizations/" + owner.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(waiterToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isForbidden());
  }

  @Test
  void revokedMembershipBlocksAccess() throws Exception {
    Tenant owner = registerTenant("rev");
    Tenant other = registerTenant("guest");
    mockMvc
        .perform(
            put("/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"KITCHEN\"}".formatted(other.email())))
        .andExpect(status().isOk());
    String kitchenToken = login(other.email(), "password10");
    mockMvc
        .perform(
            delete("/api/v1/establishments/" + owner.establishmentId() + "/memberships/" + other.userId())
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken())))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(
            get("/api/v1/establishments/" + owner.establishmentId())
                .header(HttpHeaders.AUTHORIZATION, bearer(kitchenToken)))
        .andExpect(status().isNotFound());
  }

  @Test
  void suspendedTenantBlocksMutations() throws Exception {
    Tenant tenant = registerTenant("susp");
    mockMvc
        .perform(
            patch("/api/v1/organizations/" + tenant.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"SUSPENDED\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/organizations/" + tenant.organizationId() + "/establishments")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nova\",\"slug\":\"nova-loja\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("TENANT_SUSPENDED"));
    mockMvc
        .perform(
            patch("/api/v1/organizations/" + tenant.organizationId())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"ACTIVE\"}"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            post("/api/v1/organizations/" + tenant.organizationId() + "/establishments")
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Depois da suspensao\",\"slug\":\"depois-suspensao\"}"))
        .andExpect(status().isCreated());
  }

  @Test
  void managerCannotGrantOrganizationAdmin() throws Exception {
    Tenant owner = registerTenant("mgr");
    Tenant other = registerTenant("peer");
    mockMvc
        .perform(
            put("/api/v1/organizations/" + owner.organizationId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(owner.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"MANAGER\"}".formatted(other.email())))
        .andExpect(status().isOk());
    String managerToken = login(other.email(), "password10");
    mockMvc
        .perform(
            put("/api/v1/organizations/" + owner.organizationId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"ADMIN\"}".formatted(other.email())))
        .andExpect(status().isForbidden());
    mockMvc
        .perform(
            put("/api/v1/establishments/" + owner.establishmentId() + "/memberships")
                .header(HttpHeaders.AUTHORIZATION, bearer(managerToken))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"role\":\"ADMIN\"}".formatted(other.email())))
        .andExpect(status().isForbidden());
  }

  @Test
  void contextValidationRejectsCrossOrganizationEstablishment() throws Exception {
    Tenant alpha = registerTenant("ctxa");
    Tenant beta = registerTenant("ctxb");
    mockMvc
        .perform(
            post("/api/v1/me/context")
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    "{\"organizationId\":\"%s\",\"establishmentId\":\"%s\"}"
                        .formatted(alpha.organizationId(), beta.establishmentId())))
        .andExpect(status().isNotFound());
  }

  @Test
  void refreshRotatesAndReuseRevokesFamily() throws Exception {
    Tenant tenant = registerTenant("tok");
    var first =
        mockMvc
            .perform(
                post("/api/v1/auth/refresh")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"refreshToken\":\"%s\"}".formatted(tenant.refreshToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.refreshToken").doesNotExist())
            .andReturn();
    String nextRefresh = refreshCookie(first);
    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"%s\"}".formatted(tenant.refreshToken())))
        .andExpect(status().isUnauthorized());
    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"%s\"}".formatted(nextRefresh)))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void refreshUsesHttpOnlyCookieWhenBodyIsAbsent() throws Exception {
    Tenant tenant = registerTenant("cook");
    var refreshed =
        mockMvc
            .perform(
                post("/api/v1/auth/refresh")
                    .cookie(new jakarta.servlet.http.Cookie("sabli_refresh", tenant.refreshToken())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").doesNotExist())
            .andReturn();
    org.assertj.core.api.Assertions.assertThat(refreshCookie(refreshed)).isNotEqualTo(tenant.refreshToken());
  }

  @Test
  void refreshWithoutCookieOrBodyIsRejected() throws Exception {
    mockMvc.perform(post("/api/v1/auth/refresh")).andExpect(status().isUnauthorized());
  }

  @Test
  void missingMembershipAndUnknownIdsReturnNotFound() throws Exception {
    Tenant tenant = registerTenant("miss");
    mockMvc
        .perform(
            get("/api/v1/organizations/" + java.util.UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isNotFound());
    mockMvc
        .perform(
            get("/api/v1/establishments/" + java.util.UUID.randomUUID())
                .header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isNotFound());
  }

  @Test
  void callerIdentityComesFromTheTokenNotFromPayloads() throws Exception {
    Tenant alpha = registerTenant("selfa");
    Tenant beta = registerTenant("selfb");
    mockMvc
        .perform(
            get("/api/v1/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(alpha.accessToken()))
                .header("X-User-Id", beta.userId().toString()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.id").value(alpha.userId().toString()))
        .andExpect(jsonPath("$.user.email").value(alpha.email()));
  }

  @Test
  void loginLockoutRejectsFurtherAttempts() throws Exception {
    Tenant tenant = registerTenant("lock");
    for (int i = 0; i < 5; i++) {
      mockMvc
          .perform(
              post("/api/v1/auth/login")
                  .contentType(MediaType.APPLICATION_JSON)
                  .content("{\"email\":\"%s\",\"password\":\"wrong-password\"}".formatted(tenant.email())))
          .andExpect(status().isUnauthorized());
    }
    mockMvc
        .perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"password10\"}".formatted(tenant.email())))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
  }

  @Test
  void refreshTokenIsStoredHashed() throws Exception {
    Tenant tenant = registerTenant("hash");
    org.assertj.core.api.Assertions.assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from refresh_sessions where token_hash = ?",
                Integer.class,
                tenant.refreshToken()))
        .isZero();
    org.assertj.core.api.Assertions.assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from refresh_sessions where token_hash = ?",
                Integer.class,
                dev.emilabs.sabli.identity.security.TokenHasher.sha256(tenant.refreshToken())))
        .isEqualTo(1);
  }

  @Test
  void authenticatedOpenApiDocumentsIdentityEndpoints() throws Exception {
    Tenant tenant = registerTenant("docs");
    mockMvc
        .perform(get("/v3/api-docs").header(HttpHeaders.AUTHORIZATION, bearer(tenant.accessToken())))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.paths['/api/v1/auth/login']").exists())
        .andExpect(jsonPath("$.paths['/api/v1/me']").exists())
        .andExpect(jsonPath("$.paths['/api/v1/organizations']").exists());
  }

  @Test
  void logoutRevokesRefreshToken() throws Exception {
    Tenant tenant = registerTenant("out");
    mockMvc
        .perform(
            post("/api/v1/auth/logout")
                .cookie(new jakarta.servlet.http.Cookie("sabli_refresh", tenant.refreshToken())))
        .andExpect(status().isNoContent());
    mockMvc
        .perform(
            post("/api/v1/auth/refresh")
                .cookie(new jakarta.servlet.http.Cookie("sabli_refresh", tenant.refreshToken())))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void loginSetsHttpOnlyRefreshCookieAndOmitsRefreshFromJson() throws Exception {
    Tenant tenant = registerTenant("json");
    var login =
        mockMvc
            .perform(
                post("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"%s\",\"password\":\"password10\"}".formatted(tenant.email())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").doesNotExist())
            .andReturn();
    String header = login.getResponse().getHeader(HttpHeaders.SET_COOKIE);
    org.assertj.core.api.Assertions.assertThat(header).contains("HttpOnly");
    org.assertj.core.api.Assertions.assertThat(header).contains("SameSite=Lax");
    org.assertj.core.api.Assertions.assertThat(refreshCookie(login)).isNotBlank();
  }
}
