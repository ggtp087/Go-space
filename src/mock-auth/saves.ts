// TEMPORARY — account mocks only, removed in the auth round (see ./README.md).
// Simulated account requests: they wait briefly and succeed, so the
// confirmation dialogs and success toasts can be exercised. Nothing is sent
// or stored.

const SIMULATED_LATENCY_MS = 700

function simulateRequest(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, SIMULATED_LATENCY_MS))
}

/** Stand-in for POST register (app.users + app.user_profiles). */
export function submitRegistration(): Promise<void> {
  return simulateRequest()
}

/** Stand-in for updating app.user_profiles. */
export function saveProfile(): Promise<void> {
  return simulateRequest()
}

/** Stand-in for changing app.users.password_hash. */
export function changePassword(): Promise<void> {
  return simulateRequest()
}
