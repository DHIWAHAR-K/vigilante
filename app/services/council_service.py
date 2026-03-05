import asyncio
import time
import logging
from typing import AsyncGenerator, List, Dict, Any, Callable, Optional
import httpx

from app.config import settings
from app.services.llm_provider import get_provider, LLMProvider

log = logging.getLogger(__name__)


class CouncilService:
    def __init__(self):
        self.ollama_url = settings.OLLAMA_BASE_URL
        self.agents = settings.AGENTS
        self._st_model = None  # Lazy-loaded sentence-transformers model
        self._providers: Dict[str, LLMProvider] = {}  # provider_name -> instance

    def _get_provider(self, agent: dict) -> LLMProvider:
        """Return (and cache) the LLMProvider for a given agent config."""
        provider_name = agent.get("provider", "ollama").lower()
        if provider_name not in self._providers:
            self._providers[provider_name] = get_provider(provider_name, settings)
        return self._providers[provider_name]

    async def query_agent(
        self,
        agent: dict,
        question: str,
        context: str = ""
    ) -> Dict[str, Any]:
        """Query a single agent and return its response."""
        start_time = time.time()

        messages = [
            {"role": "system", "content": agent["system_prompt"]},
        ]

        if context:
            messages.append({"role": "user", "content": f"Context from other council members:\n{context}\n\nQuestion: {question}"})
        else:
            messages.append({"role": "user", "content": question})

        try:
            provider = self._get_provider(agent)
            log.info(f"Querying agent {agent['name']} via {agent.get('provider', 'ollama')} model {agent['model']}")
            content = await provider.complete(messages, agent["model"])
            if not content:
                log.warning(f"Agent {agent['name']} returned empty response")
                content = f"[Agent {agent['name']} returned empty response]"
            else:
                log.info(f"Agent {agent['name']} responded with {len(content)} characters")
        except Exception as e:
            log.error(f"Error querying agent {agent['name']}: {type(e).__name__}: {e}")
            content = f"[Agent {agent['name']} unavailable: {str(e)}]"

        response_time = int((time.time() - start_time) * 1000)

        return {
            "agent_name": agent["name"],
            "agent_model": agent["model"],
            "response": content,
            "response_time_ms": response_time,
            "success": not content.startswith("[Agent")
        }

    async def stream_agent(
        self,
        agent: dict,
        question: str,
        context: str = "",
        conversation_history: str = "",
        on_token: Callable[[str], None] = None
    ) -> AsyncGenerator[str, None]:
        """Stream response from a single agent via its configured LLM provider."""
        system_content = agent["system_prompt"]
        if conversation_history:
            system_content = f"{agent['system_prompt']}\n\n{conversation_history}"

        messages = [{"role": "system", "content": system_content}]
        if context:
            messages.append({"role": "user", "content": f"Context from other council members:\n{context}\n\nQuestion: {question}"})
        else:
            messages.append({"role": "user", "content": question})

        provider = self._get_provider(agent)
        provider_name = agent.get("provider", "ollama")
        log.info(f"Streaming agent {agent['name']} via {provider_name} model {agent['model']}")

        async for token in provider.stream_completion(messages, agent["model"], on_token=on_token):
            yield token

    async def run_debate(
        self,
        question: str,
        on_agent_start: Callable[[str], None] = None,
        on_agent_token: Callable[[str, str], None] = None,
        on_agent_complete: Callable[[str, str], None] = None
    ) -> List[Dict[str, Any]]:
        """Run the full debate process with all agents."""
        # Get all agents except synthesizer
        debate_agents = [a for a in self.agents if a["id"] != "synthesizer"]
        synthesizer = next((a for a in self.agents if a["id"] == "synthesizer"), None)

        responses = []

        # Run first 4 agents in parallel
        tasks = []
        for agent in debate_agents:
            if on_agent_start:
                on_agent_start(agent["name"])
            tasks.append(self.query_agent(agent, question))

        results = await asyncio.gather(*tasks)
        responses.extend(results)

        # Notify completion for each agent
        for result in results:
            if on_agent_complete:
                on_agent_complete(result["agent_name"], result["response"])

        # Run synthesizer with context from all other responses
        if synthesizer:
            context = "\n\n".join([
                f"{r['agent_name']}: {r['response']}"
                for r in responses
            ])

            if on_agent_start:
                on_agent_start(synthesizer["name"])

            synth_response = await self.query_agent(synthesizer, question, context)
            responses.append(synth_response)

            if on_agent_complete:
                on_agent_complete(synth_response["agent_name"], synth_response["response"])

        return responses

    async def run_debate_streaming(
        self,
        question: str,
        send_message: Callable[[dict], Any],
        conversation_history: str = "",
        rounds: int = 1,
        selected_agents: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Run debate with streaming responses via WebSocket.

        Args:
            question: The user's question
            send_message: Callback to send Socket.IO messages
            conversation_history: Formatted conversation history for context
            rounds: Number of debate rounds (1-3)
            selected_agents: List of agent IDs to include (None = all debate agents)
        """
        log.info(f"Starting Council debate for question: {question[:100]}...")
        log.info(f"Ollama URL: {self.ollama_url}, rounds={rounds}")
        if conversation_history:
            log.info(f"Conversation history provided: {len(conversation_history)} chars")

        all_debate_agents = [a for a in self.agents if a["id"] != "synthesizer"]
        synthesizer = next((a for a in self.agents if a["id"] == "synthesizer"), None)

        # Apply agent selection filter
        if selected_agents is not None:
            active_debate_agents = [a for a in all_debate_agents if a["id"] in selected_agents]
        else:
            active_debate_agents = all_debate_agents

        log.info(f"Debate agents: {[a['name'] for a in active_debate_agents]}, rounds={rounds}")
        log.info(f"Synthesizer: {synthesizer['name'] if synthesizer else 'None'}")

        all_responses: List[Dict[str, Any]] = []
        current_question = question

        for round_num in range(1, rounds + 1):
            # Emit round_start for all rounds (client only shows it visually if rounds > 1)
            await send_message({
                "type": "round_start",
                "round": round_num,
                "total_rounds": rounds,
                "follow_up": current_question if round_num > 1 else ""
            })

            round_responses: List[Dict[str, Any]] = []

            # Stream each agent's response sequentially for better UX
            for agent in active_debate_agents:
                await send_message({
                    "type": "agent_start",
                    "agent_name": agent["name"],
                    "agent_model": agent["model"],
                    "agent_color": agent["color"],
                    "agent_role": agent["role"]
                })

                full_response = ""
                start_time = time.time()

                async for token in self.stream_agent(agent, current_question, conversation_history=conversation_history):
                    full_response += token
                    await send_message({
                        "type": "agent_token",
                        "agent_name": agent["name"],
                        "token": token
                    })

                response_time = int((time.time() - start_time) * 1000)

                await send_message({
                    "type": "agent_complete",
                    "agent_name": agent["name"],
                    "response": full_response,
                    "response_time_ms": response_time
                })

                round_responses.append({
                    "agent_name": agent["name"],
                    "agent_model": agent["model"],
                    "response": full_response,
                    "response_time_ms": response_time
                })

            all_responses.extend(round_responses)

            # Generate follow-up question for next round (if not the last round)
            if round_num < rounds:
                current_question = await self._generate_follow_up(
                    question, round_responses, conversation_history
                )
                log.info(f"Round {round_num} follow-up: {current_question[:100]}")

        # Run synthesizer with ALL round responses as context
        if synthesizer:
            context = "\n\n".join([
                f"{r['agent_name']}: {r['response']}"
                for r in all_responses
            ])

            await send_message({
                "type": "agent_start",
                "agent_name": synthesizer["name"],
                "agent_model": synthesizer["model"],
                "agent_color": synthesizer["color"],
                "agent_role": synthesizer["role"]
            })

            full_response = ""
            start_time = time.time()

            async for token in self.stream_agent(synthesizer, question, context, conversation_history=conversation_history):
                full_response += token
                await send_message({
                    "type": "agent_token",
                    "agent_name": synthesizer["name"],
                    "token": token
                })

            response_time = int((time.time() - start_time) * 1000)

            await send_message({
                "type": "agent_complete",
                "agent_name": synthesizer["name"],
                "response": full_response,
                "response_time_ms": response_time
            })

            all_responses.append({
                "agent_name": synthesizer["name"],
                "agent_model": synthesizer["model"],
                "response": full_response,
                "response_time_ms": response_time
            })

        # Send debate complete message
        synthesis = next(
            (r["response"] for r in all_responses if r["agent_name"] == "Synthesizer"),
            None
        )

        consensus = self._calculate_consensus(all_responses)

        log.info(f"Council debate complete. Synthesis: {len(synthesis) if synthesis else 0} chars, consensus={consensus}")
        if not synthesis:
            log.warning("No synthesis generated - all agents may have failed")
            for r in all_responses:
                log.warning(f"  {r['agent_name']}: {len(r.get('response', ''))} chars - {r.get('response', '')[:100]}...")

        await send_message({
            "type": "debate_complete",
            "responses": all_responses,
            "synthesis": synthesis,
            "consensus": consensus
        })

        return all_responses

    async def _generate_follow_up(
        self,
        original_question: str,
        round_responses: List[Dict[str, Any]],
        conversation_history: str = ""
    ) -> str:
        """Generate a focused follow-up question for the next debate round."""
        synthesizer = next((a for a in self.agents if a["id"] == "synthesizer"), None)
        if not synthesizer:
            return f"Dive deeper into: {original_question}"

        context = "\n\n".join([
            f"{r['agent_name']}: {r['response'][:300]}"
            for r in round_responses
        ])
        follow_up_prompt = (
            f"Original question: {original_question}\n\n"
            f"Round responses:\n{context}\n\n"
            "Based on the debate so far, what ONE specific aspect needs deeper analysis? "
            "Respond with only the follow-up question, no preamble or explanation."
        )
        messages = [
            {"role": "system", "content": "You generate concise follow-up questions for debates."},
            {"role": "user", "content": follow_up_prompt}
        ]
        try:
            provider = self._get_provider(synthesizer)
            follow_up = await provider.complete(messages, synthesizer["model"])
            return follow_up.strip() or f"Elaborate on: {original_question}"
        except Exception as e:
            log.error(f"Error generating follow-up question: {e}")
            return f"Elaborate further on: {original_question}"

    def _calculate_consensus(self, responses: List[Dict[str, Any]]) -> int:
        """
        Calculate consensus score using semantic similarity (sentence-transformers).

        Computes pairwise cosine similarities between debate agent responses
        (excludes synthesizer), averages them, and maps to 0-100.
        Falls back to length-variance heuristic if the model cannot load.

        Returns:
            Consensus score (0-100)
        """
        # Filter to debate agents only (exclude synthesizer and failed responses)
        debate_responses = [
            r for r in responses
            if r.get("agent_name", "").lower() != "synthesizer"
            and not r.get("response", "").startswith("[Agent")
            and r.get("response", "").strip()
        ]

        if len(debate_responses) < 2:
            return 30  # Low consensus if too few agents responded

        texts = [r["response"] for r in debate_responses]

        try:
            from sentence_transformers import SentenceTransformer
            import numpy as np
            from itertools import combinations

            if self._st_model is None:
                log.info("Loading SentenceTransformer model for consensus scoring...")
                self._st_model = SentenceTransformer("all-MiniLM-L6-v2")

            embeddings = self._st_model.encode(texts, convert_to_numpy=True)

            sims = []
            for i, j in combinations(range(len(embeddings)), 2):
                a, b = embeddings[i], embeddings[j]
                norm = (np.linalg.norm(a) * np.linalg.norm(b))
                cos_sim = float(np.dot(a, b) / (norm + 1e-9))
                sims.append(cos_sim)

            avg_sim = sum(sims) / len(sims)  # range: [-1, 1]
            # Map [-1, 1] -> [0, 100]
            score = int(max(0, min(100, (avg_sim + 1) / 2 * 100)))
            log.info(f"Semantic consensus: avg_cosine={avg_sim:.3f} -> score={score}")
            return score

        except Exception as e:
            log.error(f"Semantic consensus failed, using fallback heuristic: {e}")
            # Fallback: length-variance heuristic
            response_lengths = [len(r.get("response", "")) for r in debate_responses]
            avg_length = sum(response_lengths) / len(response_lengths) or 1
            variance = sum((l - avg_length) ** 2 for l in response_lengths) / len(response_lengths)
            std_dev = variance ** 0.5
            return max(0, min(100, int(100 - (std_dev / avg_length) * 100)))


council_service = CouncilService()
