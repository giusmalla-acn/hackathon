import { TestBed } from '@angular/core/testing';

import { A11Y_PREFS_STORAGE_KEY, SpeechPreferencesStore } from './speech-preferences.store';

describe('SpeechPreferencesStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  function store(): SpeechPreferencesStore {
    return TestBed.inject(SpeechPreferencesStore);
  }

  function saved(): unknown {
    const raw = localStorage.getItem(A11Y_PREFS_STORAGE_KEY);
    return raw === null ? null : JSON.parse(raw);
  }

  it('defaults to screen reader mode, normal rate and no voice', () => {
    const prefs = store();

    expect(prefs.mode()).toBe('sr');
    expect(prefs.rate()).toBe(1);
    expect(prefs.voiceUri()).toBeNull();
  });

  it('persists only mode and rate under "a11y-prefs"', () => {
    const prefs = store();

    prefs.setMode('voice');
    prefs.setRate(0.8);
    prefs.setVoiceUri('urn:Alice');

    expect(saved()).toEqual({ mode: 'voice', rate: 0.8 });
    expect(localStorage.length).toBe(1);
  });

  it('restores mode and rate from localStorage', () => {
    localStorage.setItem(A11Y_PREFS_STORAGE_KEY, JSON.stringify({ mode: 'voice', rate: 1.2 }));

    const prefs = store();

    expect(prefs.mode()).toBe('voice');
    expect(prefs.rate()).toBe(1.2);
  });

  it('ignores unknown keys and invalid values in localStorage', () => {
    localStorage.setItem(
      A11Y_PREFS_STORAGE_KEY,
      JSON.stringify({ mode: 'loud', rate: 'fast', email: 'anna@esempio.it' }),
    );

    const prefs = store();
    prefs.setRate(1);

    expect(prefs.mode()).toBe('sr');
    expect(saved()).toEqual({ mode: 'sr', rate: 1 });
  });

  it('ignores malformed JSON', () => {
    localStorage.setItem(A11Y_PREFS_STORAGE_KEY, '{not json');

    expect(store().mode()).toBe('sr');
  });

  it('clamps the rate between 0.8 and 1.2', () => {
    const prefs = store();

    prefs.setRate(3);
    expect(prefs.rate()).toBe(1.2);

    prefs.setRate(0.1);
    expect(prefs.rate()).toBe(0.8);

    prefs.setRate(Number.NaN);
    expect(prefs.rate()).toBe(1);
  });

  it('clamps a stored rate that is out of range', () => {
    localStorage.setItem(A11Y_PREFS_STORAGE_KEY, JSON.stringify({ mode: 'sr', rate: 9 }));

    expect(store().rate()).toBe(1.2);
  });

  it('keeps working in memory when localStorage refuses writes', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const prefs = store();

    expect(() => prefs.setMode('voice')).not.toThrow();
    expect(prefs.mode()).toBe('voice');
  });
});
