/**
 * @fileoverview Control real time music with a MIDI controller
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { PlaybackState, Prompt } from './types';
import { GoogleGenAI, LiveMusicFilteredPrompt } from '@google/genai';
import { PromptDjMidi } from './components/PromptDjMidi';
import { ToastMessage } from './components/ToastMessage';
import { LiveMusicHelper } from './utils/LiveMusicHelper';
import { AudioAnalyser } from './utils/AudioAnalyser';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, apiVersion: 'v1alpha' });
const model = 'lyria-realtime-exp';

function main() {
  const initialPrompts = buildInitialPrompts();

  const pdjMidi = new PromptDjMidi(initialPrompts);
  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  document.body.appendChild(pdjMidi as unknown as HTMLElement);

  const toastMessage = new ToastMessage();
  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  document.body.appendChild(toastMessage as unknown as HTMLElement);

  const liveMusicHelper = new LiveMusicHelper(ai, model);
  liveMusicHelper.setWeightedPrompts(initialPrompts);

  const audioAnalyser = new AudioAnalyser(liveMusicHelper.audioContext);
  liveMusicHelper.extraDestination = audioAnalyser.node;

  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  (pdjMidi as unknown as HTMLElement).addEventListener('prompts-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<Map<string, Prompt>>;
    const prompts = customEvent.detail;
    liveMusicHelper.setWeightedPrompts(prompts);
  }));

  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  (pdjMidi as unknown as HTMLElement).addEventListener('play-pause', () => {
    liveMusicHelper.playPause();
  });

  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  (pdjMidi as unknown as HTMLElement).addEventListener('record-toggle', () => {
    liveMusicHelper.toggleRecording();
  });

  liveMusicHelper.addEventListener('playback-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<PlaybackState>;
    const playbackState = customEvent.detail;
    pdjMidi.playbackState = playbackState;
    playbackState === 'playing' ? audioAnalyser.start() : audioAnalyser.stop();
  }));

  liveMusicHelper.addEventListener('recording-state-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<boolean>;
    pdjMidi.isRecording = customEvent.detail;
  }));

  liveMusicHelper.addEventListener('filtered-prompt', ((e: Event) => {
    const customEvent = e as CustomEvent<LiveMusicFilteredPrompt>;
    const filteredPrompt = customEvent.detail;
    toastMessage.show(filteredPrompt.filteredReason!)
    pdjMidi.addFilteredPrompt(filteredPrompt.text!);
  }));

  const errorToast = ((e: Event) => {
    const customEvent = e as CustomEvent<string>;
    const error = customEvent.detail;
    toastMessage.show(error);
  });

  liveMusicHelper.addEventListener('error', errorToast);
  // FIX: Cast to unknown first to satisfy TypeScript's type overlap requirement for custom elements.
  (pdjMidi as unknown as HTMLElement).addEventListener('error', errorToast);

  audioAnalyser.addEventListener('audio-level-changed', ((e: Event) => {
    const customEvent = e as CustomEvent<number>;
    const level = customEvent.detail;
    pdjMidi.audioLevel = level;
  }));

}

function buildInitialPrompts() {
  // Pick 3 random prompts to start at weight = 1
  const startOn = [...DEFAULT_PROMPTS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const prompts = new Map<string, Prompt>();

  for (let i = 0; i < DEFAULT_PROMPTS.length; i++) {
    const promptId = `prompt-${i}`;
    const prompt = DEFAULT_PROMPTS[i];
    const { text, color } = prompt;
    prompts.set(promptId, {
      promptId,
      text,
      weight: startOn.includes(prompt) ? 1 : 0,
      cc: i,
      color,
    });
  }

  return prompts;
}

const DEFAULT_PROMPTS = [
  { color: '#9900ff', text: 'Bossa Nova at 60 bpm' },
  { color: '#5200ff', text: 'Chillwave at 60 bpm' },
  { color: '#ff25f6', text: 'Drum and Bass at 60 bpm' },
  { color: '#2af6de', text: 'Post Punk at 60 bpm' },
  { color: '#FFA500', text: 'Afrobeat rhythm at 60 bpm' },
  { color: '#2af6de', text: 'Funk at 60 bpm' },
  { color: '#9900ff', text: 'Chiptune at 60 bpm' },
  { color: '#3dffab', text: 'Lush Strings at 60 bpm' },
  { color: '#d8ff3e', text: 'Sparkling Arpeggios at 60 bpm' },
  { color: '#d9b2ff', text: 'Staccato Rhythms at 60 bpm' },
  { color: '#3dffab', text: 'Punchy Kick at 60 bpm' },
  { color: '#ffdd28', text: 'Dubstep at 60 bpm' },
  { color: '#A0522D', text: 'Balafon at 60 bpm' },
  { color: '#d8ff3e', text: 'Neo Soul at 60 bpm' },
  { color: '#E2725B', text: 'Kora rhythm at 60 bpm' },
  { color: '#ff6600', text: 'Mbalakh rhythm at 60 bpm' },
];

main();