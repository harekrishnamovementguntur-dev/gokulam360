# Administrator Assistant & Parent QR

## Administrator Assistant

The Ask Assistant screen is a task-oriented office tool. Administrators and teachers can ask plain-language questions such as:

- How many were present?
- How many were absent?
- Give me the phone numbers of absentees.
- What payments are pending?
- What are the next sessions?

The answer is calculated from canonical organization-scoped records. The assistant never trusts a client-supplied organization for normal organization users; Super Admin requests require an explicit target organization. Phone numbers are returned only to Super Admins and Organization Administrators.

If both OPENAI_API_KEY and OPENAI_MODEL are configured, the model may rewrite the verified result into a concise answer. The model is never the source of counts or contact data. Without those variables, the deterministic verified-data assistant remains fully usable.

Optional variables:

- OPENAI_API_KEY
- OPENAI_MODEL

No OpenAI key is exposed to the browser.

## Parent QR view

The QR token on a student ID card opens /p/{token} without requiring a parent account. The route reads canonical Memberships, Membership Term Participations, Program Offerings, Academic Terms, Sessions, Attendance Records, and Payment Transactions.

Announcements are limited to the student's relevant class/offering plus explicitly public announcements, with a maximum of three. The QR token is the access credential; do not place student phone numbers or secrets in the QR payload.

## Product rules

- Administrators ask for tasks, not collections.
- Empty data produces a clear empty answer.
- Financial values are formatted from minor units.
- Parent-facing data is limited to the linked student.
- The feature adds no domain entities and does not replace canonical APIs.