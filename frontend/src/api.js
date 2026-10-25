async function request(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error("Can't reach the planner service. Is the Python server running?");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(body.detail)
      ? "Some numbers are out of range. Please check your inputs."
      : body.detail;
    throw new Error(detail || `Something went wrong (error ${res.status}).`);
  }
  return body;
}

export function uploadWorkbook(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/api/upload", { method: "POST", body: form });
}

export function loadExample() {
  return request("/api/example");
}

export function planCrosses(crosses, parents, settings) {
  return request("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ crosses, parents, settings }),
  });
}
