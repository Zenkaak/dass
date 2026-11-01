# DASNET order-chat attachment scanner

Order-chat attachments are intentionally fail-closed. The API will not mark an attachment ready or issue a download URL until it has verified the stored object and received an explicit clean verdict from a malware-scanning service.

Configure these server-side Vercel environment variables for the production environment:

- `DASNET_FILE_SCAN_URL`: HTTPS endpoint that accepts a raw file body with `Content-Type: application/octet-stream`.
- `DASNET_FILE_SCAN_TOKEN`: optional bearer token for authenticating the scanner request. Keep this value in server-side environment variables only.

The API sends the uploaded bytes as the request body and includes `X-File-Name` and `X-File-Content-Type` headers. The scanner must return JSON with either:

- `{"clean": true}` (or `{"status":"clean"}`) only after a completed malware scan with no detections.
- `{"infected": true}` (or `{"status":"infected"}`) when a threat is detected.

Any non-2xx response, invalid JSON, timeout/network error, missing scanner configuration, or ambiguous verdict is treated as a failed scan. Such files remain unavailable for download. The API also checks the actual stored byte count and basic file signatures against the declared MIME type before forwarding the bytes to the scanner.

Do not point this setting at an endpoint that merely accepts uploads or checks file extensions. It must perform a real malware scan and return a definitive verdict. The scanner service should enforce a 10 MB request limit and should not retain uploaded files after scanning unless a documented retention policy is approved.

After configuring the scanner, test with a harmless supported file and the standard EICAR antivirus test file in a non-production test environment. Confirm the harmless file becomes downloadable only after a clean verdict and the EICAR file is rejected and never receives a download URL.
