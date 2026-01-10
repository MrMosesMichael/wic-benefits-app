# Data Sovereignty Specification

## Purpose

Ensure users have complete control over their personal data. WIC participants already face surveillance from multiple systems - this app must be different. Data sovereignty is a **foundational right**, not polish.

## Guiding Principles

1. **User Ownership** - Users own their data, we merely steward it
2. **Minimal Collection** - Only collect what's necessary for function
3. **Transparency** - No hidden data collection, ever
4. **Right to Exit** - Users can leave and take their data with them
5. **No Extraction** - Data flows TO users, never extracted FROM them
6. **Privacy Over Convenience** - When in conflict, choose privacy

---

## Requirements

### Requirement: Data Export

The system SHALL allow users to export all their personal data.

#### Scenario: Request data export
- GIVEN user wants to see/save their data
- WHEN user navigates to Settings > Privacy > Export My Data
- THEN export options are presented:
  ```
  Export Your Data

  Download everything we have about you.
  This includes:
  • Your profile and household
  • Benefit tracking history
  • Scan history
  • Shopping trips and transactions
  • Favorite stores
  • Alert subscriptions
  • App preferences

  Format:
  ○ JSON (for developers/apps)
  ○ CSV (for spreadsheets)
  ○ PDF Report (human-readable)

  [Export Now]
  ```
- AND all formats include the same complete data

#### Scenario: Generate export
- GIVEN user requested data export
- WHEN export is generated
- THEN comprehensive file is created
- AND process shows progress indicator
- AND user is notified when ready
- AND download link is provided
- AND link expires after 24 hours for security

#### Scenario: Export includes all data
- WHEN export is generated
- THEN it includes:
  - Profile: name, email/phone, state, household info
  - Participants: all household members and types
  - Benefits: current and historical benefit allocations
  - Transactions: all shopping trips and checkouts
  - Scans: every product scanned (with timestamp)
  - Locations: stores visited, store preferences
  - Alerts: all notification subscriptions
  - Settings: all app preferences
  - Timestamps: when data was created/modified
- AND export includes metadata:
  ```json
  {
    "exportedAt": "2024-01-15T10:30:00Z",
    "exportedBy": "user@example.com",
    "appVersion": "1.2.3",
    "dataRangeStart": "2023-06-01",
    "dataRangeEnd": "2024-01-15"
  }
  ```

#### Scenario: Portable data format
- WHEN user exports as JSON
- THEN format is documented and portable
- AND could be imported to another app
- AND schema documentation is included
- AND no proprietary or locked formats used

---

### Requirement: Account and Data Deletion

The system SHALL allow users to permanently delete their account and data.

#### Scenario: Request account deletion
- GIVEN user wants to leave the app
- WHEN user navigates to Settings > Privacy > Delete Account
- THEN clear explanation appears:
  ```
  Delete Your Account

  This will permanently delete:
  • Your profile and all personal information
  • Your household and participant data
  • All benefit tracking history
  • All scan and shopping history
  • All saved stores and preferences
  • All active alerts and notifications

  ⚠️ This cannot be undone.

  Your data will be deleted within 72 hours.
  Some anonymized, aggregated data may be
  retained for system improvement.

  [Export Data First] [Delete My Account]
  ```
- AND user is encouraged to export data first
- AND deletion requires confirmation

#### Scenario: Confirm deletion
- WHEN user taps "Delete My Account"
- THEN confirmation appears:
  ```
  Are you sure?

  Type DELETE to confirm:
  [____________]

  [Cancel] [Permanently Delete]
  ```
- AND typing "DELETE" is required
- AND final confirmation required

#### Scenario: Execute deletion
- GIVEN user confirmed deletion
- WHEN deletion is processed
- THEN all personal data is queued for deletion
- AND user is logged out immediately
- AND confirmation email/SMS is sent
- AND data is deleted within 72 hours
- AND deletion is logged (without PII) for compliance

#### Scenario: What's deleted vs retained
- WHEN account is deleted
- THEN the following is DELETED:
  - User profile and credentials
  - Household and participant data
  - Benefit tracking history
  - Scan history
  - Transaction history
  - Store favorites and preferences
  - Location history
  - Alert subscriptions
  - Device tokens and push settings
- AND the following MAY BE RETAINED (anonymized):
  - Aggregated scan counts (no user link)
  - Crowdsourced inventory reports (anonymized)
  - Error/crash logs (anonymized)
  - Usage analytics (anonymized)

#### Scenario: Grace period for recovery
- GIVEN user deleted account
- AND it's within 7 days
- WHEN user contacts support
- THEN account MAY be recoverable
- AND this is not guaranteed
- AND user is informed of this window during deletion

---

### Requirement: Data Transparency

The system SHALL clearly explain what data is collected and why.

#### Scenario: View what data we store
- GIVEN user wants to understand data collection
- WHEN user navigates to Settings > Privacy > What We Store
- THEN clear breakdown appears:
  ```
  What We Store

  PROFILE DATA
  • Email or phone number (to log in)
  • State (for WIC rules)
  • Household members (for benefits tracking)
  Why: To identify you and show your benefits

  BENEFIT DATA
  • WIC benefits by category
  • Usage history
  Why: To track what you have and used

  SCAN HISTORY
  • Products you've scanned
  • When and where scanned
  Why: To show your scan history and improve results

  LOCATION (Optional)
  • GPS when using store features
  • NOT stored long-term
  Why: To find nearby stores and detect current store

  SHOPPING DATA
  • Cart contents
  • Checkout history
  Why: To update your benefits after shopping

  [View My Data] [Export Data] [Delete Data]
  ```
- AND each category links to detailed view of that data

#### Scenario: View specific data category
- WHEN user taps on a data category
- THEN actual data is shown:
  ```
  Your Scan History

  Showing 127 scans from Jun 2023 - Jan 2024

  Jan 15, 2024 at Walmart (Main St)
  • Similac Pro-Advance 12.4oz - Eligible
  • Great Value Milk 1gal - Eligible
  • Cheerios 18oz - Eligible

  Jan 12, 2024 at Kroger (Oak Ave)
  • Enfamil Gentlease - Not Eligible
  ...

  [Export This Data] [Delete Scan History]
  ```
- AND user can delete specific data categories

#### Scenario: Explain third-party sharing
- WHEN user views data transparency
- THEN third-party sharing is explained:
  ```
  Who We Share With

  ❌ Advertisers - NEVER
  ❌ Data brokers - NEVER
  ❌ Government agencies - NEVER
     (unless legally compelled with warrant)
  ❌ Retailers - NEVER
  ❌ Insurance companies - NEVER
  ❌ WIC agencies - NEVER
     (we don't report to them about you)

  ✓ Analytics (anonymized, aggregated only)
  ✓ Error reporting (anonymized)

  We exist to serve YOU, not extract from you.
  ```

---

### Requirement: Local-Only Mode

The system SHALL allow users to use the app without cloud storage.

#### Scenario: Enable local-only mode
- GIVEN user doesn't want data stored remotely
- WHEN user enables Settings > Privacy > Local-Only Mode
- THEN explanation appears:
  ```
  Local-Only Mode

  Store your data only on this device.

  ✓ All benefits and history stay on phone
  ✓ No account required
  ✓ Maximum privacy

  ⚠️ Limitations:
  • Data is lost if phone is lost/reset
  • No sync across devices
  • Some features unavailable:
    - Formula restock alerts (need server)
    - Crowdsourced inventory updates
    - Cloud backup

  [Enable Local-Only] [Stay Connected]
  ```
- AND user can switch between modes

#### Scenario: Local-only operation
- GIVEN local-only mode is enabled
- WHEN user uses the app
- THEN all data is stored in device SQLite only
- AND no PII is sent to servers
- AND APL/product data is still downloaded (not PII)
- AND features requiring server are disabled or limited:
  - Scanning: Works (uses cached APL)
  - Benefits tracking: Works (stored locally)
  - Formula alerts: Disabled
  - Crowdsourced reports: Disabled (or anonymous-only)
  - Store inventory: Works (read-only from API)

#### Scenario: Switch from local to connected
- GIVEN user is in local-only mode
- WHEN user wants to enable cloud features
- THEN choice is offered:
  ```
  Connect to Cloud?

  You can:
  ○ Create new cloud account
    Keep local data, start syncing

  ○ Connect existing account
    ⚠️ Will replace local data with cloud data

  ○ Stay local-only
    No changes

  [Continue]
  ```
- AND local data can be merged or replaced

---

### Requirement: Privacy Policy

The system SHALL have a privacy policy that protects USERS, not the state or app owner.

#### Scenario: Accessible privacy policy
- WHEN user accesses Privacy Policy
- THEN policy is written in plain language
- AND legal jargon is minimized
- AND policy includes:
  1. What we collect (specific, not vague)
  2. Why we collect it (concrete purposes)
  3. Who we share with (explicit list, not "partners")
  4. How long we keep it (specific timeframes)
  5. User rights (export, delete, correct)
  6. How to exercise rights (actual steps)
  7. How we protect data (encryption, security)
  8. What happens if we're acquired (user protection)
  9. How we handle law enforcement (warrant requirement)
  10. Contact for privacy questions

#### Scenario: Privacy policy commitments
- WHEN privacy policy is written
- THEN it MUST include these commitments:
  ```
  Our Commitments to You:

  1. We will NEVER sell your data
  2. We will NEVER share with advertisers
  3. We will NEVER share with WIC agencies
     (we don't report on you)
  4. We will NEVER use data to deny you services
  5. We will notify you of any breach within 72 hours
  6. We will delete your data when you ask
  7. We will give you your data when you ask
  8. We will not require more data than necessary
  9. If acquired, your rights transfer with your data
  10. We will fight warrantless data requests
  ```

#### Scenario: Policy change notification
- GIVEN privacy policy may need updates
- WHEN policy changes materially
- THEN users are notified in-app
- AND summary of changes is provided
- AND 30-day notice before changes take effect
- AND users can export/delete before new policy

---

### Requirement: Data Security

The system SHALL protect user data with strong security measures.

#### Scenario: Encryption at rest
- GIVEN data is stored
- WHEN data is at rest (on device or server)
- THEN all PII is encrypted
- AND encryption keys are properly managed
- AND SQLite database on device is encrypted

#### Scenario: Encryption in transit
- GIVEN data is transmitted
- WHEN data travels over network
- THEN TLS 1.3 is used
- AND certificate pinning prevents MITM
- AND sensitive fields are encrypted at application layer

#### Scenario: Authentication security
- GIVEN user has account
- WHEN user authenticates
- THEN password is hashed with bcrypt/argon2
- AND optional biometric auth (Face ID, fingerprint)
- AND session tokens expire appropriately
- AND device can be de-authorized remotely

---

### Requirement: Consent Management

The system SHALL obtain and manage consent appropriately.

#### Scenario: Onboarding consent
- GIVEN new user is onboarding
- WHEN creating account
- THEN clear consent is obtained:
  ```
  Privacy & Your Data

  By creating an account, you agree that we may:

  ☑ Store your benefits information
    To track your WIC benefits and usage

  ☑ Store your scan history
    To show what you've scanned and help you shop

  ☐ Use your location (optional)
    To find nearby stores and detect which store you're in

  ☐ Send you notifications (optional)
    For formula alerts and benefit reminders

  [Privacy Policy] [What We Store]

  [Create Account]
  ```
- AND optional items are opt-in, not opt-out
- AND user can proceed without optional consent

#### Scenario: Withdraw consent
- GIVEN user previously gave consent
- WHEN user wants to withdraw
- THEN each consent is individually controllable:
  - Settings > Privacy > Data Permissions
  - Each permission can be toggled off
  - Features affected are explained
  - Data collected under that consent can be deleted

#### Scenario: Age verification
- GIVEN WIC serves families with children
- WHEN user creates account
- THEN age verification is appropriate
- AND parental consent mechanisms if needed
- AND COPPA compliance for any child data

---

## Data Requirements

### Data Categories and Retention

| Data Category | Purpose | Retention | Deletion |
|--------------|---------|-----------|----------|
| Profile (email/phone) | Authentication | Until account deleted | 72 hours |
| Household data | Benefits tracking | Until account deleted | 72 hours |
| Benefit allocations | Track usage | 2 years, then archived | On request |
| Scan history | User reference | 1 year | On request |
| Transaction history | Audit trail | 2 years | On request |
| Location data | Store detection | 24 hours | Automatic |
| Store favorites | Convenience | Until removed | On request |
| Device tokens | Notifications | Until unregistered | Automatic |
| App preferences | Personalization | Until changed | On request |

### Export Data Schema

```typescript
interface UserDataExport {
  metadata: {
    exportedAt: Date;
    exportVersion: string;
    appVersion: string;
    userId: string;  // Included in export
  };

  profile: {
    email?: string;
    phone?: string;
    state: string;
    createdAt: Date;
    lastLogin: Date;
  };

  household: {
    id: string;
    participants: Participant[];
  };

  benefits: {
    current: BenefitPeriod[];
    historical: BenefitPeriod[];
  };

  scans: {
    items: ScanRecord[];
    totalCount: number;
  };

  transactions: {
    items: Transaction[];
    totalCount: number;
  };

  stores: {
    favorites: Store[];
    recentVisits: StoreVisit[];
  };

  alerts: {
    formulaAlerts: FormulaAlert[];
    benefitReminders: ReminderSettings;
  };

  preferences: {
    language: string;
    notifications: NotificationPreferences;
    accessibility: AccessibilitySettings;
    privacy: PrivacySettings;
  };
}
```

---

## API Requirements

```
# Data Export
POST /api/v1/user/data/export
  Body: { format: 'json' | 'csv' | 'pdf' }
  Response: { exportId: string, status: 'processing' }

GET  /api/v1/user/data/export/{exportId}
  Response: { status: 'ready' | 'processing', downloadUrl?: string }

# Account Deletion
POST /api/v1/user/delete
  Body: { confirmation: 'DELETE' }
  Response: { status: 'scheduled', deletionDate: Date }

POST /api/v1/user/delete/cancel  (within grace period)

# Privacy Settings
GET  /api/v1/user/privacy
PUT  /api/v1/user/privacy
  Body: { locationConsent: boolean, notificationConsent: boolean, ... }

# Data Category Management
GET  /api/v1/user/data/{category}  (scans, transactions, etc.)
DELETE /api/v1/user/data/{category}

# Consent Management
GET  /api/v1/user/consent
PUT  /api/v1/user/consent
  Body: { purpose: string, granted: boolean }
```

---

## Offline Behavior

- Data export requires connectivity (must compile data)
- Privacy settings can be viewed offline (cached)
- Privacy settings changes queue for sync
- Local-only mode works completely offline

---

## Accessibility Requirements

- All privacy controls accessible via screen reader
- Clear labeling of consent toggles
- High contrast for privacy indicators
- Plain language throughout (no legal jargon)

---

## Legal Compliance

This specification supports:
- **CCPA** - California Consumer Privacy Act
- **GDPR** - General Data Protection Regulation (if applicable)
- **COPPA** - Children's Online Privacy Protection Act
- **State breach notification laws**

The spec intentionally EXCEEDS minimum legal requirements because users deserve more than the legal minimum.
