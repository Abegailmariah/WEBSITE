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

// 1. POST with valid student number format
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
  }),
});
check("POST valid concern", created.status === 201, `status=${created.status} body=${JSON.stringify(created.body)}`);
const id = created.body?.id;

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

  // 4. Admin concerns with search
  const s = await req("/admin/concerns?search=Doe", { headers: auth });
  const sCount = Array.isArray(s.body?.data) ? s.body.data.length : 0;
  check("Admin search concerns", s.status === 200 && sCount >= 1, `status=${s.status} count=${sCount}`);

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

