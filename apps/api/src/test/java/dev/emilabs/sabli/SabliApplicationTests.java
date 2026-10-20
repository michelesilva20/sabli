package dev.emilabs.sabli;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SabliApplicationTests extends AbstractIntegrationTest {

  @Autowired
  private ApplicationContext context;

  @Autowired
  private UserDetailsService userDetailsService;

  @Test
  void contextLoads() {
    assertThat(context).isNotNull();
    assertThat(context.containsBean("sabliApplication")).isTrue();
  }

  @Test
  void doesNotExposeADefaultAdministrator() {
    assertThatThrownBy(() -> userDetailsService.loadUserByUsername("admin"))
        .isInstanceOf(UsernameNotFoundException.class);
    assertThatThrownBy(() -> userDetailsService.loadUserByUsername("user"))
        .isInstanceOf(UsernameNotFoundException.class);
  }
}
