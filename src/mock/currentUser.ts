// Placeholder signed-in user shown in the navbar and account settings.
// Fields mirror users + user_profiles columns (no auth yet, so email lives
// here too). Anything else — display name, initials — is derived from these
// at the point of use rather than stored, so it can never drift out of sync.
export const currentUser = {
  email: 'nisa.p@bma.go.th',
  firstName: 'Nisa',
  lastName: 'Phromsuwan',
  department: 'City Planning & Urban Development',
  position: 'Urban Planner',
}
