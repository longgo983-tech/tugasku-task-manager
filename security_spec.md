# Security Specification & Test Payloads

## 1. Data Invariants
1. **User Scoping & Isolation**: A user can only read, create, update, or delete tasks and settings belonging exclusively to their own `request.auth.uid`.
2. **Path Parameter Integrity**: Path variable `{userId}` must strictly equal `request.auth.uid`. Path variables `{taskId}` and `{settingId}` must satisfy `isValidId()`.
3. **Payload Immutability**: `userId` in the payload must strictly match `request.auth.uid` on write, and cannot be modified on update (`incoming().userId == existing().userId`).
4. **Field Boundaries & Type Safety**:
   - `title`: string between 1 and 200 characters.
   - `description`: optional string up to 1000 characters.
   - `category`: must be one of `['work', 'personal', 'study', 'health', 'urgent', 'general']`.
   - `priority`: must be one of `['low', 'medium', 'high', 'urgent']`.
   - `status`: must be one of `['pending', 'in_progress', 'completed']`.
   - `reminderEnabled`, `dailyRecurring`: booleans.
   - `dueDate`, `dueTime`, `reminderTime`: strings strictly bounded in size.
5. **No Shadow Fields**: Strict key whitelisting on create and affectedKeys check on update.
6. **No Blanket Access**: Default deny on catch-all; list queries must be scoped to the authenticated user's subcollection path.

## 2. The Dirty Dozen Payloads (Must be REJECTED)
1. **Unauthenticated Write**: Creating a task with `request.auth == null`.
2. **Identity Spoofing**: User `user_A` writing a task into `/users/user_B/tasks/task_1`.
3. **Mismatched Payload UID**: User `user_A` writing payload `{"userId": "user_B", ...}` into `/users/user_A/tasks/task_1`.
4. **ID Poisoning Attack**: Attempting to write to `/users/{uid}/tasks/<10kb_string_with_illegal_characters>`.
5. **Shadow Field Injection**: Attempting to write `{ "title": "Buy milk", "isAdmin": true, ... }`.
6. **Title Overflow Attack**: Task with `title` string length > 200 characters.
7. **Description Denial of Wallet**: Task with `description` string length > 1000 characters.
8. **Invalid Enum Attack**: Task with `priority: "super_ultra_high"`.
9. **Invalid Category Attack**: Task with `category: "hacked_category"`.
10. **Tampering with Immutable User ID**: Updating a task to change `userId` from `user_A` to `user_B`.
11. **Type Confusion Attack**: Supplying boolean or array for string fields (e.g. `title: true`).
12. **Cross-User Data Scraping**: User `user_A` querying list on `/users/user_B/tasks`.
