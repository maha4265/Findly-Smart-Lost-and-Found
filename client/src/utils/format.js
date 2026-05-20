export function reportTitle(report) {
  return `${report.type === "lost" ? "Lost" : "Found"} ${report.category} at ${report.location}`;
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString();
}
