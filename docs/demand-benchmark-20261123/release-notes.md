# Whole-number women percentages and specialty demand comparison

Women percentages display as whole numbers in both specialty dashboards and department profiles. The underlying source numbers retain their precision; unrelated percentage fields are unchanged.

The demand metric shows the selected specialty beside an arithmetic mean of all specialties with a valid source value. Each specialty contributes once; zero is valid and missing/invalid values are excluded. The benchmark is independent of directory filters and department counts. The current data produce 0.8175 across 28 specialties, displayed as 0.82. Both the selected value and the benchmark retain two decimal places in the UI; classification uses full precision.

Display categories use the ratio to that computed mean: similar for 0.8–1.2 inclusive, high above 1.2 and below 1.5, very high at or above 1.5, low below 0.8 and above 0.5, very low at or below 0.5. The UI identifies this as the site's display classification and exposes its method and denominator. This comparison does not replace the source metric's reference value of 1. An unavailable specialty value still permits the national mean to be shown, without a category.

Validation: 41 unit/rendering/regression tests; 12 existing MASTER_Spec import checks; typecheck and production build; independent SQL mean and public query integration for high, similar and low examples; HTTP display and filter-invariance checks. No database migration or data mutation is required. Browser visual inspection was attempted but the computer-use tool timed out; no claim of visual verification is made.
