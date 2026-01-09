# Tips & Community Specification

## Purpose

Provide users with practical tips for maximizing their WIC benefits and enable community knowledge sharing among WIC participants.

## Requirements

### Requirement: Official Tips Content

The system SHALL provide curated tips from official sources.

#### Scenario: Browse tips by category
- WHEN user opens Tips section
- THEN tips are organized by category:
  - Getting Started with WIC
  - Maximizing Your Benefits
  - Shopping Strategies
  - Understanding Eligibility
  - Meal Planning on WIC
  - Infant & Baby Tips
- AND tips are marked as "Official" or "Community"

#### Scenario: View tip detail
- WHEN user taps on a tip
- THEN full tip content is displayed
- AND source attribution is shown
- AND related tips are suggested

#### Scenario: Tip of the day
- WHEN user opens the app
- THEN a relevant tip may be displayed
- AND user can dismiss or save for later
- AND tips rotate based on user's situation

### Requirement: Benefit Maximization Tips

The system SHALL provide specific strategies for maximizing benefits.

#### Scenario: End-of-month reminders
- GIVEN benefits expire at month end
- WHEN approaching expiration
- THEN tips suggest high-value uses for remaining benefits
- AND quick shopping list ideas are provided

#### Scenario: Category-specific tips
- GIVEN user has remaining dairy benefits
- WHEN viewing dairy tips
- THEN suggestions include:
  - Getting full value from size allowances
  - Combining with CVV for recipes
  - Freezing milk before expiration
  - Cheese varieties and uses

#### Scenario: CVV (Cash Value Voucher) tips
- WHEN viewing produce tips
- THEN guidance includes:
  - Seasonal produce for best value
  - Farmers market participation
  - Stretching CVV across the month
  - Storing produce to reduce waste

### Requirement: Community Tips

The system SHALL allow users to share tips with each other.

#### Scenario: Submit a tip
- GIVEN user wants to share knowledge
- WHEN user taps "Share a Tip"
- THEN tip submission form appears
- AND user can write tip content
- AND user selects relevant category
- AND tip is submitted for moderation

#### Scenario: Browse community tips
- WHEN viewing tips section
- THEN community tips are shown alongside official tips
- AND community tips show:
  - Author (anonymous or username)
  - Upvote count
  - Date posted
  - Verified/unverified status

#### Scenario: Rate and respond to tips
- GIVEN user finds a tip helpful
- WHEN user taps upvote
- THEN upvote is recorded
- AND tip ranking improves
- AND user can add a comment

#### Scenario: Report inappropriate content
- GIVEN a tip contains inappropriate content
- WHEN user taps report
- THEN report is submitted
- AND content is flagged for review
- AND user can block author

### Requirement: Store-Specific Tips

The system SHALL support location-based tips.

#### Scenario: Tips for current store
- GIVEN user is at a detected store
- WHEN viewing tips
- THEN store-specific tips are highlighted
- AND may include:
  - Best times to shop
  - Where WIC items are located
  - Helpful staff areas
  - Local deals and markdowns

#### Scenario: Store reviews
- WHEN viewing a store
- THEN community reviews are shown
- AND ratings for WIC shopping experience
- AND specific feedback (stock, staff, ease)

### Requirement: Personalized Tips

The system SHALL provide tips relevant to user's situation.

#### Scenario: Participant-type tips
- GIVEN user has infant participant
- WHEN viewing tips
- THEN infant-specific tips are prioritized:
  - Formula tips and alternatives
  - Transitioning to baby food
  - Infant cereal uses

#### Scenario: New user onboarding tips
- GIVEN user recently signed up
- WHEN using the app
- THEN beginner tips are shown
- AND guided walkthrough available
- AND common mistakes highlighted

#### Scenario: Benefits-aware tips
- GIVEN user's benefits are loaded
- WHEN remaining benefits are low in category
- THEN relevant tips are suggested
- AND creative uses for remaining amounts shown

### Requirement: Content Moderation

The system MUST moderate community content.

#### Scenario: Pre-publication review
- GIVEN a user submits a tip
- WHEN submission is received
- THEN automated content filter runs
- AND flagged content goes to human review
- AND appropriate content publishes after delay

#### Scenario: Community moderation
- GIVEN multiple users report content
- WHEN threshold is reached
- THEN content is hidden pending review
- AND moderator is notified

#### Scenario: Content guidelines
- WHEN user submits content
- THEN community guidelines are shown
- AND prohibited content types are listed:
  - Selling/trading benefits (illegal)
  - Personal attacks
  - Misinformation
  - Spam/advertising
  - Non-WIC content

### Requirement: Recipes and Meal Planning

The system SHOULD provide meal planning assistance.

#### Scenario: WIC-friendly recipes
- WHEN viewing recipes section
- THEN recipes using WIC foods are displayed
- AND ingredients map to benefit categories
- AND preparation difficulty shown

#### Scenario: Recipe filtering
- WHEN filtering recipes
- THEN user can filter by:
  - Available benefits
  - Dietary restrictions
  - Prep time
  - Skill level

#### Scenario: Weekly meal planner
- GIVEN user wants to plan meals
- WHEN using meal planner
- THEN suggestions use remaining benefits
- AND shopping list is generated
- AND benefit usage is projected

## Data Requirements

### Tip Content

- Tip ID
- Title
- Body content
- Category
- Source (official/community)
- Author ID (for community)
- Created date
- Upvote count
- View count
- Status (published, pending, removed)
- Related tips

### Community User Data

- User ID (anonymized)
- Display name (optional)
- Tips submitted
- Upvotes received
- Trust score
- Account status

### Recipe Data

- Recipe ID
- Title
- Ingredients (with WIC category mapping)
- Instructions
- Prep time
- Difficulty
- Dietary tags
- Image
- Rating

## Moderation Requirements

- Response time for reports: Prompt response
- Automated filter accuracy: > 95%
- Human review capacity: 100+ tips/day
- Appeals process: Timely response

