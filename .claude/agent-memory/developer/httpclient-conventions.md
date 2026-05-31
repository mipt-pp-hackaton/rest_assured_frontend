---
name: httpclient-conventions
description: Content-Type defaulting and 2xx body-parsing rules in src/api/httpClient.ts request()
metadata:
  type: project
---

`request<T>()` in `src/api/httpClient.ts` is the single fetch wrapper for the REST API.

Two non-obvious rules baked in (architect-mandated):

1. **Content-Type defaulting is conditional.** `application/json` is only auto-set when a body is present, the caller hasn't set Content-Type, AND the body is NOT one of `URLSearchParams | FormData | Blob | ReadableStream`. Those types let fetch set their own header (urlencoded, multipart boundary, etc.). Helper: `bodyManagesOwnContentType()`.
   - **Why:** the login flow posts `URLSearchParams` as `application/x-www-form-urlencoded`; forcing JSON corrupts it.
   - **How to apply:** when adding new body types, decide whether fetch manages the header; if so, add to the helper rather than forcing JSON.

2. **Success path never throws SyntaxError.** Any 2xx with no/empty/non-JSON body resolves to `undefined`. Implementation reads `response.text()`, returns `undefined` on empty, and wraps `JSON.parse` in try/catch (also early-returns undefined for 204/205). Do not reintroduce a bare `response.json()` on the success path.
   - **How to apply:** callers should treat `undefined` as "no content"; don't assume a 2xx always yields `T`.
