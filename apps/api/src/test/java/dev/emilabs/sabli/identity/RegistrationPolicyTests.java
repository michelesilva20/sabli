package dev.emilabs.sabli.identity;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
    properties = {
      "sabli.identity.registration.mode=BOOTSTRAP_TOKEN",
      "sabli.identity.registration.bootstrap-token=invite-secret-token"
    })
class RegistrationPolicyTests extends IdentitySupport {

  @Test
  void organizationSignupRequiresBootstrapToken() throws Exception {
    String body =
        """
        {
          "organizationName": "Org convite",
          "organizationSlug": "org-convite-%s",
          "establishmentName": "Loja convite",
          "establishmentSlug": "loja-convite",
          "name": "Admin Convite",
          "email": "admin-convite-%s@example.com",
          "password": "password10"
        }
        """
            .formatted(java.util.UUID.randomUUID().toString().substring(0, 8), java.util.UUID.randomUUID());
    mockMvc
        .perform(post("/api/v1/auth/register-organization").contentType(MediaType.APPLICATION_JSON).content(body))
        .andExpect(status().isForbidden());

    String withWrongToken =
        body.replace("}", ",\"bootstrapToken\":\"errado\"}");
    mockMvc
        .perform(
            post("/api/v1/auth/register-organization")
                .contentType(MediaType.APPLICATION_JSON)
                .content(withWrongToken))
        .andExpect(status().isForbidden());

    String withToken = body.replace("}", ",\"bootstrapToken\":\"invite-secret-token\"}");
    mockMvc
        .perform(
            post("/api/v1/auth/register-organization").contentType(MediaType.APPLICATION_JSON).content(withToken))
        .andExpect(status().isCreated());
  }
}
