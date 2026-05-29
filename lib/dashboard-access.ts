export function isDashboardAccessEnabled(): boolean {
  return [process.env.DMARK_DASHBOARD_ACCESS, process.env.DMARK_DASHBOARD_ENABLED]
    .filter(Boolean)
    .some((value) => ["1", "true", "yes", "open"].includes(String(value).trim().toLowerCase()));
}

export function dashboardLockedResponseBody() {
  return {
    error: "Dashboard access is closed until the private beta is ready.",
  };
}
