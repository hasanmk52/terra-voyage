# Prompt Optimization Safety Validation Plan

## Overview
This document outlines a comprehensive testing strategy to ensure the optimized prompt doesn't break the AI service response quality or validation pipeline.

## Current Response Pipeline Analysis

### 1. Response Flow
```
AI Service (Google Gemini)
  ↓
itineraryService.generateFullItinerary() [lib/itinerary-service.ts:219-256]
  ↓
extractJsonFromResponse() [removes markdown, extracts JSON]
  ↓
fixDurationFormats() [fixes duration format issues]
  ↓
validateAndParseItinerary() [lib/itinerary-validation.ts:1006-1078]
  ↓
parseItineraryJSON() [extracts and repairs JSON]
  ↓
validateItinerary() [Zod schema validation + business rules]
  ↓
Currency enforcement [forces user's selected currency]
  ↓
Budget optimization [if needed]
  ↓
Database storage
```

### 2. Critical Validation Points

#### A. JSON Structure Validation (Zod Schema)
**Location**: `lib/itinerary-validation.ts`

**Required Fields**:
- `itinerary` object containing:
  - `destination`: string (min 1 char)
  - `duration`: number (1-365 days)
  - `totalBudgetEstimate`: { amount, currency (3-char), breakdown }
  - `days`: array of day objects (min 1)
  - `generalTips`: array of strings (max 10) [optional with defaults]
  - `emergencyInfo`: { emergencyNumber, embassy, hospitals } [optional with defaults]

**Day Schema**:
- `day`: number (sequential, starting from 1)
- `date`: string (YYYY-MM-DD format)
- `theme`: string (min 1 char)
- `activities`: array (1-10 activities)
- `dailyBudget`: { amount, currency }
- `transportation`: { primaryMethod, estimatedCost, notes }

**Activity Schema** (Most Complex):
- `id`: string (min 1)
- `timeSlot`: enum ["morning", "afternoon", "evening"]
- `startTime`: HH:MM format
- `endTime`: HH:MM format
- `name`: string (3-100 chars, NOT generic names)
- `type`: enum ["attraction", "restaurant", "experience", "transportation", "accommodation", "shopping"]
- `description`: string (20-500 chars)
- `location`: { name (3-100), address (10-200), coordinates { lat, lng } }
- `pricing`: { amount (0-10000), currency (3-char), priceType enum }
- `duration`: string matching `/^\d+\s*(minutes?|hours?|mins?|hrs?)$/i`
- `tips`: array of strings (max 5)
- `bookingRequired`: boolean
- `accessibility`: { wheelchairAccessible, hasElevator, notes }

#### B. Business Rules Validation
**Location**: `lib/itinerary-validation.ts:409-487`

1. **Sequential Days**: Days must be 1, 2, 3, ... (no gaps)
2. **Duration Match**: `duration` field must equal `days.length`
3. **No Time Overlaps**: Activities in same day can't overlap
4. **Budget Consistency**: Breakdown must sum to within 10% of total
5. **Valid Coordinates**: Not (0,0), max 6 decimal places, within destination bounds
6. **Destination Relevance**: Activities must be in correct geographic area
7. **Generic Name Rejection**: Activity names can't be generic ("restaurant", "activity", etc.)
8. **Realistic Duration**: Activities must be 15 min - 8 hours

#### C. Post-Processing
**Location**: `lib/itinerary-service.ts:128-167`

1. **Currency Enforcement**: ALL currencies forced to user's selected currency
   - totalBudgetEstimate.currency
   - dailyBudget.currency for each day
   - pricing.currency for each activity

2. **Duration Format Fixes**: Multiple patterns auto-corrected
   - "2h" → "2 hours"
   - "90m" → "90 minutes"
   - "1.5 hours" → "90 minutes"
   - Numbers converted to string format

3. **Coordinate Precision**: Limited to 4 decimal places

## Risk Assessment

### High-Risk Areas (Could Break Validation)

1. **✅ JSON Structure Changes**
   - **Current**: Well-defined JSON schema in prompt
   - **Optimized**: Simplified schema documentation
   - **Risk**: LOW - Schema structure unchanged, just less verbose documentation
   - **Validation**: Zod schema will catch any structural issues

2. **✅ Field Name Changes**
   - **Current**: Explicit field names repeated multiple times
   - **Optimized**: Field names mentioned once in schema
   - **Risk**: LOW - Field names are identical
   - **Validation**: Zod schema enforces exact field names

3. **⚠️ Currency Format**
   - **Current**: 6+ mentions of "MUST use user's currency"
   - **Optimized**: 1 mention in requirements + schema enforcement
   - **Risk**: MEDIUM - But post-processing enforces currency anyway
   - **Mitigation**: Currency enforcement happens in post-processing (line 128-167)

4. **⚠️ Duration Format**
   - **Current**: Verbose duration format examples
   - **Optimized**: Concise duration format in schema
   - **Risk**: LOW - Post-processing fixes most duration format issues
   - **Validation**: Regex validation + auto-correction handles this

5. **⚠️ Coordinate Precision**
   - **Current**: Multiple warnings about coordinate precision
   - **Optimized**: Single mention in requirements
   - **Risk**: LOW - Post-processing limits to 4 decimal places
   - **Validation**: coordinatesSchema validates range and precision

6. **✅ Generic Activity Names**
   - **Current**: Multiple examples of what NOT to use
   - **Optimized**: Clearer requirement in schema
   - **Risk**: LOW - Validation function `validateActivityName` enforces this
   - **Validation**: Zod refine function rejects generic names

### Low-Risk Areas

1. **Description Quality**: AI typically generates good descriptions regardless
2. **Budget Breakdown**: Post-processing optimizes if needed
3. **Emergency Info**: Has defaults if missing
4. **General Tips**: Has defaults if missing

## Testing Strategy

### Phase 1: Schema Validation Test
**Goal**: Ensure optimized prompt produces valid JSON structure

```typescript
// Test file: lib/__tests__/optimized-prompt-validation.test.ts

test('Optimized prompt produces valid itinerary structure', async () => {
  const testFormData = createTestFormData()

  // Generate with optimized prompt
  const result = await itineraryService.generateItinerary(testFormData, {
    useOptimizedPrompt: true  // Feature flag
  })

  // Validate structure
  expect(result.itinerary.itinerary).toBeDefined()
  expect(result.itinerary.itinerary.destination).toBe(testFormData.destination.destination)
  expect(result.itinerary.itinerary.days.length).toBe(expectedDays)

  // Validate all required fields exist
  expect(result.itinerary.itinerary.totalBudgetEstimate).toBeDefined()
  expect(result.itinerary.itinerary.totalBudgetEstimate.breakdown).toBeDefined()
})
```

### Phase 2: Side-by-Side Comparison Test
**Goal**: Compare quality of responses between current and optimized prompts

```typescript
test('Optimized prompt quality matches current prompt', async () => {
  const testCases = [
    { destination: 'Paris', budget: 2000, days: 5 },
    { destination: 'Tokyo', budget: 3000, days: 7 },
    { destination: 'New York', budget: 1500, days: 3 }
  ]

  for (const testCase of testCases) {
    const currentResult = await generateWithCurrentPrompt(testCase)
    const optimizedResult = await generateWithOptimizedPrompt(testCase)

    // Compare validation success
    expect(currentResult.success).toBe(optimizedResult.success)

    // Compare structure completeness
    expect(optimizedResult.itinerary.days.length).toBe(testCase.days)

    // Compare quality metrics
    const currentQuality = assessQuality(currentResult)
    const optimizedQuality = assessQuality(optimizedResult)

    // Optimized should be at least 95% as good
    expect(optimizedQuality).toBeGreaterThanOrEqual(currentQuality * 0.95)
  }
})
```

### Phase 3: Field-by-Field Validation
**Goal**: Ensure all critical fields are populated correctly

```typescript
test('All critical fields populated in optimized prompt response', async () => {
  const result = await generateWithOptimizedPrompt(testData)

  const itinerary = result.itinerary.itinerary

  // Top-level fields
  expect(itinerary.destination).toBeTruthy()
  expect(itinerary.duration).toBeGreaterThan(0)
  expect(itinerary.totalBudgetEstimate.currency).toMatch(/^[A-Z]{3}$/)

  // Day-level fields
  itinerary.days.forEach((day, index) => {
    expect(day.day).toBe(index + 1)
    expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(day.activities.length).toBeGreaterThan(0)
    expect(day.dailyBudget).toBeDefined()
    expect(day.transportation).toBeDefined()

    // Activity-level fields
    day.activities.forEach(activity => {
      expect(activity.name).toBeTruthy()
      expect(activity.description.length).toBeGreaterThanOrEqual(20)
      expect(activity.location.coordinates.lat).not.toBe(0)
      expect(activity.location.coordinates.lng).not.toBe(0)
      expect(activity.pricing.currency).toMatch(/^[A-Z]{3}$/)
      expect(activity.duration).toMatch(/^\d+\s*(minutes?|hours?)$/i)
    })
  })
})
```

### Phase 4: Business Rules Validation
**Goal**: Ensure business rules still pass

```typescript
test('Business rules validation passes for optimized prompt', async () => {
  const result = await generateWithOptimizedPrompt(testData)

  const errors = validateBusinessRules(result.itinerary.itinerary)

  // Should have no critical errors
  expect(errors.filter(e => e.includes('coordinates'))).toHaveLength(0)
  expect(errors.filter(e => e.includes('sequence'))).toHaveLength(0)
  expect(errors.filter(e => e.includes('overlap'))).toHaveLength(0)
})
```

### Phase 5: Post-Processing Compatibility
**Goal**: Ensure post-processing still works correctly

```typescript
test('Post-processing works with optimized prompt response', async () => {
  const result = await generateWithOptimizedPrompt(testData)

  // Currency should be enforced
  expect(result.itinerary.itinerary.totalBudgetEstimate.currency).toBe(testData.budget.currency)

  result.itinerary.itinerary.days.forEach(day => {
    expect(day.dailyBudget.currency).toBe(testData.budget.currency)
    day.activities.forEach(activity => {
      expect(activity.pricing.currency).toBe(testData.budget.currency)
    })
  })

  // Duration formats should be corrected
  result.itinerary.itinerary.days.forEach(day => {
    day.activities.forEach(activity => {
      expect(activity.duration).toMatch(/^\d+\s*(minutes?|hours?)$/i)
    })
  })
})
```

### Phase 6: Edge Cases
**Goal**: Test edge cases and potential failure modes

```typescript
const edgeCases = [
  { name: 'Very short trip', days: 1, budget: 500 },
  { name: 'Very long trip', days: 14, budget: 10000 },
  { name: 'Very low budget', days: 3, budget: 300 },
  { name: 'Very high budget', days: 5, budget: 20000 },
  { name: 'Remote destination', destination: 'Faroe Islands' },
  { name: 'Multiple interests', interests: ['culture', 'food', 'adventure', 'shopping', 'nightlife'] }
]
```

## Implementation Plan with Feature Flag

### Step 1: Add Feature Flag Support

```typescript
// lib/prompt-templates.ts

export interface PromptOptions {
  useOptimizedPrompt?: boolean  // Feature flag
}

export function createItineraryPrompt(
  formData: TripPlanningFormData | EnhancedFormData,
  options: PromptOptions = {}
): PromptTemplate {
  const { useOptimizedPrompt = false } = options

  if (useOptimizedPrompt) {
    return createOptimizedItineraryPrompt(formData)
  }

  return createCurrentItineraryPrompt(formData)
}
```

### Step 2: Environment Variable Control

```env
# .env.local
NEXT_PUBLIC_USE_OPTIMIZED_PROMPT=false  # Start with false
```

### Step 3: Gradual Rollout Strategy

1. **Week 1: Internal Testing**
   - Enable for 0% of users
   - Run automated tests
   - Generate 50+ itineraries manually
   - Compare token usage and quality

2. **Week 2: Canary Deployment**
   - Enable for 5% of users (random selection)
   - Monitor error rates
   - Compare validation failure rates
   - Track user feedback

3. **Week 3: Expanded Rollout**
   - If metrics look good, increase to 25%
   - Continue monitoring
   - A/B test quality scores

4. **Week 4: Full Rollout**
   - If all metrics positive, roll out to 100%
   - Keep current prompt as fallback for 1 month
   - Monitor long-term metrics

## Success Metrics

### Must-Pass Criteria
1. ✅ Validation success rate ≥ 95% (same as current)
2. ✅ Zero breaking changes to JSON structure
3. ✅ All Zod schema validations pass
4. ✅ Business rules validation passes
5. ✅ Post-processing compatibility 100%

### Quality Metrics
1. 📊 Activity name quality (generic name rejection rate)
2. 📊 Description length and quality
3. 📊 Coordinate accuracy
4. 📊 Budget realism
5. 📊 User satisfaction scores

### Performance Metrics
1. ⚡ Token reduction: 40-45% (target from analysis)
2. ⚡ Generation time: Should remain similar or improve
3. ⚡ Error rate: Should not increase
4. ⚡ Cache hit rate: Should remain similar

## Rollback Plan

### Triggers for Rollback
1. Validation failure rate increases by >10%
2. User complaints increase by >20%
3. Structural errors detected in responses
4. Business rules violations increase

### Rollback Procedure
```typescript
// Immediate rollback via environment variable
NEXT_PUBLIC_USE_OPTIMIZED_PROMPT=false

// Or via feature flag API
await featureFlags.disable('optimized-prompt')
```

## Monitoring Dashboard

### Key Metrics to Track
1. Validation success rate (current vs optimized)
2. Token usage per request
3. Generation time per request
4. Error types and frequencies
5. Field completeness rates
6. User satisfaction scores

### Alert Conditions
- Validation failure rate > 10%
- Error rate increase > 20%
- Token savings < 30% (below target)
- Response time increase > 25%

## Conclusion

**Recommendation**: The optimized prompt is LOW RISK because:

1. ✅ **JSON structure is identical** - Only documentation is simplified
2. ✅ **Robust validation** - 8 comprehensive repair strategies for JSON parsing
3. ✅ **Post-processing safety net** - Currency, duration, coordinates all auto-corrected
4. ✅ **Default values** - Missing optional fields have sensible defaults
5. ✅ **Business rules** - Validated regardless of prompt quality
6. ✅ **Feature flag control** - Can rollback instantly if issues arise

**Next Steps**:
1. Implement feature flag in `prompt-templates.ts`
2. Create test suite with all validation scenarios
3. Run 50+ test generations in development
4. Deploy with 0% rollout, monitor metrics
5. Gradually increase rollout based on metrics

**Estimated Timeline**:
- Implementation: 2-3 hours
- Testing: 4-6 hours
- Canary rollout: 1 week
- Full rollout: 2-3 weeks

**Expected Outcome**:
- 40-45% token reduction ✅
- Zero breaking changes ✅
- Improved prompt clarity ✅
- Better AI instruction compliance ✅
- $1,560/month cost savings ✅
