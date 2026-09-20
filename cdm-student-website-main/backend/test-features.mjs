// Functional + security regression checks for the CdM API.
//
// Run the API first (it must be able to read ADMIN_PIN from backend/.env):
//   cd backend
//   npm run build
//   npm start                    # terminal 1
//   node test-features.mjs       # terminal 2
//
// Covers the real browser flow: cookies are kept in a jar and state-changing
// requests carry the X-CSRF-Token header, exactly like the SPA does.

const BASE = process.env.TEST_BASE ?? "http://localhost:8000";
const PIN = process.env.TEST_PIN ?? process.env.ADMIN_PIN ?? "admin123";

// ── Minimal cookie jar (Node's fetch does not persist cookies) ──────
const jar = new Map();

function rememberSetCookie(res) {
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const cookie of cookies) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    if (index > 0) jar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function clearJar() {
  jar.clear();
}

// GET / returns a CSRF token valid for the caller's CURRENT session (it is bound
// to the session cookie), so it must be re-fetched after login/logout.
async function bootstrapCsrf(extraHeaders = {}) {
  const res = await fetch(`${BASE}/`, {
    headers: { accept: "application/json", ...(cookieHeader() && { cookie: cookieHeader() }), ...extraHeaders },
  });
  rememberSetCookie(res);
  return res.headers.get("x-csrf-token") ?? "";
}

let passed = 0;
let failed = 0;
function check(name, cond, info = "") {
  if (cond) passed += 1;
  else failed += 1;
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${info ? " — " + info : ""}`);
}

// Request helper: attaches cookies, and the CSRF header for state-changing
// methods unless explicitly suppressed (used to prove the 403 path).
async function req(path, options = {}) {
  const method = (options.method ?? "GET").toUpperCase();
  const stateChanging = !["GET", "HEAD", "OPTIONS"].includes(method);
  const headers = {
    "content-type": "application/json",
    ...(cookieHeader() && { cookie: cookieHeader() }),
    ...(options.headers ?? {}),
  };
  if (stateChanging && !options.skipCsrf) {
    headers["x-csrf-token"] = await bootstrapCsrf();
    if (cookieHeader()) headers.cookie = cookieHeader();
  }

  const res = await fetch(BASE + path, { ...options, method, headers });
  rememberSetCookie(res);

  const text = await res.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const concern = (overrides = {}) => ({
  last: "Doe",
  first: "Jane",
  studentNumber: "24-00123",
  section: "4-A",
  institute: "ICS — Institute of Computer Studies",
  program: "BSIT",
  type: "Question",
  message: "Testing the concern submission.",
  consent: true,
  ...overrides,
});

// ── 1. Health + public reads ───────────────────────────────────────
const health = await req("/health");
check(
  "GET /health reports ok with a live database",
  health.status === 200 && health.body?.status === "ok" && health.body?.database === "ok",
  `status=${health.status} body=${JSON.stringify(health.body)}`,
);

const announcements = await req("/announcements");
check(
  "GET /announcements is public",
  announcements.status === 200 && Array.isArray(announcements.body),
  `status=${announcements.status}`,
);

// Malformed input must be reported as a client error, not a server crash.
const malformed = await fetch(`${BASE}/submit-concern`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-csrf-token": await bootstrapCsrf() },
  body: "{not valid json",
});
check("Malformed JSON body returns 400 (not 500)", malformed.status === 400, `status=${malformed.status}`);

// ── 2. Public concern form ─────────────────────────────────────────
const created = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify(concern()),
});
check(
  "POST valid concern",
  created.status === 201,
  `status=${created.status} body=${JSON.stringify(created.body)}`,
);
const concernId = created.body?.id;

const noConsent = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify(concern({ studentNumber: "24-00124", consent: undefined })),
});
check("POST rejected without RA 10173 consent", noConsent.status === 400, `status=${noConsent.status}`);

const badNumber = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify(concern({ studentNumber: "----" })),
});
check("POST rejected with malformed student number", badNumber.status === 400, `status=${badNumber.status}`);

const honeypot = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify(concern({ website: "http://spam.example" })),
});
check("POST rejected when the honeypot is filled", honeypot.status === 400, `status=${honeypot.status}`);

const tooFast = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify(concern({ formOpenedAt: Date.now() })),
});
check("POST rejected when submitted implausibly fast", tooFast.status === 400, `status=${tooFast.status}`);

const noCsrf = await req("/submit-concern", {
  method: "POST",
  skipCsrf: true,
  body: JSON.stringify(concern({ studentNumber: "24-00125" })),
});
check("POST rejected without CSRF header (403)", noCsrf.status === 403, `status=${noCsrf.status}`);

// ── 3. Admin login ─────────────────────────────────────────────────
// Mint an ANONYMOUS token first: CSRF tokens are bound to the session, so this
// one must stop working once a session exists (asserted in section 4).
const preLoginToken = await bootstrapCsrf();

const wrongPin = await req("/admin/login", {
  method: "POST",
  body: JSON.stringify({ pin: "definitely-wrong-pin" }),
});
check("Login rejects a wrong PIN", wrongPin.status === 401, `status=${wrongPin.status}`);

const login = await req("/admin/login", {
  method: "POST",
  body: JSON.stringify({ pin: PIN }),
});
check(
  "Login accepts the correct PIN",
  login.status === 200,
  `status=${login.status} body=${JSON.stringify(login.body)}`,
);
check(
  "Login response does NOT contain the session token (httpOnly cookie only)",
  login.status === 200 && !login.body?.token,
  `body=${JSON.stringify(login.body)}`,
);

const session = await req("/admin/session");
check(
  "Cookie session is authenticated",
  session.status === 200 && session.body?.authenticated === true,
  JSON.stringify(session.body),
);

// ── 4. CSRF tokens are bound to the session ────────────────────────
const stale = await fetch(`${BASE}/admin/concerns/${concernId}`, {
  method: "PATCH",
  headers: {
    "content-type": "application/json",
    cookie: cookieHeader(),
    "x-csrf-token": preLoginToken,
  },
  body: JSON.stringify({ status: "Read" }),
});
check(
  "A pre-login CSRF token is rejected on an authenticated request",
  stale.status === 403,
  `status=${stale.status}`,
);

const sessionToken = await bootstrapCsrf();
const fresh = await fetch(`${BASE}/admin/concerns/${concernId}`, {
  method: "PATCH",
  headers: {
    "content-type": "application/json",
    cookie: cookieHeader(),
    "x-csrf-token": sessionToken,
  },
  body: JSON.stringify({ status: "Read" }),
});
check("A session-bound CSRF token is accepted", fresh.status === 200, `status=${fresh.status}`);

// ── 5. Admin reads + audited export ────────────────────────────────
const search = await req("/admin/concerns?search=Doe");
const searchCount = Array.isArray(search.body?.data) ? search.body.data.length : 0;
check(
  "Admin search returns the submitted concern",
  search.status === 200 && searchCount >= 1,
  `status=${search.status} count=${searchCount}`,
);

const csvRes = await fetch(`${BASE}/admin/concerns/export`, {
  headers: { cookie: cookieHeader() },
});
const csvText = await csvRes.text();
check(
  "CSV export works for an authenticated admin",
  csvRes.status === 200 && csvText.includes("last_name"),
  `status=${csvRes.status}`,
);

const audit = await req("/admin/audit?limit=50");
const actions = Array.isArray(audit.body) ? audit.body.map((e) => e.action) : [];
const actionList = [...new Set(actions)].join(",");
check("CSV export is recorded in the audit log", actions.includes("concern.export"), `actions=${actionList}`);
check(
  "Failed logins are recorded in the audit log",
  actions.includes("admin.login_failed"),
  `actions=${actionList}`,
);
check(
  "Audit entries record the origin IP",
  Array.isArray(audit.body) && audit.body.some((e) => Boolean(e.ip)),
  `first=${JSON.stringify(audit.body?.[0])}`,
);


// ── 6. Announcement validation (one shared schema) ─────────────────
// NOTE: create lives at POST /announcements (admin-authenticated); only the
// update/delete variants live under /admin/announcements/:id.
const badArea = await req("/announcements", {
  method: "POST",
  body: JSON.stringify({
    title: "Injection attempt",
    date: "Jan 1",
    priority: "Normal",
    area: "<script>alert(1)</script>",
    content: "x",
  }),
});
check(
  "Announcement with a malicious area is rejected",
  badArea.status === 400,
  `status=${badArea.status} body=${JSON.stringify(badArea.body)}`,
);

const badPriority = await req("/announcements", {
  method: "POST",
  body: JSON.stringify({
    title: "Bad priority",
    date: "Jan 1",
    priority: "Critical; DROP TABLE",
    area: "Library",
    content: "x",
  }),
});
check(
  "Announcement with an invalid priority is rejected",
  badPriority.status === 400,
  `status=${badPriority.status}`,
);

const goodAnn = await req("/announcements", {
  method: "POST",
  body: JSON.stringify({
    title: "Security regression check",
    date: "Jan 1",
    priority: "Normal",
    area: "Registrar's Office",
    content: "Created by test-features.mjs, deleted again below.",
  }),
});
check(
  "Announcement with a valid payload is created",
  goodAnn.status === 201,
  `status=${goodAnn.status} body=${JSON.stringify(goodAnn.body)}`,
);
if (goodAnn.body?.id) {
  const removed = await req(`/admin/announcements/${goodAnn.body.id}`, { method: "DELETE" });
  check("Created announcement can be deleted again", removed.status === 200, `status=${removed.status}`);
}

// ── 7. Removed attack surface / auth required ──────────────────────
// A true anonymous request: no cookies at all, and a CSRF token minted for an
// anonymous caller (a browser visitor would do exactly this). Plain fetches are
// used because req() always attaches the admin session cookie.
const anonBoot = await fetch(`${BASE}/`, { headers: { accept: "application/json" } });
const anonToken = anonBoot.headers.get("x-csrf-token") ?? "";

const publicPost = await fetch(`${BASE}/announcements`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-csrf-token": anonToken,
  },
  body: JSON.stringify({
    title: "Hack",
    date: "Jan 1",
    priority: "Normal",
    area: "AVR",
    content: "spam",
  }),
});
check(
  "Unauthenticated POST /announcements is rejected (401, not CSRF 403)",
  publicPost.status === 401,
  `status=${publicPost.status}`,
);

const studentLogin = await req("/student/login", {
  method: "POST",
  body: JSON.stringify({ studentNumber: "24-00123", password: "student123" }),
});
check("Removed /student/* endpoints are gone (404)", studentLogin.status === 404, `status=${studentLogin.status}`);

// ── 8. Brute-force lockout (per IP) ────────────────────────────────
// A spoofed X-Forwarded-For exercises the lockout against an IP that is not this
// machine, so the 15-minute lock cannot block the checks above. It also proves
// `app.set("trust proxy", 1)` resolves the real client IP instead of lumping
// every client behind the proxy into a single rate-limit bucket.
const FAKE_IP = "203.0.113.9"; // TEST-NET-3, reserved for documentation
const statuses = [];
let locked = false;
for (let attempt = 1; attempt <= 8; attempt += 1) {
  const csrf = await bootstrapCsrf({ "x-forwarded-for": FAKE_IP });
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: cookieHeader(),
      "x-forwarded-for": FAKE_IP,
      "x-csrf-token": csrf,
    },
    body: JSON.stringify({ pin: `wrong-${attempt}` }),
  });
  statuses.push(res.status);
  await res.text();
  if (res.status === 429) {
    locked = true;
    break;
  }
}
console.log(`INFO: login statuses from ${FAKE_IP}: ${statuses.join(",")}`);
check("Repeated failed logins trigger a 429 lockout", locked, `statuses=${statuses.join(",")}`);

const postAudit = await req("/admin/audit?limit=100");
const fakeIpFailures = Array.isArray(postAudit.body)
  ? postAudit.body.filter((e) => e.action === "admin.login_failed" && e.ip === FAKE_IP).length
  : 0;
console.log(`INFO: admin.login_failed entries stored for ${FAKE_IP}: ${fakeIpFailures}`);

const realIpStillWorks = await fetch(`${BASE}/admin/login`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    cookie: cookieHeader(),
    "x-csrf-token": await bootstrapCsrf(),
  },
  body: JSON.stringify({ pin: PIN }),
});
check(
  "A different IP is unaffected by that lockout (per-IP, not global)",
  realIpStillWorks.status === 200,
  `status=${realIpStillWorks.status}`,
);

// ── 9. Cleanup ─────────────────────────────────────────────────────
if (concernId) {
  const deleted = await req(`/admin/concerns/${concernId}`, { method: "DELETE" });
  check("Test concern cleaned up", deleted.status === 200, `status=${deleted.status}`);
}

// Remove any announcement a previous (buggy) run may have left behind.
const leftovers = await req("/announcements");
if (Array.isArray(leftovers.body)) {
  const junk = leftovers.body.filter(
    (a) => a.title === "Hack" || a.title === "Security regression check",
  );
  for (const a of junk) {
    const res = await req(`/admin/announcements/${a.id}`, { method: "DELETE" });
    console.log(`INFO: removed leftover test announcement #${a.id} "${a.title}" (status=${res.status})`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

