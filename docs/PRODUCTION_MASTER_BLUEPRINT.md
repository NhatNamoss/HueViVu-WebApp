# HueViVu — Production Master Blueprint
Version: 1.0 — 08/10/2026

## 0. Product north star
HueViVu is not a directory of tourist information. It is an AI travel companion for Huế: “Tôi đang ở Huế. Hãy giúp tôi.”
The product must reduce the real work a traveler has to do before and during a trip: deciding where to go; building a feasible itinerary; knowing what is open and suitable now; getting around; understanding the place; adapting when weather, fatigue, time or closures change; finding suitable food/services; recovering from common travel problems; preserving and sharing the trip.

## 1. Competitive boundary
Huế's official ecosystem already includes AI decision support, automatic narration, digital maps, VR/AR, Hue Passport and a tourism hub. HueViVu must therefore not compete merely by having AI + map + itinerary + 3D.
The differentiator is contextual orchestration: location + time + weather + itinerary + preferences + budget + opening status + travel state -> one useful next action.

## 2. Status scale
- L0 — Not present
- L1 — Prototype
- L2 — Functional local product
- L3 — Production-ready
- L4 — Differentiator

## 3. Current product inventory
| System | Current | Target | Main gap |
|---|---:|---:|---|
| Authentication / guest identity | L2 | L3 | Recovery, rate limits, public deployment verification |
| User profile / preferences | L1-L2 | L3 | Explicit preferences consistently feeding discovery/planning |
| Place discovery / search | L2 | L3 | Expand and verify corpus; contextual ranking |
| Place detail | L2 | L3 | Verified hours/prices/sources, accessibility, transport |
| Digital map | L2 | L3 | Real-world routing quality and mobile verification |
| AI itinerary generation | L2 | L4 | Verified live data + stronger contextual planning |
| Itinerary validation / optimization | L2-L3 | L4 | More real constraints and explainable consequences |
| Itinerary adaptation | L2-L3 | L4 | Weather/time/fatigue/closure triggers |
| AI trip chat | L2 | L4 | Grounding, context, actionable proposals |
| Weather | L2 | L3 | Fresh source, forecast and planner integration |
| Events | L1-L2 | L3 | Verified date/time-aware corpus |
| Food / café | L2 | L3 | Current corpus too small for broad promises |
| Live Guide / vision | L1-L2 | L4 | Real recognition model + grounded knowledge |
| TTS / narration | L2 | L3 | Production voice strategy and coverage |
| 3D Ngọ Môn | L2 | L4 | Interior/story linkage, optimization, device FPS |
| RAG knowledge | L0-L1 | L4 | Corpus, provenance, retrieval evaluation |
| YOLO recognition | L0-L1 | L4 | Dataset, benchmark, inference service |
| Community | L2 | L2-L3 | Moderation and abuse controls |
| Journal | L2 | L2-L3 | Retention polish; AI recap later |
| Tours / combo | L2 | L3 | Verified business data; partner strategy |
| Emergency assistance | L0 | L3 | Curated trusted services + guided flows |
| Booking / payment | L0 | L3+ | Partner/API strategy first |
| Notifications | L0-L1 | L3 | Trip/weather/schedule alerts |
| Offline / low connectivity | L0-L1 | L3 | Essential trip cache |
| Admin data collection | L2-L3 | L3 | Freshness and verification gates |
| Data quality / audit | L2-L3 | L3 | Provenance/freshness as first-class data |
| AI training admin | L2 | L3 | Separate training examples from authoritative knowledge |
| Background jobs | L1 | L3 | Enable Redis/BullMQ when ingestion needs it |
| FastAPI AI boundary | L1 | L3 | Implement real RAG/vision incrementally |
| Monitoring / logging / health | L2-L3 | L3 | External monitoring and alerting |
| Deployment / security | L2 | L3 | HTTPS, persistence, backup/restore, load test |
| Internationalization | L0-L1 | L3 | English first; Vietnamese canonical content |
| Accessibility | L1-L2 | L3 | Keyboard, contrast, labels, reduced motion |

## 4. Evidence from the current repository
### Itinerary
- A* generation exists in src/lib/astar.ts.
- Validation/optimization exists in src/lib/itinerary-validator.ts.
- Adaptation exists in src/lib/trip-adapter.ts.
- Trip APIs cover adapt, add-place, customize, optimize, suggestions, validate and save-itinerary.
- FeasibilityAssistant provides preview/apply/cancel behavior.

### Travel context
- Weather API and trip weather banner exist.
- Place data already includes opening hours, indoor, weather dependency, walking/accessibility and pacing metadata.
- Home recommendations already react to time/weather.

### AI / Live Guide
- src/lib/ai.ts supports AI calls and trip chat.
- /api/chat exists.
- Admin AI trainer exists for chatbot/live/object data.
- TTS exists.
- /api/vision exists, but production recognition is not complete.

### Data operations
- Place CRUD/import/export/duplicate checks exist.
- Admin data collector, data tasks and data-quality APIs exist.
- Audit logging exists.
- Publication and verification are intentionally separate states.

### 3D
- Playable Ngọ Môn exists under src/components/3d.
- Current assets: ngo-mon.glb, ngo-mon-game.glb, ngo-mon-preview.glb, ngo-mon-collision.glb.
- Current experience has movement, collision, POIs, audio and three narration tracks.
- It is not yet a full Đại Nội digital twin and has not been FPS-tested on physical phones.

### Production foundation
- Structured logging, request IDs/security headers, health check, optional BullMQ/Redis and optional FastAPI AI boundary are already present.
- Architecture intentionally remains a modular monolith.

## 5. Core traveler problem map
### P0 — must solve before public production
| Problem | Solution | Acceptance |
|---|---|---|
| I do not know where to go | Contextual discovery + preferences | Useful choices in <30s for a first-time user |
| I only have 1-2 days | Feasible itinerary | No obvious impossible/closed/overloaded schedule |
| I do not know hours/prices | Verified place data | Source + freshness for critical fields |
| How do I get there? | Map + travel time | Mobile route works and recovers from failure |
| It rains / I am late | Adaptive itinerary | One-tap realistic alternative preview |
| What should I do next? | Travel context | Clear next-best action |
| I do not understand this place | AI Guide | Grounded explanation from verified knowledge |
| I have a problem | Emergency assistant | Trusted contacts/services + clear next steps |
| I lose connectivity | Essential cache | Current trip + essential info readable |

### P1 — differentiators
- Context-aware AI companion.
- Camera -> recognition -> Huế knowledge -> explanation.
- Weather-aware dynamic replanning.
- 3D Ngọ Môn connected to real-world places and stories.
- Personalized Huế by traveler type.
- Multilingual guided experience.

### P2 — ecosystem
- Tickets, reservations, partner services, payments, loyalty and partner dashboards.

## 6. Target architecture
NEXT.JS = UI + business API
SQLite today -> managed PostgreSQL when real multi-instance/scaling requirements justify it.
Redis + BullMQ = optional durable background jobs.
FastAPI = optional AI/ML boundary for RAG and vision.
Three.js/GLB = isolated 3D layer.
Do not migrate to NestJS, Kafka or microservices merely for technology fashion.

## 7. AI system design
1. Deterministic travel engine: constraints, travel time, opening hours, feasibility.
2. Context engine: location, time, weather, trip state, preferences.
3. RAG: Huế history/culture/place knowledge with provenance.
4. LLM: explanation, conversation, recommendations and proposals.
5. Vision: identify object/place/food, then retrieve knowledge.
6. TTS: spoken guide.
7. Evaluation: factuality, grounding, itinerary feasibility, latency and failure tests.

AI must never be the source of truth for operational facts such as opening hours, prices, event times, addresses and emergency numbers.

## 8. Data strategy
Current release evidence records only 14 published places, all currently in draft verification state. This is a P0 blocker for claiming broad real-world coverage.
Initial production target:
- 100+ priority places;
- 30+ verified food/drink places;
- major heritage sites;
- transport hubs;
- hospitals/police/emergency services;
- recurring events/festivals;
- essential tourist services.
Critical records should carry source, last checked, verification state, verified by, freshness policy, coordinates, hours, price, accessibility, indoor/outdoor and weather dependency.

## 9. Production gates
### Functional
- P0 traveler flows pass end-to-end.
- No critical feature silently fails.
- Emergency information is verified.
- Dynamic itinerary changes have preview + confirmation.
### Data
- Critical places are verified.
- Stale-data policy exists.
- No fabricated hours/prices/events.
### Security
- HTTPS; strong production secret; rate limiting; authorization tests; secrets outside Git; secure headers; backup/restore drill.
### Reliability
- Health check; structured logs/request IDs; monitoring; backup/restore; graceful AI/third-party failure; timeouts/retries.
### Performance
- Mobile 4G test; core page measurements; trip latency; 3D FPS on representative phones; load test with production-sized data.
### UX
- First-time user test; Vietnamese clarity; permission denial recovery; poor-network behavior; complete loading/error/success states.

## 10. Development sequence
### Phase 0 — Blueprint + baseline
Lock product scope, keep architecture, record maturity, define production gates.
### Phase 1 — Production Core (P0)
1. Expand/verify place corpus.
2. Strengthen profile/preferences.
3. Harden search/map/place detail.
4. Finish emergency assistant.
5. Finish essential offline/poor-network cache.
6. Add notification foundation.
7. Complete public deployment verification.
### Phase 2 — Contextual Companion (P0/P1)
1. Unified travel-context service.
2. Next-best-action engine.
3. Weather-aware replanning.
4. Opening-hours/closure-aware replanning.
5. Trip-state-aware AI chat.
6. Grounded source display.
### Phase 3 — Huế Knowledge + AI Guide (P1)
1. Curated corpus. 2. RAG retrieval. 3. Provenance. 4. AI Guide. 5. TTS caching. 6. Evaluation suite.
### Phase 4 — Vision (P1)
1. Define 20-30 classes. 2. Collect/label. 3. Benchmark. 4. FastAPI inference. 5. Vision -> RAG -> explanation. 6. Confidence/fallback.
### Phase 5 — 3D Experience (P1)
1. Optimize Ngọ Môn. 2. Preserve important interior geometry. 3. Expand POIs/stories. 4. Connect 3D to real places. 5. Device FPS gate.
### Phase 6 — Ecosystem (P2)
Only after core usage proves demand: booking, tickets, partners, payments, loyalty, partner dashboard.

## 11. What NOT to do now
- Do not rewrite Next.js into NestJS.
- Do not split into microservices.
- Do not add Kafka.
- Do not add a vector DB before corpus + retrieval evaluation.
- Do not ship YOLO without a labeled Huế dataset.
- Do not build payments/booking from scratch without a real partner flow.
- Do not expand 3D at the expense of verified travel data.
- Do not claim production readiness from local build success alone.

## 12. Definition of HueViVu winning
A traveler can say: “Tôi đến Huế 2 ngày, 2 người, ngân sách 2 triệu/người, thích lịch sử và đồ ăn, không muốn đi quá nhiều.”
HueViVu must understand the request, create a feasible plan, explain it, navigate, explain what the traveler sees, react to weather/time/fatigue/closure, suggest food/services in context, help with problems, preserve the journey, and do it with trustworthy data.
That is the product target — not having the most technologies.

## 13. Implementation maturity audit — 08/10/2026

See [Production Maturity Audit](PRODUCTION_MATURITY_AUDIT.md) for evidence-backed levels of implemented tracker items, gaps and the next coding packages. Tracker checkboxes record implementation milestones; they do not independently certify L3 readiness.

Current database after test cleanup: 15 published places (1 verified, 6 reviewed, 8 draft), plus 3 draft/reviewed places. These are stored verification states, not a new independent content verification. The section 8 count remains the historical release baseline.

First completed improvements: read-only offline trip reader with account separation and visible recovery; strict travel-state input validation. Local production/browser evidence is recorded in the audit. The broader offline, trusted-data and public deployment gates remain open.


## 14. Context-to-action local implementation — 08/10/2026

See [Phase Context Implementation](PHASE_CONTEXT_IMPLEMENTATION.md) for verified local behavior, tests and remaining production gaps. Existing context/replanning/trip-state code now uses the Huế clock, confirmed trip dates, daily progress, real indoor metadata, explicit preview/confirmation and visible failure recovery. The full next-best-action, trusted-data and public deployment gates remain open.
