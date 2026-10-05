import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeechPreferencesStore } from '../speech-preferences.store';
import { VoiceSettingsComponent } from './voice-settings.component';

describe('VoiceSettingsComponent', () => {
  let fixture: ComponentFixture<VoiceSettingsComponent>;
  let host: HTMLElement;
  let prefs: SpeechPreferencesStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [VoiceSettingsComponent] });
    prefs = TestBed.inject(SpeechPreferencesStore);
    fixture = TestBed.createComponent(VoiceSettingsComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function radio(label: string): HTMLInputElement {
    const match = Array.from(host.querySelectorAll('label')).find(
      (el) => el.textContent?.trim() === label,
    );
    if (!match) {
      throw new Error(`No label "${label}"`);
    }
    return host.querySelector<HTMLInputElement>(`#${match.htmlFor}`)!;
  }

  function choose(label: string): void {
    const input = radio(label);
    input.click();
    fixture.detectChanges();
  }

  function legends(): string[] {
    return Array.from(host.querySelectorAll('fieldset > legend')).map((el) => el.textContent!.trim());
  }

  it('groups the modes in a fieldset with a legend and a described radio per mode', () => {
    expect(legends()).toEqual(['Modalità di lettura']);

    const sr = radio('Screen reader');
    const voice = radio('Voce integrata');
    expect(sr.type).toBe('radio');
    expect(sr.name).toBe(voice.name);
    expect(sr.checked).toBe(true);
    expect(host.querySelector(`#${sr.getAttribute('aria-describedby')}`)?.textContent).toContain(
      'screen reader',
    );
  });

  it('updates the store when the mode changes and shows the speed fieldset', () => {
    choose('Voce integrata');

    expect(prefs.mode()).toBe('voice');
    expect(legends()).toEqual(['Modalità di lettura', 'Velocità della voce']);
    expect(radio('Normale').checked).toBe(true);
  });

  it('updates the store when the speed changes', () => {
    choose('Voce integrata');
    choose('Lenta');

    expect(prefs.rate()).toBe(0.8);
    expect(radio('Lenta').checked).toBe(true);
  });

  it('reflects preferences changed elsewhere', () => {
    prefs.setMode('voice');
    prefs.setRate(1.15);
    fixture.detectChanges();

    expect(radio('Voce integrata').checked).toBe(true);
    expect(radio('Veloce').checked).toBe(true);
  });

  it('gives each instance unique ids', () => {
    const other = TestBed.createComponent(VoiceSettingsComponent);
    other.detectChanges();
    const otherInput = (other.nativeElement as HTMLElement).querySelector('input')!;

    expect(otherInput.id).not.toBe(radio('Screen reader').id);
    expect(otherInput.name).not.toBe(radio('Screen reader').name);
  });
});
