package dev.emilabs.sabli.shared.security;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, String email) {}
