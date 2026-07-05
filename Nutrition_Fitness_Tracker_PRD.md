# Nutrition & Fitness Tracker Module PRD (Markdown)

> Version: 1.0\
> Target: Integrate into existing Firebase-based Expense Tracker

# 1. Overview

Build a production-ready Nutrition & Fitness Tracker that integrates
into the existing Expense Tracker application.

Goals:

-   Track nutrition automatically.
-   Track body weight and BMI.
-   Support muscle gain, fat loss, lean bulk, maintenance.
-   Store complete history.
-   Provide AI nutrition analysis.
-   Generate dashboards and reports.

------------------------------------------------------------------------

# 2. Tech Stack

-   Existing React/Next.js application
-   Firebase Authentication
-   Cloud Firestore
-   Firebase Storage
-   Firebase Cloud Functions (optional)
-   TypeScript
-   Tailwind CSS
-   Responsive UI

------------------------------------------------------------------------

# 3. Core Features

-   User Profile
-   Goals
-   Dynamic Daily Meal Planner
-   Meal Logger
-   Nutrition Calculator
-   Dashboard
-   Progress Tracking
-   AI Assistant
-   Reports
-   Notifications

------------------------------------------------------------------------

# 4. User Profile

Store:

-   Name
-   Age
-   Gender
-   Height
-   Weight
-   Target Weight
-   Goal
-   Activity Level
-   Diet Preference
-   Allergies

Automatically calculate:

-   BMI
-   BMI Category
-   Target BMI
-   Maintenance Calories
-   Bulking Calories
-   Cutting Calories
-   Daily Protein Goal
-   Daily Carb Goal
-   Daily Fat Goal
-   Water Goal

------------------------------------------------------------------------

# 5. Dynamic Daily Meal Frequency (Mandatory)

Meal count is **NOT** a permanent profile setting.

Every day is independent.

Examples:

Monday: - Breakfast - Lunch - Dinner

Tuesday: - Breakfast - Snack - Lunch - Snack - Dinner

Wednesday: - Lunch - Dinner

On opening a new day ask:

**How many meals are you planning today?**

Choices:

1--6 meals or Custom.

Generate meal cards dynamically.

Allow:

-   Rename meal
-   Delete meal
-   Add meal
-   Drag & reorder
-   Custom names (Pre Workout, Cheat Meal, Protein Shake, etc.)

Changing today's plan must never affect previous days.

------------------------------------------------------------------------

# 6. Meal Entry

Each meal card contains:

-   Meal Name
-   Time
-   Food Description
-   Notes
-   Optional Photo
-   Save

Example:

Breakfast

    2 eggs
    200 ml milk
    1 banana

------------------------------------------------------------------------

# 7. Nutrition Engine

Automatically determine:

-   Calories
-   Protein
-   Carbs
-   Fat
-   Fiber
-   Sugar
-   Sodium
-   Potassium
-   Calcium
-   Iron
-   Vitamin A
-   Vitamin C
-   Vitamin D
-   Magnesium
-   Zinc
-   Cholesterol

Support:

-   Indian foods
-   Homemade foods
-   Branded foods
-   Restaurant foods

Unknown foods should request clarification instead of guessing.

------------------------------------------------------------------------

# 8. AI Nutrition Assistant

Example:

User:

    2 eggs
    200 ml milk
    100 g paneer

AI returns:

-   Meal nutrients
-   Daily totals
-   Remaining protein
-   Remaining calories
-   Suggestions

------------------------------------------------------------------------

# 9. Dashboard

Cards:

-   Calories
-   Protein
-   Carbs
-   Fat
-   BMI
-   Weight
-   Water
-   Goal %

Charts:

-   Weight
-   Calories
-   Protein
-   Weekly
-   Monthly

------------------------------------------------------------------------

# 10. History

Daily

Weekly

Monthly

Yearly

Filters

Export

------------------------------------------------------------------------

# 11. Weight Tracker

Store:

Date

Weight

Notes

Charts:

-   Gain
-   Loss
-   Trend

------------------------------------------------------------------------

# 12. Workout

Track:

-   Workout Type
-   Duration
-   Calories
-   Notes

------------------------------------------------------------------------

# 13. Water Tracker

Quick Add

250

500

750

1000 ml

Goal Progress

------------------------------------------------------------------------

# 14. Reports

Generate

-   Daily
-   Weekly
-   Monthly
-   PDF
-   CSV

------------------------------------------------------------------------

# 15. Firebase Collections

    users/{uid}

    profile

    goals

    daily_logs/{yyyy-mm-dd}

        mealPlan
        meals
        nutritionSummary
        water
        workout

    weight_history

    body_measurements

    reports

    settings

------------------------------------------------------------------------

# 16. Firestore Example

``` text
daily_logs

2026-07-05

mealCount:5

meals

Breakfast

Lunch

Snack

Dinner

Late Night
```

------------------------------------------------------------------------

# 17. UI Screens

-   Dashboard
-   Add Meal
-   History
-   Analytics
-   Weight
-   Workout
-   Water
-   Reports
-   Settings

------------------------------------------------------------------------

# 18. Nice to Have

-   Barcode Scanner
-   OCR
-   Voice Input
-   Favorites
-   Copy Yesterday Meals
-   Meal Templates
-   AI Weekly Review
-   Grocery Planner
-   Notifications

------------------------------------------------------------------------

# 19. Security

-   Firebase Auth
-   Firestore Rules
-   User isolation
-   Validation
-   Offline Sync

------------------------------------------------------------------------

# 20. Cursor / Antigravity Instructions

Implement using clean architecture.

Requirements:

-   Reusable components
-   Feature modules
-   Responsive UI
-   TypeScript
-   Loading states
-   Error handling
-   Offline support
-   Firestore indexing
-   Optimistic updates

Deliver:

1.  Complete Firebase schema
2.  Firestore rules
3.  Services
4.  Hooks
5.  State management
6.  Dashboard
7.  AI integration abstraction
8.  Charts
9.  Reports
10. Production-ready code

The module should integrate seamlessly with the existing Expense Tracker
and feel like a native feature rather than a separate application.
