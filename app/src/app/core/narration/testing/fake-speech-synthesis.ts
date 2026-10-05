/** Doppi di test per la Web Speech API, assente in jsdom. */
export class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly text: string) {}
}

export class FakeSpeechSynthesis {
  private voices: SpeechSynthesisVoice[] = [];
  private readonly listeners = new Set<() => void>();

  readonly speak = jest.fn<void, [FakeUtterance]>();
  readonly cancel = jest.fn<void, []>();
  readonly getVoices = jest.fn(() => this.voices);
  readonly addEventListener = jest.fn((_type: string, listener: () => void) => {
    this.listeners.add(listener);
  });
  readonly removeEventListener = jest.fn((_type: string, listener: () => void) => {
    this.listeners.delete(listener);
  });

  constructor(initialVoices: SpeechSynthesisVoice[] = []) {
    this.voices = initialVoices;
  }

  /** Simula il caricamento asincrono delle voci (Chrome). */
  loadVoices(voices: SpeechSynthesisVoice[]): void {
    this.voices = voices;
    this.listeners.forEach((listener) => listener());
  }

  lastUtterance(): FakeUtterance {
    const calls = this.speak.mock.calls;
    return calls[calls.length - 1][0];
  }

  asSpeechSynthesis(): SpeechSynthesis {
    return this as unknown as SpeechSynthesis;
  }
}

export function fakeVoice(lang: string, name = lang): SpeechSynthesisVoice {
  return { lang, name, voiceURI: `urn:${name}`, default: false, localService: true };
}

export function installFakeUtterance(): void {
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    value: FakeUtterance,
    configurable: true,
    writable: true,
  });
}
