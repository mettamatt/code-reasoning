# Enhanced Prompt Evaluation System

This document describes the enhanced prompt evaluation system that prioritizes parameter usage and correct adherence to the core prompt over solution quality.

## Key Enhancements

### 1. Weighted Scoring System

The evaluation now uses a weighted scoring formula:

- 70% - Parameter usage score (from objective metrics)
- 30% - Content quality score (from API evaluation)

This ensures that proper parameter usage is prioritized over just getting the right answer, which better tests the effectiveness of the core prompt.

### 2. Automatic Failure Conditions

Tests now have automatic failure conditions for missing critical parameters:

- Revision tests automatically fail if no `is_revision` parameter is used
- Branching tests automatically fail if no `branch_id` parameter is used
- Multiple skills tests automatically fail if neither parameter is used

### 3. Disabled Automatic Parameter Fixing

The system now offers an option to disable automatic parameter fixing (post-processing) which helps measure the raw parameter usage without any automatic corrections.

### 4. Enhanced Evaluation Guidance

Each test type now includes specific evaluation instructions for Claude to emphasize parameter usage over solution quality, with clear scoring guidelines.

## Using the Enhanced Evaluation System

When running `npm run eval:api`, you'll be prompted with some new options:

1. **Include scenario-specific guidance?**

   - Select "No" (default) to test with core prompt only, which emulates real user experience
   - Select "Yes" to include scenario-specific guidance

2. **Disable automatic parameter fixing?**
   - Select "Yes" (default) to get the most accurate picture of parameter usage
   - Select "No" to allow automatic fixing of some parameter issues

## Understanding the Results

The evaluation output now shows:

- Parameter usage score (0-100) from objective metrics
- Content quality score (0-100%) from API evaluation
- Final weighted score (30% content, 70% parameters)

Example output:

```
Automated evaluation complete.
Content quality score: 95%
Parameter usage score: 65%
Final weighted score (30% content, 70% parameters): 73%
```

Tests will automatically fail (score 0%) if they miss critical parameters for their test type, with a clear failure message.

## Best Practices for Testing Core Prompt Effectiveness

1. Always run with "Include scenario-specific guidance" set to "No"
2. Always run with "Disable automatic parameter fixing" set to "Yes"
3. Compare results across multiple runs to ensure consistency
4. Look for specific parameter usage issues in the validation errors
5. Focus on the parameter usage score as the primary indicator of core prompt effectiveness

## Interpreting Lower Scores

Lower scores in this system don't necessarily mean worse performance - they mean a more accurate measurement of how well the core prompt guides parameter usage. If scores are lower than expected:

1. Review the validation errors for specific parameter issues
2. Check which test types are failing automatic failure conditions
3. Consider modifications to the core prompt to better guide proper parameter usage

The goal is to improve the core prompt until it can effectively guide the model without scenario-specific guidance.
