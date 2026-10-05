import { TestBed } from '@angular/core/testing';

import { SpeechPreferencesStore } from './speech-preferences.store';
import { SPEECH_SYNTHESIS, SpeechSynthesisService } from './speech-synthesis.service';
import { FakeSpeechSynthesis, fakeVoice, installFakeUtterance } from './testing/fake-speech-synthesis';

describe('SpeechSynthesisService', () => {
  let synth: FakeSpeechSynthesis;

  beforeAll(() => installFakeUtterance());

  beforeEach(() => {
    localStorage.clear();
    synth = new FakeSpeechSynthesis();
  });

  function setup(fake: FakeSpeechSynthesis | null = synth): SpeechSynthesisService {
    TestBed.configureTestingModule({
      providers: [{ provide: SPEECH_SYNTHESIS, useValue: fake?.asSpeechSynthesis() ?? null }],
    });
    return TestBed.inject(SpeechSynthesisService);
  }

  describe('voice selection', () => {
    it('waits for voiceschanged before selecting the it-IT voice', () => {
      const service = setup();

      expect(service.voice()).toBeNull();
      service.speak('Ciao');
      expect(synth.lastUtterance().voice).toBeNull();
      expect(synth.lastUtterance().lang).toBe('it-IT');

      const italian = fakeVoice('it-IT', 'Alice');
      synth.loadVoices([fakeVoice('en-US'), italian]);

      expect(service.voice()).toBe(italian);
      service.speak('Ciao');
      expect(synth.lastUtterance().voice).toBe(italian);
    });

    it('uses voices that are already loaded without waiting for the event', () => {
      const italian = fakeVoice('it-IT');
      const service = setup(new FakeSpeechSynthesis([fakeVoice('en-GB'), italian]));

      expect(service.voice()).toBe(italian);
    });

    it('accepts other Italian variants and underscore lang tags', () => {
      const service = setup();
      const italian = fakeVoice('it_CH');
      synth.loadVoices([fakeVoice('fr-FR'), italian]);

      expect(service.voice()).toBe(italian);
    });

    it('falls back to the first available voice when there is no Italian voice', () => {
      const service = setup();
      const first = fakeVoice('en-US');
      synth.loadVoices([first, fakeVoice('de-DE')]);

      expect(service.voice()).toBe(first);
      service.speak('Hello');
      expect(synth.lastUtterance().lang).toBe('en-US');
    });

    it('prefers the voice chosen in the preferences store', () => {
      const service = setup();
      const chosen = fakeVoice('it-IT', 'Luca');
      synth.loadVoices([fakeVoice('it-IT', 'Alice'), chosen]);

      TestBed.inject(SpeechPreferencesStore).setVoiceUri(chosen.voiceURI);

      expect(service.voice()).toBe(chosen);
    });

    it('stops listening for voiceschanged when destroyed', () => {
      setup();
      const listener = synth.addEventListener.mock.calls[0][1];

      TestBed.resetTestingModule();

      expect(synth.removeEventListener).toHaveBeenCalledWith('voiceschanged', listener);
    });
  });

  describe('speak()', () => {
    it('cancels the current sentence before every new one', () => {
      const service = setup();

      service.speak('Prima frase');
      service.speak('Seconda frase');

      expect(synth.cancel).toHaveBeenCalledTimes(2);
      expect(synth.speak).toHaveBeenCalledTimes(2);
      expect(synth.cancel.mock.invocationCallOrder[1]).toBeLessThan(
        synth.speak.mock.invocationCallOrder[1],
      );
      expect(synth.lastUtterance().text).toBe('Seconda frase');
    });

    it('applies the rate from the preferences store', () => {
      const service = setup();
      TestBed.inject(SpeechPreferencesStore).setRate(1.2);

      service.speak('Ciao');

      expect(synth.lastUtterance().rate).toBe(1.2);
    });

    it('ignores empty text without interrupting the current sentence', () => {
      const service = setup();

      service.speak('   ');

      expect(synth.cancel).not.toHaveBeenCalled();
      expect(synth.speak).not.toHaveBeenCalled();
    });
  });

  describe('speaking signal', () => {
    it('is true while the sentence plays and false when it ends', () => {
      const service = setup();

      service.speak('Ciao');
      expect(service.speaking()).toBe(true);

      synth.lastUtterance().onend?.();
      expect(service.speaking()).toBe(false);
    });

    it('turns false on error', () => {
      const service = setup();

      service.speak('Ciao');
      synth.lastUtterance().onerror?.();

      expect(service.speaking()).toBe(false);
    });

    it('ignores the late end event of a cancelled sentence', () => {
      const service = setup();

      service.speak('Prima');
      const cancelled = synth.lastUtterance();
      service.speak('Seconda');
      cancelled.onend?.();

      expect(service.speaking()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('cancels speech and resets speaking', () => {
      const service = setup();
      service.speak('Ciao');
      synth.cancel.mockClear();

      service.stop();

      expect(synth.cancel).toHaveBeenCalledTimes(1);
      expect(service.speaking()).toBe(false);
    });
  });

  describe('without the Web Speech API', () => {
    it('reports unsupported and does nothing', () => {
      const service = setup(null);

      expect(service.supported).toBe(false);
      expect(() => service.speak('Ciao')).not.toThrow();
      expect(() => service.stop()).not.toThrow();
      expect(service.speaking()).toBe(false);
    });
  });
});
