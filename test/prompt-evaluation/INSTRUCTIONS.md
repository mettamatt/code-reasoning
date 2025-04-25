# Prompt Evaluator Instructions

## What is the Prompt Evaluator?

The Prompt Evaluator is a tool that helps you measure how well AI models understand and follow the instructions in the Sequential Thinking Tool prompt. It allows you to:

- Test different aspects of AI reasoning (branching, revision, depth, etc.)
- Compare different AI models (Claude, GPT-4, etc.)
- Identify strengths and weaknesses in the prompt
- Track improvements as you refine the prompt

**No coding knowledge required!** This guide will walk you through everything.

---

## Getting Started

### Requirements

- A computer with the code-reasoning repository installed
- Terminal/Command Prompt access
- Access to AI models you want to test (e.g., via web interfaces)

### Launching the Tool

1. Open your Terminal/Command Prompt
2. Navigate to the code-reasoning directory:
   ```
   cd ~/Sites/code-reasoning
   ```
3. Run the evaluator:
   ```
   npm run evaluate-prompt
   ```

4. You'll see the main menu:

```
===== PROMPT EFFECTIVENESS EVALUATOR =====
1. Display test scenario
2. Import thought chain from file
3. Create thought chain manually
4. Evaluate thought chain
5. Generate report
6. Exit

Enter choice (1-6): 
```

---

## Step-by-Step Guide

### 1. Exploring Test Scenarios

Start by exploring what aspects of the prompt you can test.

1. From the main menu, select option `1` (Display test scenario)
2. You'll see a list of available scenarios:

```
Select a test scenario:
1. Algorithm Selection Problem (branching, medium)
2. Bug Identification Problem (revision, medium)
3. Multi-Stage Implementation (parameters, medium)
4. System Design Analysis (depth, hard)
5. Code Debugging Task (completion, easy)
6. Compiler Optimization Analysis (multiple, hard)

Enter selection number: 
```

3. Choose a scenario by entering its number (e.g., `1`)
4. You'll see detailed information about the scenario:

```
===========================================================
SCENARIO: Algorithm Selection Problem (branch-algorithm-selection)
===========================================================
Description: Tests whether the model understands when to use branching to explore multiple approaches.
Target Skill: branching
Difficulty: medium
Expected Thoughts: 5-12

----- PROBLEM TO PRESENT TO THE MODEL -----
You need to implement a function to find the k most frequent elements in an array of integers. 
There are multiple valid approaches to this problem with different time and space complexity tradeoffs.

Please analyze the different possible approaches, considering factors like:
- Time complexity
- Space complexity
- Implementation difficulty
- Edge cases

Select the best approach for a general-purpose solution and explain your reasoning.

----- EVALUATION CRITERIA -----
1. Branch creation (5 points)
   Does the model create branches for different algorithmic approaches?
2. Branch depth (5 points)
   Are branches developed sufficiently to evaluate their merits?
3. Branch comparison (5 points)
   Does the model effectively compare the different approaches?
4. Branch selection (5 points)
   Does the model select an approach with clear reasoning?
===========================================================
```

### 2. Collecting Model Responses

There are two ways to collect and input a model's responses:

#### Option A: Manual Entry

1. From the main menu, select option `3` (Create thought chain manually)
2. Enter each thought from the model one by one:

```
Enter thought records (leave thought empty to finish):

----- Thought #1 -----
Thought content: First, let me understand the k most frequent elements problem. Given an array of integers and a value k, we need to find the k elements that appear most frequently in the array. This is a counting and ranking problem.

Total thoughts (current: 1): 8
Next thought needed? (y/n): y
Is this a revision? (y/n): n
Is this part of a branch? (y/n): n

----- Thought #2 -----
Thought content: Let's consider approach 1: Using a HashMap and Sorting.
1. Count occurrences of each element in a HashMap
2. Convert to array of [number, frequency] pairs
3. Sort by frequency in descending order
4. Return first k elements

Time complexity: O(n + m log m) where n is array length and m is unique elements
Space complexity: O(m) for storing counts

Total thoughts (current: 2): 8
Next thought needed? (y/n): y
Is this a revision? (y/n): n
Is this part of a branch? (y/n): n

----- Thought #3 -----
Thought content: Alternative approach: Using a Heap (Priority Queue).
1. Count occurrences in HashMap
2. Maintain a min-heap of size k
3. Insert elements with their counts
4. If heap size exceeds k, remove the element with lowest count
5. The heap will contain the k most frequent elements

Time complexity: O(n + m log k)
Space complexity: O(m + k)

Total thoughts (current: 3): 8
Next thought needed? (y/n): y
Is this a revision? (y/n): n
Is this part of a branch? (y/n): y
Branch from which thought number? 1
Branch ID: B1
```

Continue entering all thoughts until complete.

#### Option B: Import from a JSON File

1. First, create a JSON file with the model's thoughts. Here's an example format:

```json
[
  {
    "thought": "First, let me understand the k most frequent elements problem. Given an array of integers and a value k, we need to find the k elements that appear most frequently in the array. This is a counting and ranking problem.",
    "thought_number": 1,
    "total_thoughts": 8,
    "next_thought_needed": true
  },
  {
    "thought": "Let's consider approach 1: Using a HashMap and Sorting.\n1. Count occurrences of each element in a HashMap\n2. Convert to array of [number, frequency] pairs\n3. Sort by frequency in descending order\n4. Return first k elements\n\nTime complexity: O(n + m log m) where n is array length and m is unique elements\nSpace complexity: O(m) for storing counts",
    "thought_number": 2,
    "total_thoughts": 8,
    "next_thought_needed": true
  },
  {
    "thought": "Alternative approach: Using a Heap (Priority Queue).\n1. Count occurrences in HashMap\n2. Maintain a min-heap of size k\n3. Insert elements with their counts\n4. If heap size exceeds k, remove the element with lowest count\n5. The heap will contain the k most frequent elements\n\nTime complexity: O(n + m log k)\nSpace complexity: O(m + k)",
    "thought_number": 3,
    "total_thoughts": 8,
    "next_thought_needed": true,
    "branch_from_thought": 1,
    "branch_id": "B1"
  }
]
```

Save this file (e.g., as `claude_algorithm_thoughts.json`).

2. From the main menu, select option `2` (Import thought chain from file)
3. Enter the path to your file:

```
Enter path to thought chain JSON file: /path/to/claude_algorithm_thoughts.json
Imported 8 thoughts.
```

### 3. Evaluating Responses

Once you've entered a model's thoughts:

1. From the main menu, select option `4` (Evaluate thought chain)
2. Select which scenario to evaluate against:

```
Select a scenario to evaluate against:
1. Algorithm Selection Problem (branching, medium)
2. Bug Identification Problem (revision, medium)
...

Enter selection number: 1
```

3. Enter evaluation details:

```
Evaluator name: Jane Smith
Model ID (e.g., "GPT-4", "Claude-3", etc.): Claude-3
Prompt variation (e.g., "baseline", "enhanced", etc.): baseline

----- EVALUATION -----

Thought Chain Analysis:
- Total thoughts: 8
- Uses revisions: No
- Number of branches: 2
```

4. Score each criterion:

```
Branch creation (max 5 points)
Description: Does the model create branches for different algorithmic approaches?

Score (0-5): 4
Notes on this criterion: Created branches for HashMap+Sort and Heap approaches, but missed the Bucket Sort approach which would be relevant here.

Branch depth (max 5 points)
Description: Are branches developed sufficiently to evaluate their merits?

Score (0-5): 5
Notes on this criterion: Each approach was thoroughly explored with implementation details, time/space complexity, and trade-offs.
```

5. Add overall comments:

```
Overall evaluation:
Comments: The model demonstrated good understanding of branching in its reasoning. It created separate branches for different algorithmic approaches and explored each in sufficient detail to make a well-reasoned comparison. It correctly identified the heap-based solution as more efficient for large datasets with small k values.
```

6. Your evaluation will be saved automatically:

```
Evaluation saved to /Users/mettamatt/Sites/code-reasoning/prompt-evaluations/results/branch-algorithm-selection-Claude-3-baseline-1714142553279.json
Thought chain saved to /Users/mettamatt/Sites/code-reasoning/prompt-evaluations/thought-chains/branch-algorithm-selection-Claude-3-thoughtchain-1714142553279.json
```

### 4. Generating Reports

After evaluating multiple models or prompt variations:

1. From the main menu, select option `5` (Generate report)
2. A comprehensive report will be generated:

```
Report generated: /Users/mettamatt/Sites/code-reasoning/prompt-evaluations/prompt-effectiveness-report-1714142687543.md
```

3. This report contains:
   - Overall statistics and comparisons
   - Detailed breakdowns by skill
   - Averages scores for each model and prompt variation

Example report section:
```markdown
## Model Comparisons

| Model | Prompt Variation | Avg Score | Scenarios Evaluated |
|-------|-----------------|-----------|---------------------|
| Claude-3 | baseline | 82% | 3 |
| GPT-4 | baseline | 78% | 3 |
| Claude-3 | enhanced | 89% | 3 |
| GPT-4 | enhanced | 85% | 3 |
```

---

## Practical Workflows

### Example 1: Evaluating a Single Model

1. **Select a test scenario**
   - Run the evaluator (`npm run evaluate-prompt`)
   - Choose option `1` (Display test scenario)
   - Select a scenario (e.g., "Algorithm Selection Problem")
   - Review the problem and criteria

2. **Present the problem to the model**
   - Copy the problem statement from the displayed scenario
   - Go to your AI model's interface (e.g., Claude or GPT-4)
   - Paste the problem and ask the model to solve it using sequential thinking
   - Include specific instructions: "Please solve this using sequential thinking with explicit thought steps. Use branching when appropriate to explore alternative approaches."

3. **Capture the model's response**
   - Either save the response as a JSON file (recommended for complex responses)
   - Or plan to enter it manually in the tool

4. **Evaluate the response**
   - Return to the evaluator
   - Choose option `2` or `3` to import or manually enter the response
   - Choose option `4` to evaluate against the scenario
   - Score each criterion and add notes
   - Add overall comments

5. **Review the saved evaluation**
   - Find the saved files in prompt-evaluations/results and thought-chains folders

### Example 2: Comparing Multiple Models

1. **Select test scenarios**
   - Choose 2-3 scenarios that test different aspects of reasoning

2. **For each model (repeat)**:
   - Present each scenario to the model
   - Capture responses
   - Evaluate against criteria
   - Use consistent naming: "Claude-3-baseline", "GPT-4-baseline", etc.

3. **Generate a comparison report**
   - Choose option `5` (Generate report)
   - Review the comprehensive comparison

### Example 3: Improving the Prompt

1. **Baseline evaluation**
   - Test the current prompt with various models
   - Generate a report
   - Identify weaknesses (e.g., poor branching, insufficient detail)

2. **Modify the prompt**
   - Enhance instructions in weak areas

3. **Re-evaluate with the new prompt**
   - Test with the same models but label as "enhanced" variation
   - Generate a new report
   - Compare baseline vs. enhanced performance

---

## Tips for Effective Evaluation

1. **Be consistent** in your scoring across models
   - Use the same standards for all evaluations
   - Take notes about your scoring rationale

2. **Organize your files**
   - Use consistent naming: "ModelName-PromptVariation"
   - Keep track of which tests you've run

3. **Use the full scale** (0-5)
   - 0: Completely missing/incorrect
   - 1: Major problems, minimal understanding
   - 2: Significant issues, partial understanding
   - 3: Good but with notable flaws
   - 4: Very good with minor issues
   - 5: Excellent, complete understanding

4. **Test multiple aspects**
   - Don't just focus on one feature
   - Use a variety of scenarios to test different skills

5. **Keep dated backups**
   - Save reports with dates to track improvement over time

---

## Troubleshooting

### Issue: "No thought chain loaded" error when trying to evaluate

**Solution**: You must first import or create a thought chain using options 2 or 3 before you can evaluate.

### Issue: JSON file import fails

**Solution**: Check that your JSON is properly formatted. Common issues:
- Missing commas
- Unmatched quotes
- Incorrect property names (they must exactly match: "thought", "thought_number", etc.)

### Issue: Cannot find the evaluator

**Solution**: Make sure you're in the right directory:
```
cd ~/Sites/code-reasoning
```

### Issue: Report is empty or incomplete

**Solution**: You need to have conducted multiple evaluations before generating a report. Each evaluation should use the same scenario across different models or prompt variations for the best comparison.

---

## Example Files

### Example Thought Chain JSON

```json
[
  {
    "thought": "First step: Understanding the problem statement.",
    "thought_number": 1,
    "total_thoughts": 7,
    "next_thought_needed": true
  },
  {
    "thought": "Let's consider the first approach using a HashMap and sorting.",
    "thought_number": 2,
    "total_thoughts": 7,
    "next_thought_needed": true
  },
  {
    "thought": "Alternative approach: Using a heap data structure.",
    "thought_number": 3,
    "total_thoughts": 7,
    "branch_from_thought": 1,
    "branch_id": "B1",
    "next_thought_needed": true
  },
  {
    "thought": "Continuing with HashMap approach: Implementation details.",
    "thought_number": 3,
    "total_thoughts": 7,
    "next_thought_needed": true
  },
  {
    "thought": "Actually, I need to revise my understanding. The problem requires us to return the elements themselves, not their counts.",
    "thought_number": 4,
    "total_thoughts": 7,
    "is_revision": true,
    "revises_thought": 1,
    "next_thought_needed": true
  },
  {
    "thought": "Comparing the approaches: HashMap+Sort vs Heap.",
    "thought_number": 5,
    "total_thoughts": 7,
    "next_thought_needed": true
  },
  {
    "thought": "Final recommendation based on the analysis.",
    "thought_number": 6,
    "total_thoughts": 7,
    "next_thought_needed": false
  }
]
```

### Example Complete Workflow

1. Launch the evaluator: `npm run evaluate-prompt`
2. Explore the "Revision Understanding Test" (option 1, then selection 2)
3. Present the debugging problem to Claude-3
4. Save Claude's response as `claude_bug_thoughts.json`
5. Import the thoughts (option 2, enter file path)
6. Evaluate against the scenario (option 4, selection 2)
7. Score each criterion based on how well Claude used revisions
8. Repeat steps 3-7 with GPT-4
9. Generate a comparison report (option 5)
10. Review the report to see which model better utilized the revision feature
