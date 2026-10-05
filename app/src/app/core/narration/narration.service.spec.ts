import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { Narrator } from '../contracts';
import { NarrationService, SENSITIVE_LIVE_REGION_MS } from './narration.service';
import { provideNarration } from './provide-narration';
import { SensitiveNarrator } from './sensitive-narrator';
import { SpeechPreferencesStore } from './speech-preferences.store';
import { SpeechSynthesisService } from './speech-synthesis.service';

describe('NarrationService', () => {
  let announcer: { announce: jest.Mock; clear: jest.Mock };
  let speech: { speak: jest.Mock; stop: jest.Mock };
  let prefs: SpeechPreferencesStore;
  let narrator: Narrator;

  beforeEach(() => {
    localStorage.clear();
    announcer = { announce: jest.fn().mockResolvedValue(undefined), clear: jest.fn() };
    speech = { speak: jest.fn(), stop: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideNarration(),
        { provide: LiveAnnouncer, useValue: announcer },
        { provide: SpeechSynthesisService, useValue: speech },
      ],
    });
    prefs = TestBed.inject(SpeechPreferencesStore);
    narrator = TestBed.inject(Narrator);
  });

  it('is the Narrator registered by provideNarration()', () => {
    expect(narrator).toBeInstanceOf(NarrationService);
    expect(narrator).toBe(TestBed.inject(NarrationService));
  });

  describe('screen reader mode', () => {
    it('announces through aria-live, polite by default, with the voice off', () => {
      narrator.say('Passo 1 di 3: Nome');

      expect(announcer.announce).toHaveBeenCalledWith('Passo 1 di 3: Nome', 'polite');
      expect(speech.stop).toHaveBeenCalled();
      expect(speech.speak).not.toHaveBeenCalled();
    });

    it('passes assertive politeness for errors', () => {
      narrator.say('Errore nel campo Nome: il nome è vuoto.', 'assertive');

      expect(announcer.announce).toHaveBeenCalledWith(
        'Errore nel campo Nome: il nome è vuoto.',
        'assertive',
      );
    });
  });

  describe('voice mode', () => {
    beforeEach(() => prefs.setMode('voice'));

    it('speaks through speech synthesis and keeps live regions empty', () => {
      narrator.say('Passo 1 di 3: Nome', 'assertive');

      expect(speech.speak).toHaveBeenCalledWith('Passo 1 di 3: Nome');
      expect(announcer.clear).toHaveBeenCalled();
      expect(announcer.announce).not.toHaveBeenCalled();
    });
  });

  it('ignores empty text', () => {
    narrator.say('  ');

    expect(announcer.announce).not.toHaveBeenCalled();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('stop() silences both channels', () => {
    narrator.stop();

    expect(speech.stop).toHaveBeenCalled();
    expect(announcer.clear).toHaveBeenCalled();
  });

  describe('saySensitive()', () => {
    let sensitive: SensitiveNarrator;

    beforeEach(() => (sensitive = TestBed.inject(SensitiveNarrator)));

    it('is registered by provideNarration() on the same service', () => {
      expect(sensitive).toBe(TestBed.inject(NarrationService));
    });

    it('in screen reader mode clears the live region after a short time', () => {
      sensitive.saySensitive('La password è: G maiuscola, i.');

      expect(announcer.announce).toHaveBeenCalledWith(
        'La password è: G maiuscola, i.',
        'polite',
        SENSITIVE_LIVE_REGION_MS,
      );
    });

    it('in voice mode speaks with the live regions empty', () => {
      prefs.setMode('voice');
      sensitive.saySensitive('La password è: G maiuscola, i.');

      expect(speech.speak).toHaveBeenCalledWith('La password è: G maiuscola, i.');
      expect(announcer.announce).not.toHaveBeenCalled();
    });

    it('is not kept for repeatLast(), nor is the text said before it', () => {
      narrator.say('Passo 3 di 3: Password');
      sensitive.saySensitive('La password è: G maiuscola, i.');
      announcer.announce.mockClear();

      narrator.repeatLast();

      expect(announcer.announce).not.toHaveBeenCalled();
    });
  });

  describe('repeatLast()', () => {
    it('does nothing before anything was said', () => {
      narrator.repeatLast();

      expect(announcer.announce).not.toHaveBeenCalled();
      expect(speech.speak).not.toHaveBeenCalled();
    });

    it('repeats the last text with its politeness', () => {
      narrator.say('Primo');
      narrator.say('Errore', 'assertive');
      announcer.announce.mockClear();

      narrator.repeatLast();

      expect(announcer.announce).toHaveBeenCalledTimes(1);
      expect(announcer.announce).toHaveBeenCalledWith('Errore', 'assertive');
    });

    it('uses the channel of the current mode', () => {
      narrator.say('Ciao');
      prefs.setMode('voice');

      narrator.repeatLast();

      expect(speech.speak).toHaveBeenCalledWith('Ciao');
    });
  });
});
