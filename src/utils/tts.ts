/**
 * TTS Service — Text-to-Speech using the Web Speech API.
 * Prefers Microsoft Edge neural voices when available.
 */

let preferredVoice: SpeechSynthesisVoice | null = null
let voicesLoaded = false

function loadVoices() {
  if (voicesLoaded) return
  const voices = speechSynthesis.getVoices()
  if (voices.length === 0) return

  // Prefer Edge neural voices, then any English voice
  preferredVoice =
    voices.find((v) => v.name.includes('Microsoft') && v.name.includes('Online') && v.lang.startsWith('en')) ??
    voices.find((v) => v.name.includes('Microsoft') && v.lang.startsWith('en')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]

  voicesLoaded = true
  console.log(`[TTS] Using voice: ${preferredVoice.name} (${preferredVoice.lang})`)
}

// Voices load async in some browsers
if (typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = loadVoices
  loadVoices()
}

/**
 * Speak text aloud using the browser's TTS engine.
 * Returns a promise that resolves when speech ends.
 */
export function speak(text: string, rate = 1.05): Promise<void> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve()
      return
    }

    // Cancel any in-progress speech
    speechSynthesis.cancel()
    loadVoices()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = rate
    utterance.pitch = 1.0
    utterance.volume = 1.0
    if (preferredVoice) utterance.voice = preferredVoice

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    speechSynthesis.speak(utterance)
  })
}

/**
 * Stop any in-progress speech.
 */
export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.cancel()
  }
}

/**
 * Check if TTS is currently speaking.
 */
export function isSpeaking(): boolean {
  return typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking
}
