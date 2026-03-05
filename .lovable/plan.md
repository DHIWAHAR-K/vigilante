

## Perplexity-Style "Thinking" Animation

### What We're Building

A thinking/processing animation that appears between the user's question and the final answer, showing the backend's real-time activity — agent deliberation steps, search queries, and source discovery — matching the Perplexity deep research UI from the reference image.

### Backend Event Flow (existing)

The backend emits these Socket.IO events in sequence:
1. `council:round_start` → `{ round, total_rounds, follow_up }`
2. `council:agent_start` → `{ agent_id, agent_name, agent_role, agent_model }`
3. `council:agent_token` → `{ agent_id, token }` (streamed)
4. `council:agent_complete` → `{ agent_id, response, response_time_ms }`
5. `council:complete` → `{ responses, synthesis, consensus }`

### UI Design (Perplexity-style)

The thinking section renders as a collapsible timeline with these elements:

```text
┌─────────────────────────────────────────────┐
│  Thinking                        ◇ Enabled  │
│                                             │
│  ● I will analyze using multiple agents...  │
│                                             │
│  ● Consulting Sage (Balanced Analyst)       │
│    ┌─────────────────────────────────────┐   │
│    │ 🌐 Sage - gemma2:2b        1.2s    │   │
│    │ 🌐 Scholar - phi3:latest   0.8s    │   │
│    └─────────────────────────────────────┘   │
│                                             │
│  ● Synthesizing responses...                │
│    ┌─────────────────────────────────────┐   │
│    │ 🌐 Synthesizer             2.1s    │   │
│    └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

Each step animates in with a fade as events arrive. A pulsing dot indicates active processing. Completed steps show a solid dot.

### Implementation Plan

#### 1. Add thinking state types to `src/lib/types.ts`

Add a `ThinkingStep` interface to represent each step in the thinking timeline:
- `id`, `type` (text | searching | reviewing_sources | agent_thinking | agent_done | synthesizing)
- `content` (display text)
- `status` (active | done)
- `agent?` (agent metadata)
- `sources?` (list of sources found)
- `timestamp`

Add a `ThinkingState` to `ChatMessage` — an array of `ThinkingStep[]`.

#### 2. Create `src/components/chat/ThinkingAnimation.tsx`

A new component that renders the Perplexity-style thinking timeline:
- Header row: "Thinking" label on left, "◇ Enabled" on right
- Collapsible via Radix Collapsible (starts expanded, can collapse after completion)
- Each step renders as a timeline item with:
  - Pulsing dot (active) or solid dot (done) 
  - Text description
  - For agent steps: a card showing agent name, model, domain-style label, and response time
- Steps fade in using `animate-fade-in`
- Active step shows a subtle pulse animation

#### 3. Update `ChatThread.tsx`

- Insert `<ThinkingAnimation>` before the answer content when `msg.thinkingSteps` exists
- During streaming, show thinking expanded; after completion, auto-collapse it

#### 4. Update mock data in `src/lib/mock-data.ts`

Add `thinkingSteps` to mock messages to demonstrate the animation without a live backend:
- Steps like "I will analyze using multiple council agents..."
- "Consulting Sage (Balanced Analyst)" with agent cards
- "Consulting Scholar (Academic Expert)" with agent cards  
- "Synthesizing all perspectives..."

#### 5. Add `animate-blink` keyframe to `tailwind.config.ts`

Add a blink keyframe for the cursor and a pulse-dot keyframe for the active thinking indicator.

### Files to Create/Edit

| File | Action |
|------|--------|
| `src/lib/types.ts` | Add `ThinkingStep` interface, add `thinkingSteps?` to `ChatMessage` |
| `src/components/chat/ThinkingAnimation.tsx` | **Create** — full thinking timeline component |
| `src/components/chat/ChatThread.tsx` | Render `ThinkingAnimation` above answer |
| `src/lib/mock-data.ts` | Add thinking steps to mock messages |
| `tailwind.config.ts` | Add `blink` and `pulse-dot` keyframe animations |

