Project Brief: Obsidian RAG AI Extension

Overview

A clean, modern, and minimalist Retrieval-Augmented Generation (RAG) chat interface designed specifically for querying personal Obsidian vaults. The application prioritizes a distraction-free environment, high-contrast readability, and subtle motion to indicate system states.

Design Philosophy





Atmospheric Depth: A "black-on-black" layering approach using deep greys and blacks to create a focused digital workspace.



Precision: Razor-sharp alignment and purposeful whitespace that mirrors the organization of a well-maintained vault.



Subtle Motion: Using shadows and minimalist animations (like pulsing dots) instead of heavy UI elements to communicate background processes.

Core Features & Requirements

1. Layout & Navigation





Sidebar (Left): 





Vault Management: Includes a dropdown selector for switching between active vaults (e.g., "Personal Brain", "Work Notes").



Re-indexing: A dedicated "Re-index Vault" button with an active loading spinner state for RAG processing feedback.



History: A scrollable list of recent chat session titles.



Top Navigation: Simplified "Focus" and "Index" tabs for alternating between active chat and vault overview.



Main Chat Area: Centralized flow for Markdown-rendered assistant responses with clear source citations (e.g., file chips for referenced notes).

2. Interaction Design





The "Obsidian" Input Bar:





Color: Mid-to-light grey (bg-zinc-700) with light text for clear contrast.



The Shadow Effect: A smooth, continuously rotating pure black shadow (shadow-black) that provides dynamic depth without color gradients.



Model Selector: Integrated minimalist dropdown for switching between GPT-4o, Claude 3.5 Sonnet, and Local Llama models.



Thinking State: A minimalist three-dot pulsing animation within the message stream to indicate the AI is processing a retrieval query.

Visual Specifications





Theme: Dark Mode (Primary background: bg-zinc-950 / bg-neutral-900).



Typography: Clean, sans-serif high-contrast font (Geist/Inter).



Radius: Softened corners (ROUND_EIGHT) for components like the chat bar and buttons.



Elevation: Flat UI logic, using tonal shifts and animated shadows rather than traditional z-index elevations.

MVP Scope (Completed)





High-fidelity dark mode chat interface.



Animated rotating shadow for the input bar.



Vault selector and re-indexing state implementation.



AI "Thinking" state visualization.



Streamlined navigation (Removed Graph, Archive, Settings for launch focus).
