const BASE = "http://localhost:8000";

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
  });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

function check(name, cond, info = "") {
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}${info ? " — " + info : ""}`);
}

// 1. POST with valid student number format + consent
const created = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify({
    last: "Doe",
    first: "Jane",
    studentNumber: "24-00123",
    section: "4-A",
    institute: "ICS — Institute of Computer Studies",
    program: "BSIT",
    type: "Question",
    message: "Testing the concern submission.",
    consent: true,
  }),
});
check("POST valid concern", created.status === 201, `status=${created.status} body=${JSON.stringify(created.body)}`);
const id = created.body?.id;
const trackingCode = created.body?.tracking_code;
check("POST returns tracking code", !!trackingCode, `tracking_code=${trackingCode}`);

// 1b. POST without consent is rejected
const noConsent = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify({
    last: "No",
    first: "Consent",
    studentNumber: "24-00124",
    section: "4-A",
    institute: "ICS",
    program: "BSIT",
    type: "Question",
    message: "Should fail without consent.",
  }),
});
check("POST rejected without consent", noConsent.status === 400, `status=${noConsent.status}`);

// 1c. Public tracking lookup
if (trackingCode) {
  const track = await req(`/track/${trackingCode}`);
  check(
    "Track concern by code",
    track.status === 200 && track.body?.status === "Pending",
    `status=${track.status} body=${JSON.stringify(track.body)}`,
  );
}

// 2. POST with invalid student number
const bad = await req("/submit-concern", {
  method: "POST",
  body: JSON.stringify({
    last: "Bad",
    first: "Format",
    studentNumber: "----",
    section: "4-A",
    institute: "ICS",
    program: "BSIT",
    type: "Question",
    message: "Invalid format test",
    consent: true,
  }),
});
check("POST invalid student number rejected", bad.status === 400, `status=${bad.status} body=${JSON.stringify(bad.body)}`);

// 3. Admin login
const login = await req("/admin/login", {
  method: "POST",
  body: JSON.stringify({ pin: "admin123" }),
});
const token = login.body?.token;
check("Admin login", login.status === 200 && !!token, `status=${login.status}`);

if (token) {
  const auth = { authorization: `Bearer ${token}` };

  // 3b. Admin session check
  const session = await req("/admin/session", { headers: auth });
  check("Admin session check", session.status === 200 && session.body?.authenticated === true, `status=${session.status} body=${JSON.stringify(session.body)}`);

  // 4. Admin concerns with search
  const s = await req("/admin/concerns?search=Doe", { headers: auth });
  const sCount = Array.isArray(s.body?.data) ? s.body.data.length : 0;
  check("Admin search concerns", s.status === 200 && sCount >= 1, `status=${s.status} count=${sCount}`);

  // 4b. CSV export
  const csv = await fetch(BASE + "/admin/concerns/export", { headers: auth });
  const csvText = await csv.text();
  check(
    "Admin CSV export",
    csv.status === 200 && csvText.includes("tracking_code"),
    `status=${csv.status} hasHeader=${csvText.includes("tracking_code")}`,
  );

  // 4c. Audit log
  const audit = await req("/admin/audit", { headers: auth });
  check(
    "Admin audit log",
    audit.status === 200 && Array.isArray(audit.body),
    `status=${audit.status} entries=${Array.isArray(audit.body) ? audit.body.length : 0}`,
  );

  // 5. Admin update announcement
  const ann = await (async () => {
    const r = await fetch(BASE + "/announcements");
    const d = await r.json();
    return Array.isArray(d) && d.length > 0 ? d[0] : null;
  })();
  if (ann?.id) {
    const upd = await req(`/admin/announcements/${ann.id}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify({ ...ann, title: ann.title + " (updated)" }),
    });
    check("Admin update announcement", upd.status === 200, `status=${upd.status} body=${JSON.stringify(upd.body)}`);
    // revert
    await req(`/admin/announcements/${ann.id}`, {
      method: "PUT",
      headers: auth,
      body: JSON.stringify(ann),
    });
  } else {
    check("Admin update announcement", false, "no announcements in DB");
  }

  // 6. Admin update concern status
  if (id) {
    const updStatus = await req(`/admin/concerns/${id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ status: "Read" }),
    });
    check("Admin update concern status", updStatus.status === 200, `status=${updStatus.status}`);
  }

  // 6b. Admin update concern response
  if (id) {
    const updResp = await req(`/admin/concerns/${id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ status: "Resolved", response: "Thanks for your feedback!" }),
    });
    check("Admin update concern response", updResp.status === 200 && updResp.body?.response === "Thanks for your feedback!", `status=${updResp.status}`);
  }

  // 6c. Student sees the response via tracking
  if (trackingCode) {
    const track2 = await req(`/track/${trackingCode}`);
    check(
      "Track shows response",
      track2.status === 200 && track2.body?.status === "Resolved" && track2.body?.response,
      `body=${JSON.stringify(track2.body)}`,
    );
  }

  // 7. Admin delete concern
  if (id) {
    const del = await req(`/admin/concerns/${id}`, {
      method: "DELETE",
      headers: auth,
    });
    check("Admin delete concern", del.status === 200, `status=${del.status} body=${JSON.stringify(del.body)}`);
  }

  // 8. Admin delete concern - missing
  const delMissing = await req("/admin/concerns/999999", { method: "DELETE", headers: auth });
  check("Admin delete missing concern", delMissing.status === 200 || delMissing.status === 404, `status=${delMissing.status}`);
}

// 9. Public announcement POST is now rejected (auth required)
const publicPost = await req("/announcements", {
  method: "POST",
  body: JSON.stringify({ title: "Hack", date: "Jan 1", priority: "Normal", content: "spam" }),
});
check("Public announcement POST rejected", publicPost.status === 401, `status=${publicPost.status}`);

