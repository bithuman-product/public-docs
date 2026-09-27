// node --test src/lib/curl-samples.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCurl, samplesFromCurl, toPython, toNode } from "./curl-samples.mjs";

test("a POST with headers and a JSON body", () => {
  const req = parseCurl(`curl -X POST https://api.bithuman.ai/v1/agent/generate \\
  -H "Content-Type: application/json" \\
  -H "api-secret: $BITHUMAN_API_SECRET" \\
  -d '{"model": "expression-2", "prompt": "Hi"}'
# → {"success": true}`);
  assert.equal(req.method, "POST");
  assert.deepEqual(req.body, { model: "expression-2", prompt: "Hi" });
  assert.deepEqual(req.headers[1].value, [{ env: "BITHUMAN_API_SECRET" }]);
  const py = toPython(req);
  assert.match(py, /^import os, requests/);
  assert.match(py, /requests\.post\(/);
  assert.match(py, /"api-secret": os\.environ\["BITHUMAN_API_SECRET"\]/);
  assert.doesNotMatch(py, /Content-Type/, "requests sets it for json=");
  const js = toNode(req);
  assert.match(js, /method: "POST"/);
  assert.match(js, /"api-secret": process\.env\.BITHUMAN_API_SECRET/);
  assert.match(js, /body: JSON\.stringify\(/);
});

test("a GET defaults the method and prints JSON", () => {
  const s = samplesFromCurl('curl "https://api.bithuman.ai/v1/agents?status=ready" -H "api-secret: $BITHUMAN_API_SECRET"');
  assert.match(s.python, /requests\.get\(/);
  assert.match(s.python, /print\(resp\.json\(\)\)/);
  assert.match(s.node, /await fetch\("https:\/\/api\.bithuman\.ai\/v1\/agents\?status=ready"/);
  assert.doesNotMatch(s.node, /method:/);
});

test("-o writes the body to a file; -f fails on an error status", () => {
  const s = samplesFromCurl('curl -fL -o wise-pup.imx "https://api.bithuman.ai/v1/agent/A23WJF0199/model/download?model=expression-2"');
  assert.match(s.python, /resp\.raise_for_status\(\)/);
  assert.match(s.python, /open\("wise-pup\.imx", "wb"\)/);
  assert.match(s.node, /writeFile\("wise-pup\.imx"/);
  assert.match(s.node, /if \(!resp\.ok\) throw/);
});

test("a variable spliced into the JSON body stays a variable", () => {
  const s = samplesFromCurl(`curl -X POST https://api.bithuman.ai/v1/video/generate -H "api-secret: $BITHUMAN_API_SECRET" -d '{"agent_code": "'"$BITHUMAN_AGENT_CODE"'", "wait": true}'`);
  assert.match(s.python, /"agent_code": os\.environ\["BITHUMAN_AGENT_CODE"\]/);
  assert.match(s.python, /"wait": True/);
  assert.match(s.node, /agent_code: process\.env\.BITHUMAN_AGENT_CODE/);
});

test("a variable in the URL", () => {
  const s = samplesFromCurl('curl https://api.bithuman.ai/v1/agent/$AGENT_CODE -H "api-secret: $BITHUMAN_API_SECRET"');
  assert.match(s.python, /f"https:\/\/api\.bithuman\.ai\/v1\/agent\/\{os\.environ\['AGENT_CODE'\]\}"/);
  assert.match(s.node, /`https:\/\/api\.bithuman\.ai\/v1\/agent\/\$\{process\.env\.AGENT_CODE\}`/);
});

test("anything that is not one plain request stays curl alone", () => {
  assert.equal(samplesFromCurl('export X=1\ncurl https://a.b'), null);
  assert.equal(samplesFromCurl("curl -s https://a.b | jq ."), null);
  assert.equal(samplesFromCurl('curl -F "file=@a.pdf" https://a.b'), null);
  assert.equal(samplesFromCurl("curl https://a.b\ncurl https://c.d"), null);
  assert.equal(samplesFromCurl(`curl -d 'not json' https://a.b`), null);
  assert.equal(samplesFromCurl(`curl -d '{"a": "x'"$Y"'"}' https://a.b`), null, "a partial splice is not converted");
  assert.equal(samplesFromCurl("bithuman list"), null);
});
