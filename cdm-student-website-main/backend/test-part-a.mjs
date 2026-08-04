// Test: Student dashboard concern submission (Part A)
// - POST /student/login
// - POST /student/concerns (new)
// - GET /student/concerns (verify new concern appears)
const BASE = "http://localhost:8000/student";

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exitCode = 1;
  } else {
    console.log("PASS:", msg);
  }
}

async function main() {
  // 1. Login
  const loginRes = await fetch(`${BASE}/login`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ studentNumber: "24-00123", password: "student123" }),
  });
  const loginCookie = (loginRes.headers.get("set-cookie") ?? "").split(";")[0];
  assert(loginRes.ok, `login returns 200 (got ${loginRes.status})`);
  const loginData = await loginRes.json();
  assert(loginData.student?.student_number === "24-00123", "login returns demo student");

  const headers = {
    "content-type": "application/json",
    cookie: loginCookie,
  };

  // 2. Missing consent should fail
  const noConsentRes = await fetch(`${BASE}/concerns`, {
    method: "POST",
    headers,
    body: JSON.stringify({ type: "Question", message: "Hello", consent: false }),
  });
  assert(noConsentRes.status === 400, "missing consent returns 400 (got " + noConsentRes.status + ")");
  const noConsentData = await noConsentRes.json();
  assert(
    Array.isArray(noConsentData.errors) && noConsentData.errors.some((e) => e.includes("consent")),
    "error message mentions consent",
  );

  // 3. Valid submit
  const submitRes = await fetch(`${BASE}/concerns`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "Question",
      message: "Part A test: enrollment schedule inquiry.",
      consent: true,
    }),
  });
  const submitData = await submitRes.json();
  assert(submitRes.status === 201, "valid submit returns 201 (got " + submitRes.status + ")");
  assert(submitData.id && submitData.status === "Pending", "submit returns id + Pending status");

  // 4. Fetch concerns - verify the submitted one shows up
  const concernsRes = await fetch(`${BASE}/concerns`, { headers });
  assert(concernsRes.ok, "fetch concerns returns 200");
  const concernsData = await concernsRes.json();
  const found = concernsData.concerns.find((c) => c.id === submitData.id);
  assert(found, "submitted concern appears in GET /student/concerns");
  assert(
    found && found.last_name === "Demo" && found.student_number === "24-00123",
    "concern auto-filled with student info from session",
  );

  console.log("\nDone. All Part A endpoint tests executed.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exitCode = 1;
});

