package dev.emilabs.sabli.shared.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SabliOpenApiConfiguration {

  @Bean
  OpenAPI sabliOpenApi() {
    return new OpenAPI()
        .components(
            new Components()
                .addSecuritySchemes(
                    "bearer-jwt",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Access token de curta duração. O contexto de tenant é validado no servidor.")))
        .info(
            new Info()
                .title("Sabli API")
                .version("0.1.0")
                .description(
                    "Identidade, catálogo, mesas e pedidos/KDS por estabelecimento. Caixa e pagamentos ficam para o próximo checkpoint."));
  }
}
