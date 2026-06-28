# Security Specification for Wedding RSVP

## Data Invariants
1. Any RSVP document must have an `attending` boolean field.
2. Any RSVP document must have a `createdAt` timestamp field which is equal to `request.time`.
3. RSVPs cannot be updated or deleted by anyone once created.
4. RSVP document IDs must be valid alphanumeric IDs.
5. Clients are allowed to list/read RSVPs to calculate aggregate counts, but they cannot perform single document gets or updates/deletions.

## The "Dirty Dozen" Payloads
These payloads attempt to breach the integrity of the RSVP collection and must be rejected:

1. **The Ghost Field (Shadow Update) Attack**: Creating an RSVP with extra unallowed fields.
   ```json
   { "attending": true, "createdAt": "request.time", "isVerifiedAdmin": true }
   ```
2. **Missing Field Attack**: Creating an RSVP without `attending`.
   ```json
   { "createdAt": "request.time" }
   ```
3. **Missing CreatedAt Attack**: Creating an RSVP without `createdAt`.
   ```json
   { "attending": true }
   ```
4. **Invalid Type for Attending**: `attending` passed as string.
   ```json
   { "attending": "yes", "createdAt": "request.time" }
   ```
5. **Invalid Type for CreatedAt**: `createdAt` passed as integer.
   ```json
   { "attending": true, "createdAt": 1234567890 }
   ```
6. **Fake Time Spoofing**: Setting `createdAt` to a custom/past time instead of `request.time`.
   ```json
   { "attending": true, "createdAt": "2020-01-01T00:00:00Z" }
   ```
7. **The Update Attempt**: Attempting to change an existing RSVP document.
   ```json
   { "attending": false, "createdAt": "request.time" }
   ```
8. **The Deletion Attempt**: Attempting to delete an existing RSVP document.
9. **Single Document Get**: Attempting to read a specific RSVP document by ID.
10. **Huge ID Poisoning Attack**: Trying to write with a massive 1MB string document ID.
11. **Malicious Empty Write**: Writing an empty map.
    ```json
    {}
    ```
12. **Array Injection Attack**: Inserting lists or arrays where simple types are expected.
    ```json
    { "attending": [true, false], "createdAt": "request.time" }
    ```

## Test Suite Reference
The security rules will enforce these invariants directly.
